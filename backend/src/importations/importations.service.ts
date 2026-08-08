import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Importation } from './entities/importation.entity';
import { ImportationProduct } from './entities/importation-product.entity';
import {
  AdditionalCost,
  AdditionalCostKind,
} from './entities/additional-cost.entity';
import { AdditionalCostType } from './entities/additional-cost-type.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import {
  CreateAdditionalCostDto,
  CreateImportationDto,
  CreateImportationProductDto,
} from './dto/create-importation.dto';
import { UpdateImportationDto } from './dto/update-importation.dto';
import {
  AdditionalCostDto,
  ImportationDto,
  ImportationProductDto,
} from './dto/importation.dto';
import { StockAllocationService } from './stock-allocation.service';
import { calculateCosts } from './lib/landed-cost';
import { calculateExpectedValue, expectedUnitNet } from './lib/expected-value';
import { variantLabel } from '../items/lib/variant-label';

const RELATIONS = {
  products: {
    item: { pictures: true },
    // El título de una línea de variación cuelga de la publicación padre, y la
    // foto propia de la variante es lo que distingue un lote de otro de un vistazo.
    variation: {
      item: { pictures: true },
      pictures: true,
      attributeOptions: { attribute: true },
    },
    // Una línea generada por una mutación hereda el costo unitario de la línea
    // de la que salió, así que hay que poder llegar hasta ella.
    generatedBy: { importationProduct: true },
  },
  additionalCosts: { type: true },
} as const;

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const convertido = Number(value);
  return Number.isFinite(convertido) ? convertido : 0;
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Una línea apunta a un item o a una variación: una sola clave para las dos. */
const productKey = (
  itemId: string | null | undefined,
  variationId: string | null | undefined,
): string => (variationId ? `v:${variationId}` : `i:${itemId ?? ''}`);

@Injectable()
export class ImportationsService {
  constructor(
    @InjectRepository(Importation)
    private readonly importationRepository: Repository<Importation>,
    @InjectRepository(ImportationProduct)
    private readonly productRepository: Repository<ImportationProduct>,
    @InjectRepository(AdditionalCost)
    private readonly costRepository: Repository<AdditionalCost>,
    @InjectRepository(AdditionalCostType)
    private readonly costTypeRepository: Repository<AdditionalCostType>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Variation)
    private readonly variationRepository: Repository<Variation>,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  async create(
    dto: CreateImportationDto,
    mlUserId: string,
  ): Promise<ImportationDto> {
    await this.validateLines(dto.products, mlUserId);
    await this.validateCosts(dto.additionalCosts ?? [], mlUserId);

    const prices = await this.listPrices(dto.products);
    const lines = dto.products.map((line) => this.toLine(line, prices));
    const arrival = new Date(dto.arrivalDate);

    const importation = await this.importationRepository.save(
      this.importationRepository.create({
        mlUser: { id: mlUserId },
        orderDate: new Date(dto.orderDate),
        arrivalDate: arrival,
        products: lines,
        expectedNetUYU: calculateExpectedValue(lines, arrival).netUYU,
        additionalCosts: (dto.additionalCosts ?? []).map((cost) =>
          this.toCost(cost),
        ),
      }),
    );

    await this.stockAllocation.recalculate(mlUserId);
    return this.findOne(importation.id, mlUserId);
  }

  async findAll(mlUserId: string): Promise<ImportationDto[]> {
    const importations = await this.importationRepository.find({
      where: { mlUser: { id: mlUserId } },
      relations: RELATIONS,
      order: { arrivalDate: 'DESC', id: 'DESC' },
    });

    return importations.map((importation) => this.toView(importation));
  }

