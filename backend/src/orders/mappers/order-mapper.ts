import { Order } from '../entities/order.entity';
import { OrderItem, OrderItemType } from '../entities/order-item.entity';
import { Shipment } from '../entities/shipment.entity';
import {
  MlRawOrder,
  MlRawOrderItem,
  MlRawShipment,
  MlShipmentCosts,
} from '../interfaces/ml-order.interface';

const toText = (value: number | string | null | undefined): string | null =>
  value === null || value === undefined ? null : String(value);

const toDate = (value: string | null | undefined): Date | null =>
  value ? new Date(value) : null;

export class MercadoLibreOrderMapper {
  static mapOrder(raw: MlRawOrder, mlUserId: string): Order {
    const order = new Order();

    order.id = String(raw.id);
    order.mlUser = { id: mlUserId } as Order['mlUser'];
    order.status = raw.status;
    order.dateCreated = new Date(raw.date_created);
    order.dateClosed = toDate(raw.date_closed);
    order.dateLastUpdated = new Date(raw.date_last_updated);
    order.totalAmount = raw.total_amount;
    order.paidAmount = raw.paid_amount ?? null;
    order.currencyId = raw.currency_id;
    order.shippingCost = raw.shipping_cost ?? null;
    order.couponAmount = raw.coupon?.amount ?? 0;
    order.packId = toText(raw.pack_id);
    order.buyerNickname = raw.buyer?.nickname ?? null;
    order.items = (raw.order_items ?? []).map((line) =>
      this.mapOrderItem(line),
    );

    return order;
  }

  static mapOrderItem(raw: MlRawOrderItem): OrderItem {
    const line = new OrderItem();
    const variationId = toText(raw.item.variation_id);

    // El tipo sale de si ML mandó variación: si vino, lo vendido es esa variante.
    line.type = variationId ? OrderItemType.VARIATION : OrderItemType.ITEM;
    line.mlItemId = raw.item.id;
    line.mlVariationId = variationId;
    line.title = raw.item.title;
    line.quantity = raw.quantity;
    line.unitPrice = raw.unit_price;
    line.saleFee = raw.sale_fee;
    line.currencyId = raw.currency_id;
    line.baseExchangeRate = raw.base_exchange_rate ?? null;
    line.baseCurrencyId = raw.base_currency_id ?? null;

    return line;
  }

  /**
   * El costo que importa es `senders[0].cost`: lo que le cobraron al vendedor.
   * `receiver.cost` es lo que pagó el comprador y `gross_amount` el precio de lista.
   */
  static mapShipment(
    raw: MlRawShipment,
    costs: MlShipmentCosts | null,
    mlUserId: string,
  ): Shipment {
    const shipment = new Shipment();

    shipment.id = String(raw.id);
    shipment.mlUser = { id: mlUserId } as Shipment['mlUser'];
    shipment.packId = toText(raw.external_reference);
    shipment.status = raw.status ?? null;
    shipment.substatus = raw.substatus ?? null;
    shipment.logisticMode = raw.logistic?.mode ?? raw.mode ?? null;
    shipment.logisticType = raw.logistic?.type ?? raw.logistic_type ?? null;
    shipment.senderCost = costs?.senders?.[0]?.cost ?? null;
    shipment.receiverCost = costs?.receiver?.cost ?? null;
    shipment.senderDiscount =
      costs?.senders?.[0]?.discounts?.reduce(
        (total, discount) => total + (discount.promoted_amount ?? 0),
        0,
      ) ?? null;
    shipment.grossAmount = costs?.gross_amount ?? null;
    shipment.trackingNumber = raw.tracking_number ?? null;
    shipment.trackingMethod = raw.tracking_method ?? null;
    shipment.declaredValue = raw.declared_value ?? null;
    shipment.dateCreated = toDate(raw.date_created);
    shipment.lastUpdated = toDate(raw.last_updated);

    return shipment;
  }
}
