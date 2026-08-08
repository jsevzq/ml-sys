import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PERIODS, type PeriodKey } from '@/lib/periodo';

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={value}
      // Sin esto, volver a tocar la opción activa la deselecciona y deja la
      // pantalla sin período.
      onValueChange={(next) => next && onChange(next as PeriodKey)}
      aria-label="Período"
    >
      {PERIODS.map((period) => (
        <ToggleGroupItem key={period.key} value={period.key}>
          {period.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
