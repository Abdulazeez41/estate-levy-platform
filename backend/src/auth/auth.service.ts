import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationType, OtpChannel } from '@prisma/client';
import { randomBytes, createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChannelAdaptersService } from '../notifications/channel-adapters.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly channelAdapters: ChannelAdaptersService,
  ) {}

  private async signTokens(payload: { sub: string; email: string; role: 'CHAIRMAN' | 'RESIDENT'; houseNumber?: string | null; authTime: number }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_TTL ?? `${Number(process.env.TRUSTED_DEVICE_DAYS ?? 30)}d`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshSession(userId: string, refreshToken: string) {
    const ttlMs = Number(process.env.TRUSTED_DEVICE_DAYS ?? 30) * 24 * 60 * 60 * 1000;
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
  }

  private hashRefreshToken(refreshToken: string) {
    return `sha256:${createHash('sha256').update(refreshToken).digest('hex')}`;
  }

  private verifyRefreshToken(refreshToken: string, storedHash: string) {
    if (storedHash.startsWith('sha256:')) return Promise.resolve(this.hashRefreshToken(refreshToken) === storedHash);
    // Existing bcrypt sessions remain valid until they expire.
    return bcrypt.compare(refreshToken, storedHash);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || !user.passwordHash || process.env.PASSWORD_LOGIN_ENABLED !== 'true') throw new UnauthorizedException('Password login is disabled. Request a verification code instead.');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role, houseNumber: user.loginHouseNumber, authTime: Math.floor(Date.now() / 1000) };
    const { accessToken, refreshToken } = await this.signTokens(payload);

    await Promise.all([
      this.persistRefreshSession(user.id, refreshToken),
      this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id } }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  async searchHouses(query: string) {
    const value = query.trim();
    if (value.length < 2) return [];
    const users = await this.prisma.user.findMany({
      where: { isActive: true, loginHouseNumber: { contains: value, mode: 'insensitive' } },
      select: { loginHouseNumber: true },
      orderBy: { loginHouseNumber: 'asc' },
      take: 10,
    });
    return users.flatMap((user) => (user.loginHouseNumber ? [{ houseNumber: user.loginHouseNumber }] : []));
  }

  async requestOtp(dto: RequestOtpDto, requestedIp?: string) {
    const user = await this.prisma.user.findFirst({
      where: { isActive: true, loginHouseNumber: { equals: dto.houseNumber.trim(), mode: 'insensitive' } },
    });
    if (!user) return { challengeId: randomUUID(), destinationMasked: 'your registered WhatsApp number', expiresInSeconds: 300 };
    if (!user.phone) throw new BadRequestException('No WhatsApp number is registered for this house. Please contact the chairman.');

    const hourAgo = new Date(Date.now() - 3600000);
    const [userRequests, ipRequests] = await Promise.all([
      this.prisma.otpChallenge.count({ where: { userId: user.id, createdAt: { gte: hourAgo } } }),
      requestedIp ? this.prisma.otpChallenge.count({ where: { requestedIp, createdAt: { gte: hourAgo } } }) : Promise.resolve(0),
    ]);
    if (userRequests >= 5 || ipRequests >= 20) throw new HttpException('Too many verification requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);

    const channel = OtpChannel.WHATSAPP;
    const destinationMasked = this.maskPhone(user.phone);
    const challengeId = randomUUID();
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.otpChallenge.updateMany({ where: { userId: user.id, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } }),
      this.prisma.otpChallenge.create({
        data: { id: challengeId, userId: user.id, channel, codeHash: this.hashOtp(challengeId, code), destinationMasked, expiresAt, requestedIp },
      }),
      this.prisma.auditLog.create({ data: { userId: user.id, action: 'OTP_REQUESTED', entity: 'OtpChallenge', entityId: challengeId, newValue: { channel, destinationMasked } } }),
    ]);

    const development = process.env.NODE_ENV !== 'production';
    let delivery: { delivered: boolean } = { delivered: false };
    const shouldDeliver = !development || process.env.OTP_DELIVERY_IN_DEVELOPMENT === 'true';
    if (shouldDeliver) {
      try {
        delivery = await this.channelAdapters.deliver('whatsapp', {
          recipientName: user.fullName,
          email: user.email,
          phone: user.phone,
          title: 'Greenview Estate login code',
          message: `${code} is your Greenview Estate verification code. It expires in 5 minutes and can only be used once.`,
          metadata: { purpose: 'login', challengeId },
        });
      } catch {
        // Local and test environments display the short-lived code instead.
        if (!development) {
          await this.prisma.otpChallenge.update({ where: { id: challengeId }, data: { invalidatedAt: new Date() } });
          throw new ServiceUnavailableException('Verification delivery is temporarily unavailable. Please contact the estate administrator.');
        }
      }
    }
    if (!delivery.delivered && !development) {
      await this.prisma.otpChallenge.update({ where: { id: challengeId }, data: { invalidatedAt: new Date() } });
      throw new ServiceUnavailableException('Verification delivery is temporarily unavailable. Please contact the estate administrator.');
    }
    return { challengeId, destinationMasked, channel, expiresInSeconds: 300, debugCode: development ? code : undefined };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: dto.challengeId }, include: { user: true } });
    if (!challenge || !challenge.user.isActive || challenge.consumedAt || challenge.invalidatedAt || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException('The verification code is invalid or expired. Request a new code.');
    }
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const received = Buffer.from(this.hashOtp(challenge.id, dto.code), 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      const attempts = challenge.attempts + 1;
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts, invalidatedAt: attempts >= challenge.maxAttempts ? new Date() : undefined } });
      throw new BadRequestException('The verification code is invalid or expired. Request a new code.');
    }

    const authTime = Math.floor(Date.now() / 1000);
    const payload = { sub: challenge.user.id, email: challenge.user.email, role: challenge.user.role, houseNumber: challenge.user.loginHouseNumber, authTime };
    const tokens = await this.signTokens(payload);
    await this.prisma.$transaction([
      this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { userId: challenge.user.id, action: 'OTP_LOGIN', entity: 'User', entityId: challenge.user.id } }),
    ]);
    await this.persistRefreshSession(challenge.user.id, tokens.refreshToken);
    return {
      ...tokens,
      user: { id: challenge.user.id, fullName: challenge.user.fullName, email: challenge.user.email, role: challenge.user.role, houseNumber: challenge.user.loginHouseNumber },
    };
  }

  private hashOtp(challengeId: string, code: string) {
    const secret = process.env.OTP_SECRET || process.env.JWT_ACCESS_SECRET || 'development-only-otp-secret';
    return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 1)}${'*'.repeat(Math.max(3, local.length - 1))}@${domain}`;
  }

  private maskPhone(phone: string) {
    return `${'*'.repeat(Math.max(4, phone.length - 4))}${phone.slice(-4)}`;
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; role: 'CHAIRMAN' | 'RESIDENT'; houseNumber?: string | null; authTime?: number }>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const tokenHash = this.hashRefreshToken(refreshToken);
    const directSession = await this.prisma.refreshSession.findFirst({
      where: { userId: payload.sub, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const legacySessions = directSession
      ? []
      : await this.prisma.refreshSession.findMany({
          where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, tokenHash: { not: { startsWith: 'sha256:' } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
    const legacyMatches = await Promise.all(legacySessions.map((session) => this.verifyRefreshToken(refreshToken, session.tokenHash)));
    if (!directSession && !legacyMatches.some(Boolean)) throw new UnauthorizedException('Refresh session is invalid');

    await this.prisma.refreshSession.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.signTokens({ ...payload, authTime: payload.authTime ?? Math.floor(Date.now() / 1000) });
    await this.persistRefreshSession(payload.sub, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const direct = await this.prisma.refreshSession.updateMany({
        where: { tokenHash: this.hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (!direct.count) {
        const legacySessions = await this.prisma.refreshSession.findMany({
          where: { revokedAt: null, tokenHash: { not: { startsWith: 'sha256:' } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
        for (const session of legacySessions) {
          if (await this.verifyRefreshToken(refreshToken, session.tokenHash)) {
            await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
            break;
          }
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
