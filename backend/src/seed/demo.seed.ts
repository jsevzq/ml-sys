/**
 * Datos de demostración para poder ver el sistema andando sin una cuenta de
 * Mercado Libre.
 *
 * MH cruza dos mundos: el catálogo y las ventas que sincroniza de Mercado Libre, y
 * las importaciones que carga el vendedor a mano. Sin lo primero no hay nada que
 * mirar, y lo primero requiere una aplicación registrada en el devcenter, un
 * dominio público y una cuenta con historial. Este seed inventa las dos puntas para
 * que `git clone` alcance.
 *
 * Todo lo que genera es ficticio. Los precios y las comisiones sí siguen el
 * tarifario real de Mercado Libre Uruguay, porque si no los números de rentabilidad
 * quedarían inverosímiles y la demo no mostraría lo que tiene que mostrar.
 *
 *     npm run seed:demo
 *
 * Se niega a correr sobre una base que ya tiene una cuenta vinculada. Para forzarlo
 * —y borrar lo que haya— hay que pasar `--force`, que es deliberadamente incómodo.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { StockAllocationService } from '../importations/stock-allocation.service';
import { AdjustmentsService } from '../importations/adjustments.service';
import { AdjustmentKind } from '../importations/entities/adjustment.entity';
import { User } from '../auth/entities/user.entity';
import { MlUser } from '../ml/entities/ml-user.entity';
import { Item } from '../items/entities/item.entity';
import { Variation } from '../items/entities/variation.entity';
import { Picture } from '../items/entities/picture.entity';
import { Attribute } from '../items/entities/attribute.entity';
import { AttributeOption } from '../items/entities/attribute-option.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem, OrderItemType } from '../orders/entities/order-item.entity';
import { Shipment } from '../orders/entities/shipment.entity';
import { Importation } from '../importations/entities/importation.entity';
import { ImportationProduct } from '../importations/entities/importation-product.entity';
import { AdditionalCostType } from '../importations/entities/additional-cost-type.entity';
import {
  AdditionalCost,
  AdditionalCostKind,
} from '../importations/entities/additional-cost.entity';
import {
  expectedCommission,
  expectedUnitNet,
} from '../importations/lib/expected-value';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

/**
 * Aleatoriedad reproducible: dos corridas del seed generan exactamente los mismos
 * datos. Sin esto, cada captura de pantalla del README mostraría otros números y no
 * habría forma de comparar un antes y un después.
 */
function seededRandom(semilla: number) {
  let state = semilla;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const random = seededRandom(20260808);
const between = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));
const pickOne = <T>(opciones: readonly T[]): T =>
  opciones[Math.floor(random() * opciones.length)];

const addDays = (date: Date, quantity: number) =>
  new Date(date.getTime() + quantity * 86400000);

/**
 * El catálogo ficticio: accesorios para dispositivos electrónicos.
 *
 * Algunos productos se venden por color y otros por capacidad, que es lo que hace
 * interesante la demo: el atributo de la variante no siempre es el mismo, y cuando
 * es la capacidad cada variante tiene su propio precio.
 */
interface CatalogVariant {
  name: string;
  /** Precio propio. Si falta, se usa el de la publicación. */
  price?: number;
}

interface CatalogProduct {
  id: string;
  title: string;
  price: number;
  attribute?: { id: string; name: string };
  variants?: CatalogVariant[];
}

const COLOR = { id: 'COLOR', name: 'Color' };
const CAPACITY = { id: 'CAPACITY', name: 'Capacidad' };

