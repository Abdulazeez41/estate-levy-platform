import { JwtService } from '@nestjs/jwt';
import { OtpChannel, Role } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService passwordless OTP', () => {
  const user = {
    id: 'resident-1',
    fullName: 'Ada Resident',
    email: 'ada@example.com',
    phone: '08012345678',
    role: Role.RESIDENT,
    isActive: true,
    loginHouseNumber: 'Block A, Flat 2',
  };

  it('issues a six-digit development code and consumes it once', async () => {
    let createdChallenge: any;
    const prisma: any = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
      otpChallenge: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => { createdChallenge = data; return Promise.resolve(data); }),
        findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...createdChallenge, attempts: 0, maxAttempts: 5, consumedAt: null, invalidatedAt: null, user })),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      refreshSession: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (operations) => Promise.all(operations)),
    };
    const jwt: Partial<JwtService> = { signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token') };
    const channels: any = { deliver: jest.fn().mockResolvedValue({ delivered: false }) };
    const service = new AuthService(prisma, jwt as JwtService, {} as any, channels);
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const challenge = await service.requestOtp({ houseNumber: user.loginHouseNumber }, '127.0.0.1');
    expect(createdChallenge.channel).toBe(OtpChannel.WHATSAPP);
    expect(challenge.debugCode).toMatch(/^\d{6}$/);
    expect(createdChallenge.codeHash).not.toContain(challenge.debugCode);
    expect(channels.deliver).not.toHaveBeenCalled();

    const result = await service.verifyOtp({ challengeId: challenge.challengeId, code: challenge.debugCode as string });
    expect(result.user).toEqual(expect.objectContaining({ id: user.id, houseNumber: user.loginHouseNumber }));
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ consumedAt: expect.any(Date) }) }));
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('limits verification requests per household', async () => {
    const prisma: any = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
      otpChallenge: { count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(0) },
    };
    const service = new AuthService(prisma, {} as any, {} as any, {} as any);
    await expect(service.requestOtp({ houseNumber: user.loginHouseNumber }, '127.0.0.1')).rejects.toMatchObject({ status: 429 });
  });
});
