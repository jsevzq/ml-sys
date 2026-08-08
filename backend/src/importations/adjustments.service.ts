import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { ImportationProduct } from './entities/importation-product.entity';
import { Adjustment, AdjustmentKind } from './entities/adjustment.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockAllocationService } from './stock-allocation.service';
import {
  CreateAdjustmentDto,
  UpdateAdjustmentDto,
} from './dto/create-adjustment.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { variantLabel } from '../items/lib/variant-label';

const RELACIONES = {
  importationProduct: {
    importation: true,
    item: true,
    // Sin las opciones, dos variantes de la misma publicación se leen igual:
    // "Pendrive 64 GB → Pendrive 64 GB" no dice nada.
    variation: { item: true, attributeOptions: { attribute: true } },
  },
  orderItem: { order: true },
  targetItem: true,
  targetVariation: { item: true, attributeOptions: { attribute: true } },
} as const;

@Injectable()
export class AdjustmentsService {
  constructor(
    @InjectRepository(Adjustment)
    private readonly repository: Repository<Adjustment>,
    @InjectRepository(ImportationProduct)
    private readonly productRepository: Repository<ImportationProduct>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly stockAllocation: StockAllocationService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(mlUserId: string): Promise<AdjustmentDto[]> {
    const adjustments = await this.repository.find({
      where: { mlUser: { id: mlUserId } },
      relations: RELACIONES,
      order: { createdAt: 'DESC' },
    });
    return adjustments.map((adjustment) => toView(adjustment));
  }

  async create(
    mlUserId: string,
    dto: CreateAdjustmentDto,
  ): Promise<AdjustmentDto> {
    const line = await this.lotLine(mlUserId, dto);
    const sale = await this.saleLine(mlUserId, dto);

    if (dto.type === AdjustmentKind.SWAP) {
      if (!sale) throw new BadRequestException('Un swap necesita una venta.');
      if (dto.quantity > sale.quantity) {
        throw new BadRequestException(
          `La venta es de ${sale.quantity} unidades: no se pueden despachar ${dto.quantity}.`,
        );
      }
    } else {
      if (!line) {
        throw new BadRequestException(
          'Una destrucción o una mutación se cargan sobre una línea de un lote.',
        );
      }
      await this.validateBalance(line, dto.quantity);
    }

    if (dto.type !== AdjustmentKind.DESTRUCTION && !dto.targetItemId) {
      throw new BadRequestException(
        'Falta el producto de destino: en qué se convirtió o qué se despachó.',
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const adjustment = await manager.save(
        manager.create(Adjustment, {
          mlUser: { id: mlUserId },
          type: dto.type,
          reason: dto.reason,
          quantity: dto.quantity,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null,
          importationProduct: line,
          orderItem: sale,
          targetItem: dto.targetItemId ? { id: dto.targetItemId } : null,
          targetVariation: dto.targetVariationId
            ? { id: dto.targetVariationId }
            : null,
        }),
      );

      // La mutación no mueve la línea original: le agrega al lote una línea
      // aparte con el producto que realmente llegó. Copia precio y tipo de
      // cambio del origen para que se vea de dónde salió, pero el costeo la
      // excluye del reparto y le da el costo unitario del origen.
      if (dto.type === AdjustmentKind.MUTATION && line) {
        await manager.save(
          manager.create(ImportationProduct, {
            importation: { id: line.importation.id },
            item: dto.targetVariationId ? null : { id: dto.targetItemId! },
            variation: dto.targetVariationId
              ? { id: dto.targetVariationId }
              : null,
            quantity: dto.quantity,
            price: line.price,
            currency: line.currency,
            exchangeToUYURate: line.exchangeToUYURate,
            generatedBy: { id: adjustment.id },
          }),
        );
      }

      return adjustment;
    });

    await this.stockAllocation.recalculate(mlUserId);
    return this.findOne(mlUserId, saved.id);
  }

  /**
   * Editar no cambia el origen: una subsanación sigue perteneciendo a la misma
   * línea o a la misma venta. Cambiar eso es borrarla y hacer otra.
   */
  async update(
    mlUserId: string,
    id: number,
    dto: UpdateAdjustmentDto,
  ): Promise<AdjustmentDto> {
    const adjustment = await this.repository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: { importationProduct: { importation: true }, orderItem: true },
    });
    if (!adjustment) {
      throw new NotFoundException(`No existe la subsanación ${id}.`);
    }

    if (adjustment.type === AdjustmentKind.SWAP) {
      if (dto.quantity > (adjustment.orderItem?.quantity ?? 0)) {
        throw new BadRequestException(
          `La venta es de ${adjustment.orderItem?.quantity} unidades: no se pueden despachar ${dto.quantity}.`,
        );
      }
    } else if (adjustment.importationProduct) {
      // Excluyéndose a sí misma: si no, editar sin cambiar la cantidad daría
      // "no se pueden subsanar más" contra su propio valor.
      await this.validateBalance(
        adjustment.importationProduct,
        dto.quantity,
        adjustment.id,
      );
    }

