import {
  ConsistencyCard,
  EquivalenciasCard,
  ReconciliationSummary,
  AdjustmentsCard,
} from '@/features/business';

function Seccion({
  title,
  descripcion,
  children,
}: {
  title: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </section>
  );
}

export default function BusinessAdjustments() {
  return (
    <div className="flex flex-col gap-8">
      <ReconciliationSummary />

      <Seccion
        title="Qué no cierra"
        descripcion="Diferencias entre el stock de las importaciones y el de Mercado Libre."
      >
        <ConsistencyCard />
      </Seccion>

      <Seccion
        title="Qué lo explica"
        descripcion="Los movimientos registrados para dar cuenta de esas diferencias."
      >
        <AdjustmentsCard />
        <EquivalenciasCard />
      </Seccion>
    </div>
  );
}
