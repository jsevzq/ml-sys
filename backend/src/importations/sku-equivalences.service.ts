import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { SkuEquivalence } from '../items/entities/sku-equivalence.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockAllocationService } from './stock-allocation.service';
import {
  CreateSkuEquivalenceDto,
  SkuEquivalenceDto,
} from './dto/sku-equivalence.dto';

/**
 * Vive en el módulo de importaciones y no en el de items porque su razón de ser
 * es la atribución: cada alta o baja rehace el reparto de ventas a lotes.
 */
@Injectable()
export class SkuEquivalencesService {
  constructor(
    @InjectRepository(SkuEquivalence)
    private readonly repository: Repository<SkuEquivalence>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  async findAll(mlUserId: string): Promise<SkuEquivalenceDto[]> {
    const equivalences = await this.repository.find({
      where: { mlUser: { id: mlUserId } },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      equivalences.map(async (equivalencia) => ({
        id: equivalencia.id,
        fromItemId: equivalencia.fromItemId,
        fromVariationId: equivalencia.fromVariationId,
        toItemId: equivalencia.toItemId,
        toVariationId: equivalencia.toVariationId,
        reason: equivalencia.reason,
        createdAt: equivalencia.createdAt.toISOString(),
        affectedSales: await this.orderItemRepository.countBy({
          order: { mlUser: { id: mlUserId } },
          mlItemId: equivalencia.fromItemId,
          mlVariationId: equivalencia.fromVariationId ?? IsNull(),
        }),
      })),
    );
  }

  async create(
    mlUserId: string,
    dto: CreateSkuEquivalenceDto,
  ): Promise<SkuEquivalenceDto[]> {
    try {
      await this.repository.save(
        this.repository.create({
          mlUser: { id: mlUserId },
          fromItemId: dto.fromItemId,
          fromVariationId: dto.fromVariationId ?? null,
          toItemId: dto.toItemId,
          toVariationId: dto.toVariationId ?? null,
          reason: dto.reason ?? null,
        }),
      );
    } catch (error) {
      // `driverError` viene sin tipar; 23505 es la violación de unicidad de Postgres.
      const codigo =
        error instanceof QueryFailedError
          ? (error.driverError as { code?: string } | undefined)?.code
          : undefined;
      if (codigo === '23505') {
        throw new ConflictException(
          'Ese SKU ya tiene una equivalencia cargada.',
        );
      }
      throw error;
    }

    await this.stockAllocation.recalculate(mlUserId);
    return this.findAll(mlUserId);
  }

  async remove(mlUserId: string, id: number): Promise<void> {
    const equivalencia = await this.repository.findOneBy({
      id,
      mlUser: { id: mlUserId },
    });
    if (!equivalencia) {
      throw new NotFoundException(`No existe la equivalencia ${id}.`);
    }
    await this.repository.remove(equivalencia);
    await this.stockAllocation.recalculate(mlUserId);
  }
}
