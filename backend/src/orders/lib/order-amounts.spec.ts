import { shippingBalanceOf, saleCommission, saleNet } from './order-amounts';

/**
 * Cada caso reproduce una línea del reporte de liquidación de Mercado Libre: el
 * `Total (UYU)` que la plataforma terminó depositando, contra los datos que expone
 * su API para esa venta. Si el cálculo deja de coincidir, dejó de describir cómo
 * liquida Mercado Libre.
 *
 * Cubren las combinaciones que cambian el resultado: envío por agencia pagado por
 * el vendedor, por el comprador o compartido; Flex, donde el envío se cobra en vez
 * de pagarse; multi-unidad, donde la comisión va por unidad; y cancelada.
 */
const SETTLED_SALES = [
  {
    detalle: 'agencia, el vendedor paga el envío',
    totalAmount: '1116.96',
    saleFee: '161.96',
    quantity: 1,
    logisticType: 'xd_drop_off',
    senderCost: '125.00',
    receiverCost: '0.00',
    senderDiscount: null,
    status: 'paid',
    totalSegunMl: 830.0,
  },
  {
    detalle: 'agencia, el comprador paga el envío: no le cuesta al vendedor',
    totalAmount: '916.96',
    saleFee: '172.96',
    quantity: 1,
    logisticType: 'xd_drop_off',
    senderCost: '0.00',
    receiverCost: '240.00',
    senderDiscount: null,
    status: 'paid',
    totalSegunMl: 744.0,
  },
  {
    detalle: 'agencia, envío compartido entre comprador y vendedor',
    totalAmount: '1200.23',
    saleFee: '174.03',
    quantity: 1,
    logisticType: 'xd_drop_off',
    senderCost: '117.50',
    receiverCost: '50.00',
    senderDiscount: null,
    status: 'paid',
    totalSegunMl: 908.7,
  },
  {
    detalle: 'agencia, 2 unidades: la comisión es por unidad',
    totalAmount: '2400.46',
    saleFee: '174.03',
    quantity: 2,
    logisticType: 'xd_drop_off',
    senderCost: '235.00',
    receiverCost: '0.00',
    senderDiscount: null,
    status: 'paid',
    totalSegunMl: 1817.4,
  },
  {
    detalle: 'agencia sin costo de envío para nadie',
    totalAmount: '1833.92',
    saleFee: '161.96',
    quantity: 2,
    logisticType: 'xd_drop_off',
    senderCost: '0.00',
    receiverCost: '0.00',
    senderDiscount: null,
    status: 'paid',
    totalSegunMl: 1510.0,
  },
  {
    detalle: 'Flex con envío pago: el vendedor COBRA lo que puso el comprador',
    totalAmount: '916.96',
    saleFee: '172.96',
    quantity: 1,
    logisticType: 'self_service',
    senderCost: '0.00',
    receiverCost: '169.00',
    senderDiscount: '0.00',
    status: 'paid',
    totalSegunMl: 913.0,
  },
  {
    detalle: 'Flex con envío pago',
    totalAmount: '916.96',
    saleFee: '161.96',
    quantity: 1,
    logisticType: 'self_service',
    senderCost: '0.00',
    receiverCost: '169.00',
    senderDiscount: '0.00',
    status: 'paid',
    totalSegunMl: 924.0,
  },
  {
    detalle:
      'Flex con envío gratis: el vendedor cobra la bonificación, no paga senderCost',
    totalAmount: '1116.96',
    saleFee: '161.96',
    quantity: 1,
    logisticType: 'self_service',
    senderCost: '135.20',
    receiverCost: '0.00',
    senderDiscount: '33.80',
    status: 'paid',
    totalSegunMl: 988.8,
  },
  {
    detalle: 'Flex con envío gratis',
    totalAmount: '1200.23',
    saleFee: '174.03',
    quantity: 1,
    logisticType: 'self_service',
    senderCost: '135.20',
    receiverCost: '0.00',
    senderDiscount: '33.80',
    status: 'paid',
    totalSegunMl: 1060.0,
  },
  {
    detalle: 'cancelada por el comprador: ML revierte todo',
    totalAmount: '550.00',
    saleFee: '95.75',
    quantity: 1,
    logisticType: 'xd_drop_off',
    senderCost: '0.00',
    receiverCost: '240.00',
    senderDiscount: null,
    status: 'cancelled',
    totalSegunMl: 0,
  },
];

describe('liquidación de una venta', () => {
  describe('contra el reporte oficial de Mercado Libre', () => {
    it.each(SETTLED_SALES)('$detalle → $totalSegunMl', (caso) => {
      const sale = {
        status: caso.status,
        totalAmount: caso.totalAmount,
        items: [{ saleFee: caso.saleFee, quantity: caso.quantity }],
        shipment: {
          logisticType: caso.logisticType,
          senderCost: caso.senderCost,
          receiverCost: caso.receiverCost,
          senderDiscount: caso.senderDiscount,
        },
      };

      expect(saleNet(sale)).toBe(caso.totalSegunMl);
    });
  });

  describe('comisionDeVenta', () => {
    it('multiplica por la cantidad porque saleFee es unitario', () => {
      expect(saleCommission([{ saleFee: '174.03', quantity: 2 }])).toBe(348.06);
    });

    it('suma todas las líneas', () => {
      expect(
        saleCommission([
          { saleFee: '100', quantity: 1 },
          { saleFee: '50.5', quantity: 2 },
        ]),
      ).toBe(201);
    });

    it('tolera una venta sin líneas', () => {
      expect(saleCommission()).toBe(0);
    });
  });

  describe('balanceDeEnvio', () => {
    it('sin envío no mueve la aguja', () => {
      expect(shippingBalanceOf(null)).toBe(0);
    });

    it('prorratea entre las ventas hermanas del mismo pack', () => {
      const shipment = {
        logisticType: 'xd_drop_off',
        senderCost: '100.00',
        orders: [{ id: '1' }, { id: '2' }],
      };

      expect(shippingBalanceOf(shipment)).toBe(-50);
    });

    it('no prorratea cuando la venta es la única del envío', () => {
      const shipment = {
        logisticType: 'xd_drop_off',
        senderCost: '100.00',
        orders: [{ id: '1' }],
      };

      expect(shippingBalanceOf(shipment)).toBe(-100);
    });
  });

  it('una venta sin envío liquida sólo producto menos comisión', () => {
    expect(
      saleNet({
        status: 'paid',
        totalAmount: '1000',
        items: [{ saleFee: '145', quantity: 1 }],
        shipment: null,
      }),
    ).toBe(855);
  });
});
