import { Test } from '@nestjs/testing';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController cookie hardening', () => {
  it('sets refresh cookie on login', async () => {
    const authService = { login: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'u1', fullName: 'Chairman', email: 'chairman@test.com', role: 'CHAIRMAN' } }) };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    const controller = moduleRef.get(AuthController);
    const response = { cookie: jest.fn() } as any;
    await controller.login({ email: 'chairman@test.com', password: 'secret' } as any, response);
    expect(response.cookie).toHaveBeenCalledWith('estate_refresh_token', 'refresh', expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
  });
});