  async findOne(id: number, mlUserId: string): Promise<ImportationDto> {
    const importation = await this.importationRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: RELATIONS,
    });

    if (!importation) {
      throw new NotFoundException(`No existe la importación ${id}`);
    }

    return this.toView(importation);
  }

  /**
   * Reemplaza la importación entera. Si vienen `products` o `additionalCosts`, las
   * filas viejas se borran y se crean de nuevo: es lo que hace que corregir una
   * cantidad no deje atribuciones colgadas de un renglón que ya no existe.
   */
  async update(
    id: number,
    dto: UpdateImportationDto,
    mlUserId: string,
  ): Promise<ImportationDto> {
    const importation = await this.importationRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: { products: true, additionalCosts: true },
    });

    if (!importation) {
      throw new NotFoundException(`No existe la importación ${id}`);
    }

    if (dto.products) await this.validateLines(dto.products, mlUserId);
    if (dto.additionalCosts) {
      await this.validateCosts(dto.additionalCosts, mlUserId);
    }

    await this.importationRepository.manager.transaction(async (manager) => {
      if (dto.orderDate) importation.orderDate = new Date(dto.orderDate);
      if (dto.arrivalDate) importation.arrivalDate = new Date(dto.arrivalDate);

      if (dto.products) {
        await manager.delete(ImportationProduct, {
          importation: { id: importation.id },
        });
        // Reeditar el lote vuelve a sacar la foto de precios: las líneas son otras,
        // así que la expectativa vieja ya no corresponde a lo que hay cargado.
        const prices = await this.listPrices(dto.products);
        importation.products = dto.products.map((line) =>
          this.toLine(line, prices),
        );
        importation.expectedNetUYU = calculateExpectedValue(
          importation.products,
          importation.arrivalDate,
        ).netUYU;
      }

      if (dto.additionalCosts) {
        await manager.delete(AdditionalCost, {
          importation: { id: importation.id },
        });
        importation.additionalCosts = dto.additionalCosts.map((cost) =>
          this.toCost(cost),
        );
      }

      await manager.save(Importation, importation);
    });

    await this.stockAllocation.recalculate(mlUserId);
    return this.findOne(id, mlUserId);
  }

  async remove(id: number, mlUserId: string): Promise<void> {
    const importation = await this.importationRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
    });

    if (!importation) {
      throw new NotFoundException(`No existe la importación ${id}`);
    }

    await this.importationRepository.remove(importation);
    await this.stockAllocation.recalculate(mlUserId);
  }

  /** Arma la respuesta con el costo real: mercadería más los adicionales prorrateados. */
  private toView(importation: Importation): ImportationDto {
    const lines = importation.products ?? [];
    const costs = importation.additionalCosts ?? [];

    const calculation = calculateCosts(
      lines.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        price: line.price,
        exchangeToUYURate: line.exchangeToUYURate,
        generatedFromId: line.generatedBy?.importationProduct?.id ?? null,
      })),
      costs.map((cost) => ({
        id: cost.id,
        kind: cost.kind,
        amount: cost.amount,
        exchangeToUYURate: cost.exchangeToUYURate,
      })),
    );

    const products: ImportationProductDto[] = lines.map((line) => {
      const cost = calculation.byLine.get(line.id);
      const expectedPrice =
        line.expectedUnitPriceUYU === null
          ? null
          : toNumber(line.expectedUnitPriceUYU);

      return {
        expectedUnitPriceUYU: expectedPrice,
        expectedNetUYU:
          expectedPrice === null
            ? null
            : round(
                expectedUnitNet(expectedPrice, importation.arrivalDate) *
                  line.quantity,
              ),
        id: line.id,
        itemId: line.item?.id ?? null,
        variationId: line.variation?.id ?? null,
        title: line.item?.title ?? line.variation?.item?.title ?? null,
        variantName: variantLabel(line.variation?.attributeOptions),
        imageUrl:
          line.variation?.pictures?.[0]?.secureUrl ??
          line.item?.pictures?.[0]?.secureUrl ??
          line.variation?.item?.pictures?.[0]?.secureUrl ??
          null,
        quantity: line.quantity,
        quantitySold: line.quantitySold,
        quantityAdjusted: line.quantityAdjusted,
        quantityRemaining:
          line.quantity - line.quantitySold - line.quantityAdjusted,
        generatedByAdjustmentId: line.generatedBy?.id ?? null,
        price: toNumber(line.price),
        currency: line.currency,
        exchangeToUYURate: toNumber(line.exchangeToUYURate),
        merchandiseCostUYU: cost?.merchandiseUYU ?? 0,
        additionalCostUYU: cost?.additionalUYU ?? 0,
        totalCostUYU: cost?.totalUYU ?? 0,
        unitCostUYU: cost?.unitUYU ?? 0,
      };
    });

    const adicionales: AdditionalCostDto[] = costs.map((cost) => ({
      id: cost.id,
      typeId: cost.type.id,
      typeName: cost.type.name,
      kind: cost.kind,
      amount: toNumber(cost.amount),
      currency: cost.currency,
      exchangeToUYURate:
        cost.exchangeToUYURate === null
          ? null
          : toNumber(cost.exchangeToUYURate),
      paidAt: cost.paidAt,
      amountUYU: calculation.byCost.get(cost.id) ?? 0,
    }));

    // Una línea generada por una mutación no se compró: es una unidad de otra
    // línea que resultó ser otro producto. Contarla inflaría las unidades del lote
    // y el invertido con algo que nadie pagó.
    const purchasedLines = products.filter(
      (p) => p.generatedByAdjustmentId === null,
    );
    const expected = toNumber(importation.expectedNetUYU);
    const totalUnits = purchasedLines.reduce(
      (total, p) => total + p.quantity,
      0,
    );
    const soldUnits = products.reduce((total, p) => total + p.quantitySold, 0);
    const adjustedUnits = products.reduce(
      (total, p) => total + p.quantityAdjusted,
      0,
    );

    return {
      id: importation.id,
      orderDate: importation.orderDate,
      arrivalDate: importation.arrivalDate,
      products: products,
      additionalCosts: adicionales,
      totalUnits,
      soldUnits,
      adjustedUnits,
      soldPercentage:
        totalUnits > 0 ? round((soldUnits / totalUnits) * 100) : 0,
      merchandiseUYU: calculation.merchandiseUYU,
      additionalUYU: calculation.additionalUYU,
      investedUYU: calculation.totalUYU,
      expectedNetUYU: expected,
      // La ganancia se deriva y no se guarda: el neto esperado quedó congelado el
      // día de la carga, pero el invertido puede cambiar si después se corrige un
      // costo adicional, y la resta tiene que seguir cerrando.
      expectedProfitUYU: round(expected - calculation.totalUYU),
      expectedRoi:
        calculation.totalUYU > 0
          ? round(
              ((expected - calculation.totalUYU) / calculation.totalUYU) * 100,
            )
          : 0,
    };
  }

  private toLine(
    line: CreateImportationProductDto,
    prices: Map<string, number>,
  ): ImportationProduct {
    return this.productRepository.create({
      quantity: line.quantity,
      price: line.price,
      currency: line.currency.toUpperCase(),
      exchangeToUYURate: line.exchangeToUYURate,
      expectedUnitPriceUYU:
        prices.get(productKey(line.itemId, line.variationId)) ?? null,
      item: line.itemId ? { id: line.itemId } : null,
      variation: line.variationId ? { id: line.variationId } : null,
    });
  }

  /**
   * Precio de lista de cada producto de la importación, para congelarlo en la línea.
   *
   * Una variación tiene precio propio y manda sobre el de la publicación. Los
   * productos que no estén en el catálogo quedan afuera del mapa y la línea se
   * guarda sin precio: es preferible a suponer uno.
   */
  private async listPrices(
    lines: CreateImportationProductDto[],
  ): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    const itemIds = [
      ...new Set(lines.map((l) => l.itemId).filter((id): id is string => !!id)),
    ];
    const variationIds = [
      ...new Set(
        lines.map((l) => l.variationId).filter((id): id is string => !!id),
      ),
    ];

    if (itemIds.length) {
      const items = await this.itemRepository.find({
        where: { id: In(itemIds) },
        select: { id: true, price: true },
      });
      for (const item of items) {
        const price = toNumber(item.price);
        if (price > 0) prices.set(productKey(item.id, null), price);
      }
    }

    if (variationIds.length) {
      const variaciones = await this.variationRepository.find({
        where: { id: In(variationIds) },
        select: { id: true, price: true },
      });
      for (const variation of variaciones) {
        const price = toNumber(variation.price);
        if (price > 0) {
          prices.set(productKey(null, variation.id), price);
        }
      }
    }

    return prices;
  }

  private toCost(cost: CreateAdditionalCostDto): AdditionalCost {
    const isPercentage = cost.kind === AdditionalCostKind.PERCENTAGE;

    return this.costRepository.create({
      type: { id: cost.typeId } as AdditionalCostType,
      kind: cost.kind,
      amount: cost.amount,
      // Un porcentaje no tiene moneda: se aplica sobre la mercadería ya convertida.
      currency: isPercentage ? null : (cost.currency?.toUpperCase() ?? 'UYU'),
      exchangeToUYURate: isPercentage ? null : (cost.exchangeToUYURate ?? 1),
      paidAt: cost.paidAt ? new Date(cost.paidAt) : null,
    });
  }

  private async validateCosts(
    costs: CreateAdditionalCostDto[],
    mlUserId: string,
  ): Promise<void> {
    if (costs.length === 0) return;

    const kindIds = [...new Set(costs.map((cost) => cost.typeId))];
    const found = await this.costTypeRepository.find({
      where: { id: In(kindIds), mlUser: { id: mlUserId } },
      select: { id: true },
    });

    const faltan = kindIds.filter(
      (id) => !found.some((kind) => kind.id === id),
    );
    if (faltan.length) {
      throw new BadRequestException(
        `Estos tipos de costo no existen en el catálogo: ${faltan.join(', ')}`,
      );
    }

    costs.forEach((cost, index) => {
      if (
        cost.kind === AdditionalCostKind.PERCENTAGE &&
        (cost.amount < 0 || cost.amount > 100)
      ) {
        throw new BadRequestException(
          `El costo ${index + 1} es porcentual: ${cost.amount} no es un porcentaje válido`,
        );
      }
    });
  }

  /**
   * Cada línea apunta a un item o a una variación del catálogo de esta cuenta, nunca
   * a las dos ni a ninguna. La base tiene el CHECK, pero acá el error explica qué pasó.
   */
  private async validateLines(
    lines: CreateImportationProductDto[],
    mlUserId: string,
  ): Promise<void> {
    lines.forEach((line, index) => {
      const referencias = [line.itemId, line.variationId].filter(Boolean);
      if (referencias.length !== 1) {
        throw new BadRequestException(
          `La línea ${index + 1} tiene que apuntar a una publicación o a una variación, no a las dos ni a ninguna`,
        );
      }
    });

    const itemIds = [
      ...new Set(lines.map((l) => l.itemId).filter((id): id is string => !!id)),
    ];
    const variationIds = [
      ...new Set(
        lines.map((l) => l.variationId).filter((id): id is string => !!id),
      ),
    ];

    if (itemIds.length) {
      const found = await this.itemRepository.find({
        where: { id: In(itemIds), mlUser: { id: mlUserId } },
        select: { id: true },
      });
      const faltan = itemIds.filter(
        (id) => !found.some((item) => item.id === id),
      );
      if (faltan.length) {
        throw new BadRequestException(
          `Estas publicaciones no están en el catálogo: ${faltan.join(', ')}. Sincronice con Mercado Libre antes de cargarlas.`,
        );
      }
    }

    if (variationIds.length) {
      const found = await this.variationRepository.find({
        where: { id: In(variationIds), item: { mlUser: { id: mlUserId } } },
        select: { id: true },
      });
      const faltan = variationIds.filter(
        (id) => !found.some((variation) => variation.id === id),
      );
      if (faltan.length) {
        throw new BadRequestException(
          `Estas variaciones no están en el catálogo: ${faltan.join(', ')}`,
        );
      }
    }
  }
}
