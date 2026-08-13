import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedRequestUser {
  sub: string;
  email: string;
  role: 'CHAIRMAN' | 'RESIDENT';
  houseNumber?: string | null;
  authTime?: number;
}

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.user as AuthenticatedRequestUser;
});
