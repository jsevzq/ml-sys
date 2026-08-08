import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Componentes de Rutas (Guards)
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { MlRequiredRoute } from '@/components/MlRequiredRoute';

// Páginas
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import ConnectMl from '@/pages/ConnectMl';
import { MlCallbackPage } from '@/pages/MlConnectionCallbackPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import Items from '@/pages/Items';
import ItemDetailPage from '@/pages/ItemDetailPage';
import Sales from '@/pages/Sales';
import Importations from '@/pages/Importations';
import Business from '@/pages/Business';
import BusinessAdjustments from '@/pages/BusinessAdjustments';
import Performance from '@/pages/Performance';
import NotFound from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      // La raíz no tiene pantalla propia: manda al panel y deja que los guards
      // decidan. Sin esto queda en blanco, que es lo primero que ve alguien que
      // abre `localhost:5173` sin saber a qué ruta ir.
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <PublicRoute />,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'signup', element: <Signup /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'connect-ml', element: <ConnectMl /> },
          { path: 'connecting-ml', element: <MlCallbackPage /> },

          {
            element: <MlRequiredRoute />,
            children: [
              {
                element: <DashboardLayout />,
                children: [
                  { path: 'dashboard', element: <Dashboard /> },
                  { path: 'products', element: <Items /> },
                  { path: 'products/:id', element: <ItemDetailPage /> },
                  { path: 'sales', element: <Sales /> },
                  { path: 'importations', element: <Importations /> },
                  { path: 'business', element: <Business /> },
                  {
                    path: 'business/adjustments',
                    element: <BusinessAdjustments />,
                  },
                  { path: 'performance', element: <Performance /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
