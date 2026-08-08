import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdjustmentsService } from './adjustments.service';
import {
  CreateAdjustmentDto,
  UpdateAdjustmentDto,
} from './dto/create-adjustment.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('adjustments')
export class AdjustmentsController {
  constructor(private readonly service: AdjustmentsService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdjustmentDto, isArray: true })
  @Get()
  async findAll(@Req() req: MlRequest): Promise<AdjustmentDto[]> {
    return this.service.findAll(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdjustmentDto })
  @Post()
  async create(
    @Req() req: MlRequest,
    @Body() dto: CreateAdjustmentDto,
  ): Promise<AdjustmentDto> {
    return this.service.create(req.mlAccount.id, dto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdjustmentDto })
  @ApiNotFoundResponse()
  @Get(':id')
  async findOne(
    @Req() req: MlRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdjustmentDto> {
    return this.service.findOne(req.mlAccount.id, id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdjustmentDto })
  @ApiNotFoundResponse()
  @Patch(':id')
  async update(
    @Req() req: MlRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdjustmentDto,
  ): Promise<AdjustmentDto> {
    return this.service.update(req.mlAccount.id, id, dto);
  }

  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Req() req: MlRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(req.mlAccount.id, id);
  }
}
