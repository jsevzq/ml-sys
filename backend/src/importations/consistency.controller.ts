import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ConsistencyService } from './consistency.service';
import { ConsistencyReportDto } from './dto/consistency.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('consistency')
export class ConsistencyController {
  constructor(private readonly service: ConsistencyService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: ConsistencyReportDto })
  @Get()
  async detect(@Req() req: MlRequest): Promise<ConsistencyReportDto> {
    return this.service.detect(req.mlAccount.id);
  }
}
