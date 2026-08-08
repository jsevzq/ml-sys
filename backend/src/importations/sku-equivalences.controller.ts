import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { SkuEquivalencesService } from './sku-equivalences.service';
import {
  CreateSkuEquivalenceDto,
  SkuEquivalenceDto,
} from './dto/sku-equivalence.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('sku-equivalences')
export class SkuEquivalencesController {
  constructor(private readonly service: SkuEquivalencesService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: SkuEquivalenceDto, isArray: true })
  @Get()
  async findAll(@Req() req: MlRequest): Promise<SkuEquivalenceDto[]> {
    return this.service.findAll(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: SkuEquivalenceDto, isArray: true })
  @ApiConflictResponse()
  @Post()
  async create(
    @Req() req: MlRequest,
    @Body() dto: CreateSkuEquivalenceDto,
  ): Promise<SkuEquivalenceDto[]> {
    return this.service.create(req.mlAccount.id, dto);
  }

  @ApiBearerAuth()
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Req() req: MlRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(req.mlAccount.id, id);
  }
}
