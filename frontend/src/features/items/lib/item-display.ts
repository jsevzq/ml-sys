import type {
  AttributeOptionDto,
  ItemDto,
  VariationDto,
} from '@/api/generated/models';
import { formatPrice } from '@/lib/format';

export const FALLBACK_IMAGE = '/flat-image.png';

export { formatPrice };

/**
 * Precio a mostrar del producto. Las variantes pueden valer distinto entre sí, así
 * que en ese caso mostramos el rango en vez de un único número que sería mentira.
 */
export function priceLabel(item: ItemDto) {
  const prices = (item.variations ?? []).map((v) => v.price);
  if (prices.length === 0) return formatPrice(item.price, item.currencyId);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatPrice(min, item.currencyId);

  return `${formatPrice(min, item.currencyId)} – ${formatPrice(max, item.currencyId)}`;
}

/** El color del stock y sus umbrales viven en `stock-status.ts`. */
export { healthColorClass, stockTextClass } from './stock-status';

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Activa',
    paused: 'Pausada',
    closed: 'Cerrada',
    under_review: 'En revisión',
    inactive: 'Inactiva',
  };
  return labels[status] ?? status;
}

export function logisticLabel(logisticType: string) {
  return logisticType.replace(/_/g, ' ');
}

/**
 * "Verde" o "0.3 mm": ML manda el valor suelto en `valueName` y, cuando el atributo
 * es de tipo number_unit, el número y la unidad por separado en `detailed`.
 */
export function optionValue(option: AttributeOptionDto) {
  if (option.detailed) {
    return `${option.detailed.number} ${option.detailed.unit}`;
  }
  return option.valueName;
}

export function optionLabel(option: AttributeOptionDto) {
  return option.attributeName ?? option.attributeId ?? 'Atributo';
}

/** Nombre corto de la variante: "Verde · 0.3 mm". Cae al id si no hay atributos. */
export function variantTitle(variation: VariationDto) {
  const values = (variation.attributeOptions ?? []).map(optionValue);
  return values.length > 0 ? values.join(' · ') : `Variante ${variation.id}`;
}

export function variantCover(item: ItemDto, variation: VariationDto) {
  return (
    variation.pictures?.[0]?.secureUrl ??
    item.pictures?.[0]?.secureUrl ??
    FALLBACK_IMAGE
  );
}

export function itemCover(item: ItemDto) {
  return item.pictures?.[0]?.secureUrl ?? FALLBACK_IMAGE;
}

/**
 * Stock, ventas y facturación del producto. Con variantes, el total es la suma de
 * ellas y el volumen usa el precio de cada una, que no siempre es el del producto.
 */
export function itemTotals(item: ItemDto) {
  const variations = item.variations ?? [];

  if (variations.length === 0) {
    return {
      available: item.availableQuantity,
      sold: item.soldQuantity,
      variants: 0,
      volume: item.price * item.soldQuantity,
    };
  }

  return {
    available: variations.reduce((acc, v) => acc + v.availableQuantity, 0),
    sold: variations.reduce((acc, v) => acc + v.soldQuantity, 0),
    variants: variations.length,
    volume: variations.reduce((acc, v) => acc + v.price * v.soldQuantity, 0),
  };
}
