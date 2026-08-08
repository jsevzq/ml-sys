import { SalesDashboard, StockAtencion } from '@/features/dashboard';

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <SalesDashboard />
      {/* Después de los números: el detail de qué reponer se mira cuando ya se
          vio cómo viene el mes. */}
      <StockAtencion />
    </div>
  );
}
