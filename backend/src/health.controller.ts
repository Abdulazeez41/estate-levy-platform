import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      name: 'Estate Levy Platform API',
      status: 'ok',
      health: '/api/health',
      docs: '/api/docs',
    };
  }

  @Get('health')
  status() {
    return { status: 'ok' };
  }
}
