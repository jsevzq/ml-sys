import * as React from 'react';

import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboardIcon,
  ChartBarIcon,
  CircleDollarSignIcon,
  BoxIcon,
  StoreIcon,
  PlaneIcon,
  MonitorCogIcon,
} from 'lucide-react';
import { useMlStatus } from '@/features/ml-connection';

const data = {
  navMain: [
    {
      title: 'Resumen',
      url: '/dashboard',
      icon: <LayoutDashboardIcon />,
    },
    {
      title: 'Productos',
      url: '/products',
      icon: <BoxIcon />,
    },
    {
      title: 'Ventas',
      url: '/sales',
      icon: <StoreIcon />,
    },
    {
      title: 'Rendimiento',
      url: '/performance',
      icon: <ChartBarIcon />,
    },
  ],
  internal: [
    {
      name: 'Importaciones',
      url: '/importations',
      icon: <PlaneIcon />,
    },
    {
      name: 'Negocio',
      url: '/business',
      icon: <CircleDollarSignIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Los datos de la cuenta salen del servidor, no de una copia en localStorage.
  const { data: mlStatus } = useMlStatus();
  const user = {
    name: mlStatus?.nickname ?? 'Cuenta ML',
    email: mlStatus?.email ?? '',
    avatar: '/user.png',
  };
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <MonitorCogIcon className="size-5!" />
                <span className="text-base font-semibold">
                  Panel de control
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.internal} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
