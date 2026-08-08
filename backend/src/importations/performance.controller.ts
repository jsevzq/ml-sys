import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { PerformanceReportDto } from './dto/performance.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: PerformanceReportDto })
  @Get()
  async report(@Req() req: MlRequest): Promise<PerformanceReportDto> {
    return this.service.report(req.mlAccount.id);
  }
}
