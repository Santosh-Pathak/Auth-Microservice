import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
@Public() // Health endpoints should be public
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe' })
  getReadiness() {
    return this.appService.getReadiness();
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  getLiveness() {
    return this.appService.getLiveness();
  }
}

