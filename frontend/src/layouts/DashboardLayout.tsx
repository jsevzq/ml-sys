import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Outlet } from 'react-router-dom'; // <-- IMPORTANTE

export function DashboardLayout() {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      {/* `min-w-0` es lo que impide que una tabla ancha estire el inset: como ítem
          flex, su `min-width: auto` lo dejaba crecer con el contenido y era la
          página entera la que scrolleaba en horizontal —en Ventas se iban de
          pantalla dos columnas— en vez de scrollear la tabla dentro de su caja. */}
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex min-w-0 flex-1 flex-col p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
