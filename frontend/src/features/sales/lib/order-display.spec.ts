import { describe, expect, it } from 'vitest';
import type { OrderDto } from '@/api/generated/models';
import {
  estaAnulada,
  statusLabel,
  statusVariant,
  logisticaLabel,
  unitOrder,
} from './order-display';

function sort(parcial: Partial<OrderDto>): OrderDto {
  return { status: 'paid', items: [], ...parcial } as OrderDto;
}

describe('ordenUnidades', () => {
  it('suma las unidades de todas las líneas', () => {
    expect(
      unitOrder(sort({ items: [{ quantity: 2 }, { quantity: 3 }] as never })),
    ).toBe(5);
  });

  it('una venta sin líneas no rompe', () => {
    expect(unitOrder(sort({ items: [] }))).toBe(0);
  });
});

describe('estaAnulada', () => {
  it('cancelada e inválida no liquidan nada', () => {
    expect(estaAnulada(sort({ status: 'cancelled' }))).toBe(true);
    expect(estaAnulada(sort({ status: 'invalid' }))).toBe(true);
  });

  it('el resto de los estados sí', () => {
    expect(estaAnulada(sort({ status: 'paid' }))).toBe(false);
    expect(estaAnulada(sort({ status: 'payment_in_process' }))).toBe(false);
  });
});

describe('estadoLabel', () => {
  it('traduce los estados conocidos', () => {
    expect(statusLabel('paid')).toBe('Pagada');
    expect(statusLabel('payment_required')).toBe('Pago pendiente');
  });

  // ML puede sumar estados nuevos sin avisar: mostrar el crudo es mejor que
  // mostrar vacío.
  it('deja pasar uno desconocido en vez de vaciarlo', () => {
    expect(statusLabel('estado_nuevo_de_ml')).toBe('estado_nuevo_de_ml');
  });
});

describe('estadoVariant', () => {
  it('pinta lo anulado como destructivo', () => {
    expect(statusVariant('cancelled')).toBe('destructive');
    expect(statusVariant('invalid')).toBe('destructive');
  });

  it('pinta lo cobrado como éxito', () => {
    expect(statusVariant('paid')).toBe('success');
    expect(statusVariant('confirmed')).toBe('success');
  });

  // Un pago a medio camino pide atención: en gris se confundía con "sin estado".
  it('pinta los pagos en curso como advertencia', () => {
    expect(statusVariant('payment_required')).toBe('warning');
    expect(statusVariant('payment_in_process')).toBe('warning');
    expect(statusVariant('partially_paid')).toBe('warning');
  });

  it('cae a secundario ante lo desconocido', () => {
    expect(statusVariant('lo_que_venga')).toBe('secondary');
  });
});

describe('logisticaLabel', () => {
  it('traduce las logísticas de Mercado Envíos', () => {
    expect(logisticaLabel('self_service')).toBe('Flex');
    expect(logisticaLabel('xd_drop_off')).toBe('Agencia');
  });

  it('sin logística no muestra nada', () => {
    expect(logisticaLabel(undefined)).toBeNull();
  });

  it('hace legible una que no conocemos', () => {
    expect(logisticaLabel('nueva_logistica')).toBe('nueva logistica');
  });
});