const CATALOG: CatalogProduct[] = [
  {
    id: 'MLU1000000001',
    title: 'Cargador Rápido USB-C 65W GaN',
    price: 1290,
    attribute: COLOR,
    variants: [{ name: 'Negro' }, { name: 'Blanco' }],
  },
  {
    id: 'MLU1000000002',
    title: 'Funda Antigolpes Transparente Para Celular',
    price: 590,
    attribute: COLOR,
    variants: [
      { name: 'Transparente' },
      { name: 'Negro' },
      { name: 'Azul' },
      { name: 'Rosa' },
    ],
  },
  {
    id: 'MLU1000000003',
    title: 'Pendrive USB 3.2 Metálico',
    price: 690,
    attribute: CAPACITY,
    variants: [
      { name: '32 GB', price: 690 },
      { name: '64 GB', price: 990 },
      { name: '128 GB', price: 1490 },
    ],
  },
  {
    id: 'MLU1000000004',
    title: 'Disco Sólido Externo SSD Portátil',
    price: 3990,
    attribute: CAPACITY,
    variants: [
      { name: '480 GB', price: 3990 },
      { name: '1 TB', price: 5990 },
    ],
  },
  { id: 'MLU1000000005', title: 'Cable USB-C A Lightning 1 Metro', price: 490 },
  { id: 'MLU1000000006', title: 'Hub USB-C 6 En 1 Con HDMI', price: 2290 },
  { id: 'MLU1000000007', title: 'Soporte Plegable Para Notebook', price: 1190 },
  {
    id: 'MLU1000000008',
    title: 'Auriculares Bluetooth In-Ear Con Estuche',
    price: 1890,
  },
];

const COST_CONCEPTS = [
  { nombre: 'Flete internacional', kind: AdditionalCostKind.FIXED },
  { nombre: 'Régimen simplificado', kind: AdditionalCostKind.PERCENTAGE },
  { nombre: 'Gestión de despacho', kind: AdditionalCostKind.FIXED },
];

