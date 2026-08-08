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
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdditionalCostTypesService } from './additional-cost-types.service';
import {
  AdditionalCostTypeDto,
  CreateAdditionalCostTypeDto,
} from './dto/additional-cost-type.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('cost-types')
export class AdditionalCostTypesController {
  constructor(private readonly service: AdditionalCostTypesService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdditionalCostTypeDto, isArray: true })
  @Get()
  async findAll(@Req() req: MlRequest): Promise<AdditionalCostTypeDto[]> {
    return this.service.findAll(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdditionalCostTypeDto })
  @ApiConflictResponse({ description: 'Ya existe un tipo con ese nombre' })
  @Post()
  async create(
    @Body() dto: CreateAdditionalCostTypeDto,
    @Req() req: MlRequest,
  ): Promise<AdditionalCostTypeDto> {
    return this.service.create(dto, req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: AdditionalCostTypeDto })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAdditionalCostTypeDto,
    @Req() req: MlRequest,
  ): Promise<AdditionalCostTypeDto> {
    return this.service.update(id, dto, req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Tipo de costo eliminado' })
  @ApiConflictResponse({ description: 'El tipo está usado en una importación' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MlRequest,
  ): Promise<void> {
    return this.service.remove(id, req.mlAccount.id);
  }
}
