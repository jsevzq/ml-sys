import { useState } from 'react';
import { CreateAdjustmentDtoType } from '@/api/generated/models';
import type { AdjustmentDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useItems } from '@/features/items';
import type { ItemDto } from '@/api/generated/models';
import { ProductPicker } from '@/features/importations/components/ProductPicker';
import {
  useCreateAdjustment,
  useUpdateAdjustment,
} from '../api/useAdjustments';

/** Lo que el diálogo necesita saber de dónde lo abrieron. */
export type AdjustmentContext = (
  | { source: 'importacion'; importationProductId: number }
  | { source: 'venta'; orderItemId: number }
) & {
  label: string;
  maximo: number;
  /** Si viene, el diálogo abre en edición con sus valores cargados. */
  existente?: AdjustmentDto;
};

const IMPORTATION_KINDS = [
  {
    value: CreateAdjustmentDtoType.destruction,
    nombre: 'Destrucción',
    ayuda:
      'La unidad salió de la importación sin venderse: rotura, uso propio o pérdida.',
  },
  {
    value: CreateAdjustmentDtoType.mutation,
    nombre: 'Mutación',
    ayuda:
      'Llegó un producto distinto al comprado y se pasó a vender como el que corresponde.',
  },
];

const today = () => new Date().toISOString().slice(0, 10);

interface AdjustmentDialogProps {
  context: AdjustmentContext | null;
  onClose: () => void;
}

export function AdjustmentDialog({ context, onClose }: AdjustmentDialogProps) {
  if (!context) return null;

  // La `key` remonta el formulario: sus estados iniciales se calculan a partir
  // del contexto, y sin esto quedarían con los valores del anterior.
  return (
    <Form
      key={context.existente?.id ?? JSON.stringify(context)}
      context={context}
      onClose={onClose}
    />
  );
}

function Form({
  context,
  onClose,
}: {
  context: AdjustmentContext;
  onClose: () => void;
}) {
  const isSale = context.source === 'venta';
  const existente = context.existente;

  const [kind, setKind] = useState<CreateAdjustmentDtoType>(
    (existente?.type as CreateAdjustmentDtoType) ??
      CreateAdjustmentDtoType.destruction,
  );
  const [quantity, setQuantity] = useState(String(existente?.quantity ?? 1));
  const [reason, setReason] = useState(existente?.reason ?? '');
  const [date, setDate] = useState(
    existente?.occurredAt?.slice(0, 10) ?? today(),
  );
  const [target, setTarget] = useState(
    existente?.targetSku
      ? `${existente.targetSku.startsWith('MLU') ? 'item' : 'variation'}:${existente.targetSku}`
      : '',
  );
  const { data: items } = useItems();
  const create = useCreateAdjustment();
  const update = useUpdateAdjustment();

  const effectiveKind = isSale ? CreateAdjustmentDtoType.swap : kind;
  const needsTarget = effectiveKind !== CreateAdjustmentDtoType.destruction;
  const elegido = resolveTarget(target, items);

  const enviar = () => {
    if (existente) {
      update.mutate(
        {
          id: existente.id,
          data: {
            reason: reason.trim(),
            quantity: Number(quantity) || 1,
            ...(isSale ? {} : { occurredAt: `${date}T12:00:00.000Z` }),
            ...(needsTarget && elegido ? elegido : {}),
          },
        },
        { onSuccess: onClose },
      );
      return;
    }

    create.mutate(
      {
        data: {
          type: effectiveKind,
          reason: reason.trim(),
          quantity: Number(quantity) || 1,
          ...(context.source === 'importacion'
            ? {
                importationProductId: context.importationProductId,
                // Mediodía UTC: la fecha que elegís es la que se ve, sin que el
                // huso la corra un día para atrás.
                occurredAt: `${date}T12:00:00.000Z`,
              }
            : { orderItemId: context.orderItemId }),
          ...(needsTarget && elegido ? elegido : {}),
        },
      },
      { onSuccess: onClose },
    );
  };

  const listo =
    reason.trim().length >= 3 &&
    Number(quantity) >= 1 &&
    Number(quantity) <= context.maximo &&
    (!needsTarget || elegido !== null);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existente
              ? 'Editar subsanación'
              : isSale
                ? 'Registrar swap'
                : 'Subsanar una línea de la importación'}
          </DialogTitle>
          <DialogDescription>
            {isSale
              ? 'La venta no se modifica: sólo se deja constancia de que se despachó otro producto.'
              : 'La línea de la importación no se modifica: la subsanación se registra como una capa aparte.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            {context.label}
          </div>

          {!isSale && (
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={kind}
                // Cambiar el tipo de una subsanación cargada es otra cosa: hay
                // que borrarla y hacer la que corresponde.
                disabled={existente !== undefined}
                onValueChange={(value) =>
                  setKind(value as CreateAdjustmentDtoType)
                }
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="w-(--radix-select-trigger-width)"
                >
                  {IMPORTATION_KINDS.map((opcion) => (
                    <SelectItem key={opcion.value} value={opcion.value}>
                      {opcion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {IMPORTATION_KINDS.find((o) => o.value === kind)?.ayuda}
              </p>
            </div>
          )}

          {needsTarget && (
            <div className="space-y-2">
              <Label htmlFor="destino">
                {isSale ? 'Producto despachado' : 'Producto resultante'}
              </Label>
              <ProductPicker id="destino" value={target} onChange={setTarget} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Unidades</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={context.maximo}
                value={quantity}
                onChange={(evento) => setQuantity(evento.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {context.maximo}
              </p>
            </div>

            {!isSale && (
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del movimiento</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={date}
                  onChange={(evento) => setDate(evento.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Determina su lugar en el orden de las ventas
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="razon">Motivo</Label>
            <Textarea
              id="razon"
              rows={3}
              value={reason}
              onChange={(evento) => setReason(evento.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!listo || create.isPending || update.isPending}
            onClick={enviar}
          >
            {existente ? 'Guardar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * El `ProductPicker` devuelve `variation:<id>`, pero el backend también quiere la
 * publicación a la que pertenece: la variante sola no alcanza para ubicarla.
 */
function resolveTarget(
  value: string,
  items: ItemDto[] = [],
): { targetItemId: string; targetVariationId?: string } | null {
  const [clase, id] = value.split(':');
  if (!id) return null;
  if (clase === 'item') return { targetItemId: id };

  const dueno = items.find((item) =>
    item.variations.some((variacion) => String(variacion.id) === id),
  );
  return dueno ? { targetItemId: dueno.id, targetVariationId: id } : null;
}
