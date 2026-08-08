'use client';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, useLocation } from 'react-router-dom';
import { rutaActiva } from '@/lib/rutas';

export function NavDocuments({
  items,
}: {
  items: {
    name: string;
    url: string;
    icon: React.ReactNode;
  }[];
}) {
  const { pathname } = useLocation();
  const activa = rutaActiva(pathname)?.url;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Gestión interna</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={item.url === activa}>
              <Link
                to={item.url}
                aria-current={item.url === activa ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
