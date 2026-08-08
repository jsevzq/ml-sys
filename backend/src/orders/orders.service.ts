import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Shipment } from './entities/shipment.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import { MlUser } from '../ml/entities/ml-user.entity';
import { MlClientService } from '../ml-client/ml-client.service';
import { StockAllocationService } from '../importations/stock-allocation.service';
import { MercadoLibreOrderMapper } from './mappers/order-mapper';
import {
  MlOrderSearchResponse,
  MlRawOrder,
  MlRawShipment,
  MlShipmentCosts,
} from './interfaces/ml-order.interface';
import { OrderDto } from './dto/order.dto';
import { OrderListDto, OrderQueryDto } from './dto/order-list.dto';
import { OrderSyncResultDto } from './dto/order-sync-result.dto';
import {
  MonthlySalesDto,
  OrderSummaryDto,
  TopProductDto,
} from './dto/order-summary.dto';
import {
  shippingBalanceOf,
  saleCommission,
  saleNet,
} from './lib/order-amounts';

const PAGE_SIZE = 50;

/** Estados en los que ML revierte todo: no cuentan como venta. */
const ANULADAS = new Set(['cancelled', 'invalid']);
const MAX_PAGES = 200;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Variation)
    private readonly variationRepository: Repository<Variation>,
    @InjectRepository(MlUser)
    private readonly mlUserRepository: Repository<MlUser>,
    private readonly mlClientService: MlClientService,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  async findAll(mlUserId: string, query: OrderQueryDto): Promise<OrderListDto> {
    const limit = query.limit ?? PAGE_SIZE;
    const offset = query.offset ?? 0;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        mlUser: { id: mlUserId },
        ...(query.status ? { status: query.status } : {}),
        ...this.dateRange(query),
      },
      relations: {
        items: {
          item: true,
          variation: { attributeOptions: { attribute: true } },
        },
        // Las ventas hermanas del envío hacen falta para prorratear su costo.
        shipment: { orders: true },
      },
      order: { dateCreated: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      results: plainToInstance(OrderDto, orders, {
        excludeExtraneousValues: true,
      }),
      total,
      limit,
      offset,
    };
  }

  /**
   * Agregados para el dashboard. Se resuelve cargando las ventas del período y
   * reusando las mismas funciones de liquidación que la tabla, para que los números
   * no puedan divergir entre pantallas. Con decenas de miles de ventas habría que
   * pasarlo a SQL agregado.
   */
  async summary(
    mlUserId: string,
    query: OrderQueryDto,
  ): Promise<OrderSummaryDto> {
    const orders = await this.orderRepository.find({
      where: {
        mlUser: { id: mlUserId },
        ...this.dateRange(query),
      },
      relations: { items: { item: true }, shipment: { orders: true } },
      order: { dateCreated: 'ASC' },
    });

    const current = orders.filter((order) => !ANULADAS.has(order.status));

    let revenue = 0;
    let commissions = 0;
    let shipping = 0;
    let net = 0;
    let units = 0;

    const months = new Map<string, MonthlySalesDto>();
    const products = new Map<string, TopProductDto>();

    for (const order of current) {
      const billed = Number(order.totalAmount);
      const commission = saleCommission(order.items);
      const shipment = shippingBalanceOf(order.shipment);
      const orderNet = saleNet(order);
      const orderUnits = (order.items ?? []).reduce(
        (total, line) => total + line.quantity,
        0,
      );

      revenue += billed;
      commissions += commission;
      shipping += shipment;
      net += orderNet;
      units += orderUnits;

      const date = order.dateClosed ?? order.dateCreated;
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const month = months.get(key) ?? {
        month: key,
        revenue: 0,
        net: 0,
        units: 0,
        orders: 0,
      };
      month.revenue += billed;
      month.net += orderNet;
      month.units += orderUnits;
      month.orders += 1;
      months.set(key, month);

      // El neto de la venta se reparte entre sus líneas según lo que aportó cada una.
      for (const line of order.items ?? []) {
        const contribution = Number(line.unitPrice) * line.quantity;
        const share = billed > 0 ? contribution / billed : 0;
        const product = products.get(line.mlItemId) ?? {
          mlItemId: line.mlItemId,
          title: line.title,
          itemId: line.item?.id ?? null,
          units: 0,
          revenue: 0,
          net: 0,
        };
        product.units += line.quantity;
        product.revenue += contribution;
        product.net += orderNet * share;
        products.set(line.mlItemId, product);
      }
    }

    const round = (value: number) => Math.round(value * 100) / 100;

    return {
      orders: current.length,
      units,
      revenue: round(revenue),
      commissions: round(commissions),
      shipping: round(shipping),
      net: round(net),
      averageTicket: current.length ? round(revenue / current.length) : 0,
      cancelled: orders.length - current.length,
      byMonth: [...months.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((month) => ({
          ...month,
          revenue: round(month.revenue),
          net: round(month.net),
        })),
      // Por neto y no por unidades: es lo que el Resumen dibuja, y ordenar por
      // una cosa mientras se muestra otra deja las barras sin escalera. Además
      // el corte a diez tiene que usar el mismo criterio: un producto que vende
      // poco pero deja mucho no puede quedar afuera y después no haber forma de
      // recuperarlo desde el cliente.
      topProducts: [...products.values()]
        .sort((a, b) => b.net - a.net || b.units - a.units)
        .slice(0, 10)
        .map((product) => ({
          ...product,
          revenue: round(product.revenue),
          net: round(product.net),
        })),
    };
  }

  async findOne(id: string, mlUserId: string): Promise<OrderDto> {
    const order = await this.orderRepository.findOne({
      where: { id, mlUser: { id: mlUserId } },
      relations: {
        items: {
          item: { pictures: true },
          variation: { pictures: true, attributeOptions: { attribute: true } },
        },
        shipment: { orders: true },
      },
    });

    if (!order) {
      throw new NotFoundException(`No existe la venta ${id}`);
    }

    return plainToInstance(OrderDto, order, { excludeExtraneousValues: true });
  }

  /**
   * Trae las ventas de ML y las persiste.
   *
   * Arranca desde `ordersSyncedUntil` filtrando por `date_last_updated`, que es lo
   * único que devuelve una orden vieja cuando cambia de estado o se devuelve. Sin
   * cursor previo hace el backfill completo.
   */
  async sync(account: MlUser): Promise<OrderSyncResultDto> {
    const rawOrders = await this.fetchOrders(account);
    const shipments = await this.syncShipments(account, rawOrders);

    const notSaved: string[] = [];
    let saved = 0;

    for (const raw of rawOrders) {
      try {
        await this.upsertOrder(raw, account.id, shipments);
        saved++;
      } catch (error) {
        this.logger.error(
          `No se pudo guardar la venta ${raw.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        notSaved.push(String(raw.id));
      }
    }

    const syncedUntil = this.lastUpdated(rawOrders);
    if (syncedUntil) {
      await this.mlUserRepository.update(account.id, {
        ordersSyncedUntil: syncedUntil,
      });
    }

    // La atribución a lotes se recalcula entera y es determinística, así que traer
    // ventas de nuevo no vuelve a descontar stock de las importaciones.
    await this.stockAllocation.recalculate(account.id);

    return {
      found: rawOrders.length,
      saved,
      shipments: shipments.size,
      notSaved,
      syncedUntil: syncedUntil ?? account.ordersSyncedUntil ?? undefined,
    };
  }

  private dateRange(query: OrderQueryDto) {
    if (query.from && query.to) {
      return { dateCreated: Between(new Date(query.from), new Date(query.to)) };
    }
    if (query.from) {
      return { dateCreated: MoreThanOrEqual(new Date(query.from)) };
    }
    if (query.to) {
      return { dateCreated: LessThanOrEqual(new Date(query.to)) };
    }
    return {};
  }

  private async fetchOrders(account: MlUser): Promise<MlRawOrder[]> {
    const from = account.ordersSyncedUntil;
    const filter = from
      ? `&order.date_last_updated.from=${from.toISOString()}`
      : '';

    const orders: MlRawOrder[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE_SIZE;
      const respuesta = await this.mlClientService.get<MlOrderSearchResponse>(
        `/orders/search?seller=${account.mlUserId}&sort=date_asc&offset=${offset}&limit=${PAGE_SIZE}${filter}`,
        account.accessToken,
      );

      const lot = respuesta.results ?? [];
      orders.push(...lot);

      const total = respuesta.paging?.total ?? orders.length;
      if (lot.length === 0 || orders.length >= total) break;
    }

    return orders;
  }

  /**
   * El envío es del pack: varias órdenes hermanas comparten uno solo. Se piden una
   * vez por id y si alguno falla se sigue: la venta se guarda igual, sin costo.
   */
  private async syncShipments(
    account: MlUser,
    rawOrders: MlRawOrder[],
  ): Promise<Map<string, Shipment>> {
    const ids = [
      ...new Set(
        rawOrders
          .map((order) => order.shipping?.id)
          .filter((id): id is number => Boolean(id))
          .map(String),
      ),
    ];

    const saved = new Map<string, Shipment>();

    for (const id of ids) {
      try {
        const raw = await this.mlClientService.get<MlRawShipment>(
          `/shipments/${id}`,
          account.accessToken,
        );
        const costs = await this.mlClientService
          .get<MlShipmentCosts>(`/shipments/${id}/costs`, account.accessToken)
          .catch(() => null);

        const shipment = MercadoLibreOrderMapper.mapShipment(
          raw,
          costs,
          account.id,
        );
        saved.set(id, await this.shipmentRepository.save(shipment));
      } catch (error) {
        this.logger.warn(
          `No se pudo traer el envío ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return saved;
  }

  private async upsertOrder(
    raw: MlRawOrder,
    mlUserId: string,
    shipments: Map<string, Shipment>,
  ): Promise<void> {
    const order = MercadoLibreOrderMapper.mapOrder(raw, mlUserId);

    const shipmentId = raw.shipping?.id ? String(raw.shipping.id) : null;
    order.shipment = shipmentId
      ? (shipments.get(shipmentId) ??
        (await this.shipmentRepository.findOneBy({ id: shipmentId })))
      : null;

    await this.vincularCatalogo(order.items, mlUserId);

    await this.orderRepository.manager.transaction(async (manager) => {
      await manager.delete(OrderItem, { order: { id: order.id } });
      await manager.save(Order, order);
    });
  }

  /**
   * Engancha cada línea con el catálogo cuando la publicación está sincronizada.
   * Si no está (se eliminó de ML, o todavía no se sincronizó) las relaciones quedan
   * nulas: la venta se guarda igual y el frontend muestra el snapshot.
   */
  private async vincularCatalogo(
    lines: OrderItem[],
    mlUserId: string,
  ): Promise<void> {
    if (lines.length === 0) return;

    const itemIds = [...new Set(lines.map((line) => line.mlItemId))];
    const variationIds = [
      ...new Set(
        lines
          .map((line) => line.mlVariationId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const items = await this.itemRepository.find({
      where: { id: In(itemIds), mlUser: { id: mlUserId } },
      select: { id: true },
    });
    const itemsExistentes = new Set(items.map((item) => item.id));

    const variaciones = variationIds.length
      ? await this.variationRepository.find({
          where: { id: In(variationIds) },
          select: { id: true },
        })
      : [];
    const variacionesExistentes = new Set(
      variaciones.map((variation) => variation.id),
    );

    for (const line of lines) {
      line.item = itemsExistentes.has(line.mlItemId)
        ? ({ id: line.mlItemId } as Item)
        : null;
      line.variation =
        line.mlVariationId && variacionesExistentes.has(line.mlVariationId)
          ? ({ id: line.mlVariationId } as Variation)
          : null;
    }
  }

  private lastUpdated(rawOrders: MlRawOrder[]): Date | null {
    if (rawOrders.length === 0) return null;

    return rawOrders.reduce((maxima, order) => {
      const date = new Date(order.date_last_updated);
      return date > maxima ? date : maxima;
    }, new Date(0));
  }
}
