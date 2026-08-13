import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class FreshOtpGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user as AuthenticatedRequestUser | undefined;
    const maxAgeSeconds = Number(process.env.CHAIRMAN_STEP_UP_TTL_SECONDS ?? 900);
    if (!user?.authTime || Math.floor(Date.now() / 1000) - user.authTime > maxAgeSeconds) {
      throw new ForbiddenException('A fresh verification code is required for this chairman action. Please sign in again.');
    }
    return true;
  }
}
