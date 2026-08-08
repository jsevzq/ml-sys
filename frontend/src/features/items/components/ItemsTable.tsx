import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Layers } from 'lucide-react';
import type { ItemDto } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FALLBACK_IMAGE,
  formatPrice,
  itemCover,
  itemTotals,
  priceLabel,
  statusLabel,
  stockTextClass,
} from '../lib/item-display';
import { StockBadge } from './StockBadge';

function Miniatura({ item }: { item: ItemDto }) {
  const [source, setSource] = useState(() => itemCover(item));

  return (
    <img
      src={source}
      alt=""
      onError={() => setSource(FALLBACK_IMAGE)}
      className="size-10 shrink-0 rounded-md bg-muted object-contain"
    />
  );
}

/**
 * El catálogo como tabla. Es la vista por defecto: con la grilla de fichas entran
 * ocho productos en pantalla, con la tabla entran veinticinco y las columnas de stock
 * quedan alineadas, que es lo que permite comparar de un vistazo.
 *
 * En pantallas chicas las columnas secundarias se esconden en vez de empujar la tabla
 * a un scroll horizontal: quedan producto, stock y las acciones, que es lo mínimo
 * para reconocer una fila y actuar sobre ella.
 */
export function ItemsTable({ items }: { items: ItemDto[] }) {
  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Stock
              </TableHead>
              <TableHead className="hidden lg:table-cell">Estado</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Vendidas
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Precio
              </TableHead>
              <TableHead className="hidden text-right xl:table-cell">
                Facturado
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const { available, sold, variants, volume } = itemTotals(item);

              return (
                <TableRow key={item.id}>
                  {/* `w-full max-w-0` es el truco de siempre para que una columna de
                      tabla ceda: con `table-layout: auto` el navegador quiere darle a
                      esta celda el ancho del título sin cortar y estira la tabla.
                      Con max-width 0 la columna absorbe el sobrante y el texto envuelve. */}
                  <TableCell className="w-full max-w-0">
                    <div className="flex items-center gap-3">
                      <Miniatura item={item} />
                      {/* `whitespace-normal` porque TableCell trae `whitespace-nowrap`
                          para todas sus celdas: sin esto el título nunca envuelve y
                          `line-clamp-2` termina cortándolo en una sola línea. */}
                      <div className="min-w-0 whitespace-normal">
                        <Link
                          to={`/products/${item.id}`}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {item.title}
                        </Link>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <span className="font-mono">{item.id}</span>
                          {variants > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="flex items-center gap-1">
                                <Layers className="size-3" />
                                {variants}{' '}
                                {variants === 1 ? 'variante' : 'variantes'}
                              </span>
                            </>
                          )}
                        </p>
                        {/* En móvil no hay lugar para una columna de stock, pero es
                            el dato por el que se entra a esta pantalla: va acá. */}
                        <p className="mt-1 flex items-center gap-2 sm:hidden">
                          <span
                            className={`text-sm font-semibold tabular-nums ${stockTextClass(available)}`}
                          >
                            {available} u.
                          </span>
                          <StockBadge quantity={available} />
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-right sm:table-cell">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`font-semibold tabular-nums ${stockTextClass(available)}`}
                      >
                        {available} u.
                      </span>
                      <StockBadge quantity={available} />
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    <Badge
                      variant={
                        item.status === 'active' ? 'secondary' : 'outline'
                      }
                    >
                      {statusLabel(item.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {sold}
                  </TableCell>

                  <TableCell className="hidden text-right tabular-nums whitespace-nowrap sm:table-cell">
                    {priceLabel(item)}
                  </TableCell>

                  <TableCell className="hidden text-right tabular-nums whitespace-nowrap text-muted-foreground xl:table-cell">
                    {formatPrice(volume, item.currencyId)}
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ver el detail de ${item.title}`}
                          >
                            <Link to={`/products/${item.id}`}>
                              <Layers />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detail y variantes</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Abrir ${item.title} en Mercado Libre`}
                          >
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir en Mercado Libre</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
