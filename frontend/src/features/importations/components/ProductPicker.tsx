import { useMemo, useState } from 'react';
import type { ItemDto } from '@/api/generated/models';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import { useItems } from '@/features/items';
import { FALLBACK_IMAGE } from '@/features/items/lib/item-display';

/** `item:MLU123` o `variation:111111111111`: lo que espera el formulario. */
export interface ProductOption {
  value: string;
  /** Lo que se busca y lo que queda escrito al elegir. */
  label: string;
  /** Id de ML, para distinguir publicaciones que se llaman igual. */
  codigo: string;
  imagen: string;
}

function buildOptions(items: ItemDto[] = []): ProductOption[] {
  return items.flatMap((item) => {
    const itemPicture = item.pictures?.[0]?.secureUrl;

    return item.variations.length > 0
      ? item.variations.map((variacion) => ({
          value: `variation:${variacion.id}`,
          // El color solo no alcanza: hay que saber de qué publicación es.
          label: `${item.title} — ${variacion.variantName ?? `Variante ${variacion.id}`}`,
          codigo: `${item.id} · ${variacion.id}`,
          // La foto propia de la variante es lo que distingue un verde de un naranja.
          imagen:
            variacion.pictures?.[0]?.secureUrl ?? itemPicture ?? FALLBACK_IMAGE,
        }))
      : [
          {
            value: `item:${item.id}`,
            label: item.title,
            codigo: item.id,
            imagen: itemPicture ?? FALLBACK_IMAGE,
          },
        ];
  });
}

function Miniatura({
  src,
  alt,
  className = 'size-9',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [source, setSource] = useState(src);

  return (
    <img
      src={source}
      alt={alt}
      onError={() => setSource(FALLBACK_IMAGE)}
      className={`${className} shrink-0 rounded-sm bg-muted object-contain`}
    />
  );
}

interface ProductPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Buscador de producto. Con un catálogo de decenas de variantes, un select con
 * todas las opciones abiertas es inmanejable: acá se escribe parte del título o
 * del color y la lista se filtra sola. La foto de cada variante desempata las
 * publicaciones que comparten título.
 */
export function ProductPicker({ id, value, onChange }: ProductPickerProps) {
  const { data: items } = useItems();
  const opciones = useMemo(() => buildOptions(items), [items]);
  const selected = opciones.find((opcion) => opcion.value === value) ?? null;

  return (
    <Combobox
      items={opciones}
      value={selected}
      onValueChange={(opcion: ProductOption | null) =>
        onChange(opcion?.value ?? '')
      }
      itemToStringLabel={(opcion: ProductOption) => opcion.label}
    >
      <ComboboxInput
        id={id}
        placeholder="Buscar por producto o color…"
        className="w-full"
      >
        {selected && (
          <InputGroupAddon align="inline-start">
            <Miniatura
              src={selected.imagen}
              alt={selected.label}
              className="size-6"
            />
          </InputGroupAddon>
        )}
      </ComboboxInput>

      {/* El panel no puede quedar del ancho del campo: cortaba el nombre de la
          variante, que es justo lo que hay que leer para elegir. */}
      <ComboboxContent className="w-[min(34rem,var(--available-width))]">
        <ComboboxEmpty>No hay productos que coincidan</ComboboxEmpty>
        <ComboboxList>
          {(opcion: ProductOption) => (
            <ComboboxItem key={opcion.value} value={opcion}>
              <Miniatura src={opcion.imagen} alt={opcion.label} />
              <div className="flex min-w-0 flex-col">
                <span className="line-clamp-2">{opcion.label}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {opcion.codigo}
                </span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
