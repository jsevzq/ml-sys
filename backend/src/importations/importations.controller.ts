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
import { ImportationsService } from './importations.service';
import { StockAllocationService } from './stock-allocation.service';
import { CreateImportationDto } from './dto/create-importation.dto';
import { UpdateImportationDto } from './dto/update-importation.dto';
import { ImportationDto } from './dto/importation.dto';
import { AllocationSummaryDto } from './dto/allocation-summary.dto';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('importations')
export class ImportationsController {
  constructor(
    private readonly importationsService: ImportationsService,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: ImportationDto, isArray: true })
  @Get()
  async findAll(@Req() req: MlRequest): Promise<ImportationDto[]> {
    return this.importationsService.findAll(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ImportationDto })
  @Post()
  async create(
    @Body() dto: CreateImportationDto,
    @Req() req: MlRequest,
  ): Promise<ImportationDto> {
    return this.importationsService.create(dto, req.mlAccount.id);
  }

  /** Cómo quedó la atribución, sin recalcular nada. */
  @ApiBearerAuth()
  @ApiOkResponse({ type: AllocationSummaryDto })
  @Get('allocation')
  async allocation(@Req() req: MlRequest): Promise<AllocationSummaryDto> {
    return this.stockAllocation.summary(req.mlAccount.id);
  }

  /**
   * Rehace la atribución de ventas a lotes. Se corre sola después de sincronizar
   * ventas y de tocar una importación; esto es para forzarla a mano.
   */
  @ApiBearerAuth()
  @ApiOkResponse({ type: AllocationSummaryDto })
  @Post('recalculate')
  async recalculate(@Req() req: MlRequest): Promise<AllocationSummaryDto> {
    return this.stockAllocation.recalculate(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ImportationDto })
  @ApiNotFoundResponse({ description: 'La importación no existe' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MlRequest,
  ): Promise<ImportationDto> {
    return this.importationsService.findOne(id, req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ImportationDto })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImportationDto,
    @Req() req: MlRequest,
  ): Promise<ImportationDto> {
    return this.importationsService.update(id, dto, req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Importación eliminada' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MlRequest,
  ): Promise<void> {
    return this.importationsService.remove(id, req.mlAccount.id);
  }
}