    if (adjustment.type !== AdjustmentKind.DESTRUCTION && !dto.targetItemId) {
      throw new BadRequestException(
        'Falta el producto de destino: en qué se convirtió o qué se despachó.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Adjustment, id, {
        reason: dto.reason,
        quantity: dto.quantity,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null,
        targetItem: dto.targetItemId ? { id: dto.targetItemId } : null,
        targetVariation: dto.targetVariationId
          ? { id: dto.targetVariationId }
          : null,
      });

      // La línea que generó una mutación es derivada de ella: se rehace con los
      // valores nuevos en vez de quedar con los viejos.
      if (adjustment.type === AdjustmentKind.MUTATION) {
        await manager.delete(ImportationProduct, { generatedBy: { id } });
        const source = adjustment.importationProduct!;
        await manager.save(
          manager.create(ImportationProduct, {
            importation: { id: source.importation.id },
            item: dto.targetVariationId ? null : { id: dto.targetItemId! },
            variation: dto.targetVariationId
              ? { id: dto.targetVariationId }
              : null,
            quantity: dto.quantity,
            price: source.price,
            currency: source.currency,
            exchangeToUYURate: source.exchangeToUYURate,
            generatedBy: { id },
          }),
        );
      }
    });

    await this.stockAllocation.recalculate(mlUserId);
    return this.findOne(mlUserId, id);
  }

  async findOne(mlUserId: string, id: number): Promise<AdjustmentDto> {
    const adjustment = await this.repository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: RELACIONES,
    });
    if (!adjustment) {
      throw new NotFoundException(`No existe la subsanación ${id}.`);
    }
    return toView(adjustment);
  }

  async remove(mlUserId: string, id: number): Promise<void> {
    const adjustment = await this.repository.findOne({
      where: { id, mlUser: { id: mlUserId } },
    });
    if (!adjustment) {
      throw new NotFoundException(`No existe la subsanación ${id}.`);
    }
    // La línea generada por una mutación cae con ella: la FK es ON DELETE CASCADE.
    await this.repository.remove(adjustment);
    await this.stockAllocation.recalculate(mlUserId);
  }

  private async lotLine(
    mlUserId: string,
    dto: CreateAdjustmentDto,
  ): Promise<ImportationProduct | null> {
    if (!dto.importationProductId) return null;

    const line = await this.productRepository.findOne({
      where: {
        id: dto.importationProductId,
        importation: { mlUser: { id: mlUserId } },
      },
      relations: { importation: true },
    });
    if (!line) {
      throw new NotFoundException(
        `La línea ${dto.importationProductId} no existe en tus importaciones.`,
      );
    }
    return line;
  }

  private async saleLine(
    mlUserId: string,
    dto: CreateAdjustmentDto,
  ): Promise<OrderItem | null> {
    if (!dto.orderItemId) return null;

    const sale = await this.orderItemRepository.findOne({
      where: { id: dto.orderItemId, order: { mlUser: { id: mlUserId } } },
      relations: { order: true },
    });
    if (!sale) {
      throw new NotFoundException(
        `La línea de venta ${dto.orderItemId} no existe en tus ventas.`,
      );
    }
    return sale;
  }

  /**
   * No se puede sacar de una línea más de lo que trajo. Que las ventas ya la
   * hayan agotado no invalida la subsanación —el motor desplaza esas ventas al
   * lote siguiente—, pero el total sí tiene un techo.
   */
  private async validateBalance(
    line: ImportationProduct,
    quantity: number,
    exceptoId?: number,
  ): Promise<void> {
    const otras = await this.repository.find({
      where: {
        importationProduct: { id: line.id },
        ...(exceptoId ? { id: Not(exceptoId) } : {}),
      },
      select: { id: true, quantity: true },
    });
    const alreadyAdjusted = otras.reduce(
      (total, adjustment) => total + adjustment.quantity,
      0,
    );

    if (alreadyAdjusted + quantity > line.quantity) {
      throw new BadRequestException(
        `La línea trajo ${line.quantity} unidades y ya tiene ${alreadyAdjusted} subsanadas: ` +
          `no se pueden subsanar ${quantity} más.`,
      );
    }
  }
}

function toView(adjustment: Adjustment): AdjustmentDto {
  const line = adjustment.importationProduct;
  const source = line?.variation ?? line?.item ?? null;

  return {
    id: adjustment.id,
    type: adjustment.type,
    reason: adjustment.reason,
    quantity: adjustment.quantity,
    occurredAt: adjustment.occurredAt?.toISOString() ?? null,
    createdAt: adjustment.createdAt.toISOString(),
    importationId: line?.importation?.id ?? null,
    importationProductId: line?.id ?? null,
    orderItemId: adjustment.orderItem?.id ?? null,
    orderId: adjustment.orderItem?.order?.id ?? null,
    sourceTitle: line?.item?.title ?? line?.variation?.item?.title ?? null,
    sourceVariantName: variantLabel(line?.variation?.attributeOptions),
    sourceSku: source ? String(source.id) : null,
    targetTitle:
      adjustment.targetVariation?.item?.title ??
      adjustment.targetItem?.title ??
      null,
    targetVariantName: variantLabel(
      adjustment.targetVariation?.attributeOptions,
    ),
    targetSku:
      adjustment.targetVariation?.id != null
        ? String(adjustment.targetVariation.id)
        : (adjustment.targetItem?.id ?? null),
  };
}
