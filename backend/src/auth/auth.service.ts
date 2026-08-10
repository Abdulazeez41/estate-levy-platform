import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async signTokens(payload: { sub: string; email: string; role: 'CHAIRMAN' | 'RESIDENT' }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_TTL ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshSession(userId: string, refreshToken: string) {
    const ttlMs = 7 * 24 * 60 * 60 * 1000;
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken } = await this.signTokens(payload);

    await this.persistRefreshSession(user.id, refreshToken);
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; role: 'CHAIRMAN' | 'RESIDENT' }>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const valid = await Promise.all(sessions.map((session) => bcrypt.compare(refreshToken, session.tokenHash)));
    if (!valid.some(Boolean)) throw new UnauthorizedException('Refresh session is invalid');

    await this.prisma.refreshSession.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.signTokens(payload);
    await this.persistRefreshSession(payload.sub, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const sessions = await this.prisma.refreshSession.findMany({ where: { revokedAt: null } });
      for (const session of sessions) {
        const matches = await bcrypt.compare(refreshToken, session.tokenHash);
        if (matches) {
          await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
          break;
        }
      }
    }

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { success: true };

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const resetLink = `${process.env.APP_ORIGIN ?? 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    await this.notificationsService.dispatchToUser({
      recipientId: user.id,
      type: NotificationType.PASSWORD_RESET,
      title: 'Password reset requested',
      message: `We received a password reset request for your Greenview Estate account. Use the secure reset link: ${resetLink}`,
      channels: ['email', 'in_app'],
      metadata: { resetLink },
    });

    return { success: true, resetToken: process.env.NODE_ENV === 'production' ? undefined : rawToken };
  }

  async validateResetToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    return { valid: Boolean(record) };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Reset token is invalid or expired');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(dto.password, 12) } });
      await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      await tx.refreshSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: record.userId, action: 'PASSWORD_RESET', entity: 'User', entityId: record.userId } });
    });

    return { success: true };
  }
}
