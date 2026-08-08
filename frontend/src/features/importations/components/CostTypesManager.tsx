import { useState, type FormEvent } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCostTypes,
  useCreateCostType,
  useDeleteCostType,
} from '../api/useCostTypes';

export function CostTypesManager() {
  const { data: kinds, isPending } = useCostTypes();
  const create = useCreateCostType();
  const remove = useDeleteCostType();
  const [name, setName] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    create.mutate(
      { data: { name: name.trim() } },
      { onSuccess: () => setName('') },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tipos de costo
        </CardTitle>
        <CardDescription>
          Conceptos que pueden sumarse a una importación: régimen aduanero,
          flete, despachante o seguro. Se definen una vez y luego se seleccionan
          en cada importación.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Régimen simplificado"
            maxLength={60}
            className="max-w-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || create.isPending}
          >
            <Plus />
            Agregar
          </Button>
        </form>

        {isPending ? (
          <Skeleton className="h-8 w-64" />
        ) : (kinds ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste ninguno.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(kinds ?? []).map((kind) => (
              <Badge
                key={kind.id}
                variant="outline"
                className="h-7 gap-1 pl-2.5 pr-1"
              >
                {kind.name}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Eliminar ${kind.name}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: kind.id })}
                >
                  <Trash2 />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
