/** Recorte de la respuesta de ML: sólo lo que el modelo usa. */

export interface MlOrderSearchResponse {
  results?: MlRawOrder[];
  paging?: { total: number; offset: number; limit: number };
}

export interface MlRawOrder {
  id: number;
  status: string;
  date_created: string;
  date_closed: string | null;
  date_last_updated: string;
  total_amount: number;
  paid_amount: number | null;
  currency_id: string;
  shipping_cost: number | null;
  coupon?: { amount?: number | null } | null;
  pack_id: number | null;
  buyer?: { nickname?: string | null } | null;
  shipping?: { id?: number | null } | null;
  order_items?: MlRawOrderItem[];
}

export interface MlRawOrderItem {
  item: {
    id: string;
    title: string;
    variation_id: number | string | null;
  };
  quantity: number;
  unit_price: number;
  sale_fee: number;
  currency_id: string;
  base_exchange_rate: number | null;
  base_currency_id: string | null;
}

export interface MlRawShipment {
  id: number;
  status: string | null;
  substatus: string | null;
  external_reference: string | null;
  tracking_number: string | null;
  tracking_method: string | null;
  declared_value: number | null;
  date_created: string | null;
  last_updated: string | null;
  /** Formato nuevo (`x-format-new`). Por defecto ML manda `mode` y `logistic_type` sueltos. */
  logistic?: { mode?: string | null; type?: string | null } | null;
  mode?: string | null;
  logistic_type?: string | null;
}

export interface MlShipmentDiscount {
  rate?: number | null;
  type?: string | null;
  promoted_amount?: number | null;
}

export interface MlShipmentCosts {
  gross_amount: number | null;
  receiver?: { cost?: number | null } | null;
  senders?: { cost?: number | null; discounts?: MlShipmentDiscount[] }[];
}
