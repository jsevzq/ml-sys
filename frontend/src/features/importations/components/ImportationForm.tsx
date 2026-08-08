import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CreateAdditionalCostDto,
  CreateImportationProductDto,
  ImportationDto,
} from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  useCreateImportation,
  useUpdateImportation,
} from '../api/useImportations';
import { useCostTypes } from '../api/useCostTypes';
import { ProductPicker } from './ProductPicker';

interface EditableLine {
  /** `item:MLU123` o `variation:111111111111`: la opción elegida del catálogo. */
  product: string;
  quantity: string;
  price: string;
  currency: string;
  exchangeToUYURate: string;
}

const emptyLine = (): EditableLine => ({
  product: '',
  quantity: '',
  price: '',
  currency: 'USD',
  exchangeToUYURate: '',
});

interface EditableCost {
  typeId: string;
  kind: 'fixed' | 'percentage';
  amount: string;
  currency: string;
  exchangeToUYURate: string;
  paidAt: string;
}

const emptyCost = (): EditableCost => ({
  typeId: '',
  kind: 'fixed',
  amount: '',
  currency: 'USD',
  exchangeToUYURate: '',
  paidAt: '',
});

/** Las fechas se guardan como medianoche UTC: hay que leerlas en UTC o se corren un día. */
const aInputDate = (iso?: string | Date | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : '';

const toEditableLines = (importation?: ImportationDto): EditableLine[] =>
  importation?.products.length
    ? importation.products.map((product) => ({
        product: product.variationId
          ? `variation:${product.variationId}`
          : `item:${product.itemId}`,
        quantity: String(product.quantity),
        price: String(product.price),
        currency: product.currency,
        exchangeToUYURate: String(product.exchangeToUYURate),
      }))
    : [emptyLine()];

const toEditableCosts = (importation?: ImportationDto): EditableCost[] =>
  (importation?.additionalCosts ?? []).map((cost) => ({
    typeId: String(cost.typeId),
    kind: cost.kind,
    amount: String(cost.amount),
    currency: cost.currency ?? 'USD',
    exchangeToUYURate:
      cost.exchangeToUYURate === null || cost.exchangeToUYURate === undefined
        ? ''
        : String(cost.exchangeToUYURate),
    paidAt: aInputDate(cost.paidAt),
  }));

/** Un porcentual no lleva moneda ni tipo de cambio: se aplica sobre la mercadería. */
function toCost(cost: EditableCost): CreateAdditionalCostDto {
  const base = {
    typeId: Number(cost.typeId),
    kind: cost.kind,
    amount: Number(cost.amount),
    ...(cost.paidAt ? { paidAt: new Date(cost.paidAt).toISOString() } : {}),
  };

  if (cost.kind === 'percentage') return base;

  return {
    ...base,
    currency: cost.currency,
    ...(cost.exchangeToUYURate
      ? { exchangeToUYURate: Number(cost.exchangeToUYURate) }
      : {}),
  };
}

/** El backend espera itemId **o** variationId, nunca los dos. */
function toProduct(line: EditableLine): CreateImportationProductDto {
  const [kind, id] = line.product.split(':');

  return {
    ...(kind === 'variation' ? { variationId: id } : { itemId: id }),
    quantity: Number(line.quantity),
    price: Number(line.price),
    currency: line.currency,
    exchangeToUYURate: Number(line.exchangeToUYURate),
  };
}

interface ImportationFormProps {
  /** Si viene, el formulario edita esa importación en vez de crear una nueva. */
  importation?: ImportationDto;
  onDone: () => void;
}

export function ImportationForm({ importation, onDone }: ImportationFormProps) {
  const { data: costTypes } = useCostTypes();
  const create = useCreateImportation();
  const updateImportation = useUpdateImportation();

  const [orderDate, setOrderDate] = useState(
    aInputDate(importation?.orderDate),
  );
  const [arrivalDate, setArrivalDate] = useState(
    aInputDate(importation?.arrivalDate),
  );
  const [lines, setLines] = useState<EditableLine[]>(() =>
    toEditableLines(importation),
  );
  const [costs, setCosts] = useState<EditableCost[]>(() =>
    toEditableCosts(importation),
  );

  const editando = Boolean(importation);
  const saving = create.isPending || updateImportation.isPending;

  const update = (index: number, campo: keyof EditableLine, value: string) =>
    setLines((current) =>
      current.map((line, i) =>
        i === index ? { ...line, [campo]: value } : line,
      ),
    );

  const updateCost = (
    index: number,
    campo: keyof EditableCost,
    value: string,
  ) =>
    setCosts((current) =>
      current.map((cost, i) =>
        i === index ? { ...cost, [campo]: value } : cost,
      ),
    );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    // El backend reemplaza líneas y costos por completo: se manda cómo queda el lote.
    const data = {
      orderDate: new Date(orderDate).toISOString(),
      arrivalDate: new Date(arrivalDate).toISOString(),
      products: lines.map(toProduct),
      additionalCosts: costs.map(toCost),
    };

    if (importation) {
      updateImportation.mutate(
        { id: importation.id, data },
        { onSuccess: onDone },
      );
      return;
    }

    create.mutate({ data }, { onSuccess: onDone });
  };

  const full =
    orderDate &&
    arrivalDate &&
    lines.every(
      (line) =>
        line.product && line.quantity && line.price && line.exchangeToUYURate,
    ) &&
    costs.every((cost) => cost.typeId && cost.amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editando ? 'Editar importación' : 'Nueva importación'}
        </CardTitle>
        <CardDescription>
          La fecha de arrival determina el orden FIFO: una importación sólo
          puede abastecer ventas posteriores a ella.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="orderDate">Fecha de compra</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrivalDate">Fecha de arrival</Label>
              <Input
                id="arrivalDate"
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                required
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid items-end gap-3 md:grid-cols-[minmax(0,3fr)_repeat(4,minmax(0,1fr))_auto]"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`producto-${index}`}>Producto</Label>
                  <ProductPicker
                    id={`producto-${index}`}
                    value={line.product}
                    onChange={(value) => update(index, 'product', value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`quantity-${index}`}>Unidades</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => update(index, 'quantity', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`precio-${index}`}>Precio unitario</Label>
                  <Input
                    id={`precio-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => update(index, 'price', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`moneda-${index}`}>Moneda</Label>
                  <Input
                    id={`moneda-${index}`}
                    maxLength={3}
                    value={line.currency}
                    onChange={(e) =>
                      update(index, 'currency', e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`cambio-${index}`}>Tipo de cambio</Label>
                  <Input
                    id={`cambio-${index}`}
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="a UYU"
                    value={line.exchangeToUYURate}
                    onChange={(e) =>
                      update(index, 'exchangeToUYURate', e.target.value)
                    }
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar línea"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              <Plus />
              Agregar producto
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Costos adicionales</p>
              <p className="text-xs text-muted-foreground">
                Flete, despachante o régimen aduanero. Se prorratean entre los
                productos por value; los porcentuales se calculan sobre el costo
                de la mercadería.
              </p>
            </div>

            {(costTypes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Primero debe definir al menos un tipo de costo.
              </p>
            ) : (
              <>
                {costs.map((cost, index) => (
                  <div
                    key={index}
                    className="grid items-end gap-3 md:grid-cols-[minmax(0,3fr)_repeat(4,minmax(0,1fr))_auto]"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`tipo-${index}`}>Concepto</Label>
                      <Select
                        value={cost.typeId}
                        onValueChange={(value) =>
                          updateCost(index, 'typeId', value)
                        }
                      >
                        <SelectTrigger id={`tipo-${index}`} className="w-full">
                          <SelectValue placeholder="Seleccione un concepto…" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="w-(--radix-select-trigger-width)"
                        >
                          {(costTypes ?? []).map((kind) => (
                            <SelectItem key={kind.id} value={String(kind.id)}>
                              {kind.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`kind-${index}`}>Tipo</Label>
                      <Select
                        value={cost.kind}
                        onValueChange={(value) =>
                          updateCost(index, 'kind', value)
                        }
                      >
                        <SelectTrigger id={`kind-${index}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="w-(--radix-select-trigger-width)"
                        >
                          <SelectItem value="fixed">Monto fijo</SelectItem>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`monto-${index}`}>
                        {cost.kind === 'percentage'
                          ? '% s/ mercadería'
                          : 'Monto'}
                      </Label>
                      <Input
                        id={`monto-${index}`}
                        type="number"
                        min="0"
                        max={cost.kind === 'percentage' ? '100' : undefined}
                        step="0.01"
                        value={cost.amount}
                        onChange={(e) =>
                          updateCost(index, 'amount', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`moneda-costo-${index}`}>Moneda</Label>
                      <Input
                        id={`moneda-costo-${index}`}
                        maxLength={3}
                        disabled={cost.kind === 'percentage'}
                        value={cost.kind === 'percentage' ? '' : cost.currency}
                        onChange={(e) =>
                          updateCost(
                            index,
                            'currency',
                            e.target.value.toUpperCase(),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`cambio-costo-${index}`}>
                        Tipo de cambio
                      </Label>
                      <Input
                        id={`cambio-costo-${index}`}
                        type="number"
                        min="0"
                        step="0.0001"
                        placeholder="a UYU"
                        disabled={cost.kind === 'percentage'}
                        value={
                          cost.kind === 'percentage'
                            ? ''
                            : cost.exchangeToUYURate
                        }
                        onChange={(e) =>
                          updateCost(index, 'exchangeToUYURate', e.target.value)
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar costo"
                      onClick={() =>
                        setCosts((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCosts((current) => [...current, emptyCost()])
                  }
                >
                  <Plus />
                  Agregar costo
                </Button>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button type="submit" disabled={!full || saving}>
              {saving
                ? 'Guardando...'
                : editando
                  ? 'Guardar cambios'
                  : 'Guardar importación'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