async function main() {
  const forzar = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const ds = app.get(DataSource);

  try {
    const yaHay = await ds.getRepository(MlUser).count();
    if (yaHay > 0 && !forzar) {
      console.error(
        '\nLa base ya tiene una cuenta vinculada. El seed no sobrescribe datos\n' +
          'existentes: si de verdad querés reemplazarlos, corré `npm run seed:demo -- --force`.\n',
      );
      process.exitCode = 1;
      return;
    }

    if (yaHay > 0) {
      console.warn('--force: se borra todo lo que había.');
      // La cascada desde ml_user se lleva catálogo, ventas e importaciones.
      await ds.getRepository(MlUser).delete({});
      await ds.getRepository(User).delete({});
      await ds.query(
        'TRUNCATE TABLE attribute_option, attribute, picture CASCADE',
      );
    }

    console.log('Creando la cuenta de demostración…');
    const user = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        email: DEMO_EMAIL,
        password: await bcrypt.hash(DEMO_PASSWORD, 10),
      }),
    );

    const account = await ds.getRepository(MlUser).save(
      ds.getRepository(MlUser).create({
        userId: String(user.id),
        mlUserId: '123456789',
        nickname: 'VENDEDOR1234',
        email: DEMO_EMAIL,
        fullName: 'Vendedor de Demostración',
        // Tokens que no sirven para nada, y una expiración lejana a propósito: el
        // guard de conexión renueva el token cuando faltan menos de cinco minutos, y
        // con una fecha cercana intentaría hablar con la API real de Mercado Libre.
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        ordersSyncedUntil: new Date(),
        disconnectedAt: null,
      }),
    );

    console.log('Creando el catálogo…');
    const picture = await ds
      .getRepository(Picture)
      .save(
        ds
          .getRepository(Picture)
          .create({ id: 'demo-1', secureUrl: '/flat-image.png' }),
      );

    const today = new Date();
    const skus: {
      itemId: string;
      variationId: string | null;
      title: string;
      price: number;
    }[] = [];

    let nextVariationId = 900000000001n;
    // Un valor de atributo es único por (atributo, valor): "Negro" es el mismo
    // valor para todas las publicaciones que lo usan, así que se reutiliza.
    const attributes = new Map<string, Attribute>();
    const options = new Map<string, AttributeOption>();

    for (const product of CATALOG) {
      const item = await ds.getRepository(Item).save(
        ds.getRepository(Item).create({
          id: product.id,
          mlUser: account,
          title: product.title,
          categoryId: 'MLU12345',
          price: product.price,
          currencyId: 'UYU',
          initialQuantity: 0,
          availableQuantity: 0,
          soldQuantity: 0,
          status: 'active',
          health: 0.9,
          logisticType: 'xd_drop_off',
          permalink: `https://articulo.mercadolibre.com.uy/${product.id}`,
          thumbnail: '/flat-image.png',
          startTime: addDays(today, -400),
          stopTime: addDays(today, 400),
          expirationTime: addDays(today, 400),
          pictures: [picture],
        }),
      );

      if (!product.variants || !product.attribute) {
        skus.push({
          itemId: item.id,
          variationId: null,
          title: product.title,
          price: product.price,
        });
        continue;
      }

      const spec = product.attribute;
      let attribute = attributes.get(spec.id);
      if (!attribute) {
        attribute = await ds
          .getRepository(Attribute)
          .save(ds.getRepository(Attribute).create(spec));
        attributes.set(spec.id, attribute);
      }

      for (const variant of product.variants) {
        const optionKey = `${spec.id}:${variant.name}`;
        let option = options.get(optionKey);
        if (!option) {
          option = await ds.getRepository(AttributeOption).save(
            ds.getRepository(AttributeOption).create({
              valueName: variant.name,
              attribute,
            }),
          );
          options.set(optionKey, option);
        }

        const price = variant.price ?? product.price;
        const variation = await ds.getRepository(Variation).save(
          ds.getRepository(Variation).create({
            id: String(nextVariationId++),
            item,
            price,
            availableQuantity: 0,
            soldQuantity: 0,
            attributeOptions: [option],
            pictures: [picture],
          }),
        );
        skus.push({
          itemId: item.id,
          variationId: variation.id,
          title: product.title,
          price,
        });
      }
    }

    console.log('Creando las importaciones…');
    const kinds = await ds
      .getRepository(AdditionalCostType)
      .save(
        COST_CONCEPTS.map((c) =>
          ds
            .getRepository(AdditionalCostType)
            .create({ name: c.nombre, mlUser: account }),
        ),
      );

    const importations: Importation[] = [];
    for (let i = 0; i < 5; i++) {
      const arrival = addDays(today, -330 + i * 70);
      const elegidos = [...skus]
        .sort(() => random() - 0.5)
        .slice(0, between(6, 10));

      const lines = elegidos.map((sku) =>
        ds.getRepository(ImportationProduct).create({
          quantity: between(2, 10),
          // Costo en dólares: entre un cuarto y un tercio del precio de venta.
          price: Number(
            ((sku.price / 40) * (0.17 + random() * 0.06)).toFixed(2),
          ),
          currency: 'USD',
          exchangeToUYURate: 39.5 + i * 0.4,
          expectedUnitPriceUYU: sku.price,
          item: sku.variationId ? null : { id: sku.itemId },
          variation: sku.variationId ? { id: sku.variationId } : null,
        }),
      );

      const expected = lines.reduce(
        (total, l) =>
          total +
          expectedUnitNet(Number(l.expectedUnitPriceUYU), arrival) * l.quantity,
        0,
      );

      importations.push(
        await ds.getRepository(Importation).save(
          ds.getRepository(Importation).create({
            mlUser: account,
            orderDate: addDays(arrival, -25),
            arrivalDate: arrival,
            products: lines,
            expectedNetUYU: Math.round(expected * 100) / 100,
            additionalCosts: [
              ds.getRepository(AdditionalCost).create({
                type: kinds[0],
                kind: AdditionalCostKind.FIXED,
                amount: between(90, 140),
                currency: 'USD',
                exchangeToUYURate: 39.5 + i * 0.4,
                paidAt: arrival,
              }),
              ds.getRepository(AdditionalCost).create({
                type: kinds[1],
                kind: AdditionalCostKind.PERCENTAGE,
                amount: 60,
                currency: null,
                exchangeToUYURate: null,
                paidAt: arrival,
              }),
            ],
          }),
        ),
      );
    }

    console.log('Creando las ventas…');
    // Qué unidades de cada SKU entraron y cuándo. Una venta sólo puede consumir un
    // lote que ya llegó: si el seed vendiera antes del arribo, el detector de
    // inconsistencias marcaría la venta como huérfana con toda la razón.
    const arrivals = new Map<string, { date: Date; units: number }[]>();
    for (const imp of importations) {
      for (const line of imp.products) {
        const key = line.variation?.id ?? line.item?.id ?? '';
        const list = arrivals.get(key) ?? [];
        list.push({ date: imp.arrivalDate, units: line.quantity });
        arrivals.set(key, list);
      }
    }

    const purchased = new Map<string, number>();
    for (const [key, list] of arrivals) {
      purchased.set(
        key,
        list.reduce((t, l) => t + l.units, 0),
      );
    }

    const receivedBy = (key: string, date: Date) =>
      (arrivals.get(key) ?? [])
        .filter((l) => l.date <= date)
        .reduce((t, l) => t + l.units, 0);

    let nextOrderId = 2000010000000001n;
    let nextShipmentId = 40000000001n;
    const sold = new Map<string, number>();

    for (let d = 320; d > 0; d -= 1) {
      // Alrededor de dos ventas cada tres días.
      if (random() > 0.62) continue;

      const sku = pickOne(skus);
      const key = sku.variationId ?? sku.itemId;
      const date = addDays(today, -d);

      // Se deja siempre una unidad sin vender para que el catálogo no quede en
      // cero y el panel de reposición tenga algo que mostrar.
      const disponible = receivedBy(key, date) - (sold.get(key) ?? 0) - 1;
      if (disponible <= 0) continue;

      const quantity = random() > 0.9 ? 2 : 1;
      if (quantity > disponible) continue;
      sold.set(key, (sold.get(key) ?? 0) + quantity);

      // Una de cada diez sale por Flex, y ahí el envío se cobra en vez de pagarse.
      const flex = random() > 0.9;
      const shipment = await ds.getRepository(Shipment).save(
        ds.getRepository(Shipment).create({
          id: String(nextShipmentId++),
          mlUser: account,
          status: 'delivered',
          substatus: null,
          logisticMode: 'me2',
          logisticType: flex ? 'self_service' : 'xd_drop_off',
          senderCost: flex ? 0 : pickOne([0, 0, 125, 240]),
          receiverCost: flex ? 145 : pickOne([0, 240]),
          senderDiscount: flex ? 145 : 0,
          grossAmount: 240,
          declaredValue: sku.price,
          dateCreated: date,
          lastUpdated: date,
        }),
      );

      const order = ds.getRepository(Order).create({
        id: String(nextOrderId++),
        mlUser: account,
        status: 'paid',
        dateCreated: date,
        dateClosed: date,
        dateLastUpdated: date,
        totalAmount: sku.price * quantity,
        paidAmount: sku.price * quantity,
        currencyId: 'UYU',
        shippingCost: 0,
        couponAmount: 0,
        packId: null,
        buyerNickname: `COMPRADOR-${String(between(1, 400)).padStart(3, '0')}`,
        shipment: shipment,
        items: [
          ds.getRepository(OrderItem).create({
            type: sku.variationId
              ? OrderItemType.VARIATION
              : OrderItemType.ITEM,
            mlItemId: sku.itemId,
            mlVariationId: sku.variationId,
            title: sku.title,
            quantity: quantity,
            unitPrice: sku.price,
            saleFee: expectedCommission(sku.price, date),
            currencyId: 'UYU',
            item: { id: sku.itemId } as Item,
            variation: sku.variationId ? { id: sku.variationId } : null,
          }),
        ],
      });

      await ds.getRepository(Order).save(order);
    }

    // Un par de subsanaciones, que es lo que hace que la sección Negocio muestre
    // algo. Son las dos situaciones reales: una unidad que se rompió y nunca se
    // vendió, y un producto que llegó siendo otro color del que se había comprado.
    console.log('Registrando subsanaciones de ejemplo…');
    const adjustmentsService = app.get(AdjustmentsService);
    const firstLot = await ds.getRepository(Importation).findOne({
      where: { id: importations[0].id },
      relations: { products: { variation: true, item: true } },
    });
    const withStock = (firstLot?.products ?? []).filter((l) => l.quantity >= 3);

    // Lo que cada subsanación le hace al stock del SKU, para poder reflejarlo en
    // lo que informa Mercado Libre. Sin esto el detector marcaría como
    // inconsistencia justamente lo que las subsanaciones vienen a explicar.
    const adjustments = new Map<string, number>();
    const adjust = (key: string, delta: number) =>
      adjustments.set(key, (adjustments.get(key) ?? 0) + delta);

    if (withStock.length >= 2) {
      await adjustmentsService.create(account.id, {
        type: AdjustmentKind.DESTRUCTION,
        importationProductId: withStock[0].id,
        quantity: 1,
        reason: 'Se rompió el envase durante el traslado y quedó inutilizable.',
        occurredAt: addDays(firstLot!.arrivalDate, 12).toISOString(),
      });
      adjust(withStock[0].variation?.id ?? withStock[0].item?.id ?? '', -1);

      // El destino se identifica siempre por publicación, y además por variante
      // cuando el SKU es una.
      const target = skus.find(
        (sku) =>
          sku.variationId && sku.variationId !== withStock[1].variation?.id,
      );
      if (target?.variationId) {
        await adjustmentsService.create(account.id, {
          type: AdjustmentKind.MUTATION,
          importationProductId: withStock[1].id,
          quantity: 1,
          reason:
            'El proveedor mandó otro modelo y se pasó a vender como el que corresponde.',
          occurredAt: addDays(firstLot!.arrivalDate, 5).toISOString(),
          targetItemId: target.itemId,
          targetVariationId: target.variationId,
        });
        adjust(withStock[1].variation?.id ?? withStock[1].item?.id ?? '', -1);
        adjust(target.variationId, 1);
      }
    }

    // El stock que informaría Mercado Libre: lo comprado menos lo vendido. Sin esto
    // el detector de inconsistencias marcaría todo el catálogo.
    for (const sku of skus) {
      const key = sku.variationId ?? sku.itemId;
      const remaining =
        (purchased.get(key) ?? 0) -
        (sold.get(key) ?? 0) +
        (adjustments.get(key) ?? 0);
      if (sku.variationId) {
        await ds.getRepository(Variation).update(sku.variationId, {
          availableQuantity: remaining,
          soldQuantity: sold.get(key) ?? 0,
        });
      } else {
        await ds.getRepository(Item).update(sku.itemId, {
          availableQuantity: remaining,
          soldQuantity: sold.get(key) ?? 0,
        });
      }
    }

    // Los items con variantes agregan el stock de todas.
    for (const product of CATALOG) {
      if (!product.variants) continue;
      const suyos = skus.filter((s) => s.itemId === product.id);
      const stock = suyos.reduce((t, s) => {
        const c = s.variationId!;
        return (
          t +
          ((purchased.get(c) ?? 0) -
            (sold.get(c) ?? 0) +
            (adjustments.get(c) ?? 0))
        );
      }, 0);
      const sales = suyos.reduce(
        (t, s) => t + (sold.get(s.variationId!) ?? 0),
        0,
      );
      await ds.getRepository(Item).update(product.id, {
        availableQuantity: stock,
        soldQuantity: sales,
      });
    }

    console.log('Atribuyendo las ventas a los lotes…');
    const result = await app
      .get(StockAllocationService)
      .recalculate(account.id);

    const orders = await ds.getRepository(Order).count();
    console.log(
      `\nListo. ${CATALOG.length} publicaciones, ${skus.length} SKUs, ` +
        `${importations.length} importaciones, ${orders} ventas, ` +
        `${result.allocatedUnits} unidades atribuidas.\n` +
        `Entrá con ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`,
    );
  } finally {
    await app.close();
  }
}

void main();
