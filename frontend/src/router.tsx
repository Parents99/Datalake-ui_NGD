import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

import Login from './pages/Login'
import Settings from './pages/Settings'

import Sources from './pages/user/Sources'
import Describe from './pages/user/Describe'
import Profile from './pages/user/Profile'
import Estimate from './pages/user/Estimate'
import Mount from './pages/user/Mount'

import AdminSources from './pages/admin/Sources'
import AdminMount from './pages/admin/Mount'
import AdminDescribe from './pages/admin/Describe'
import AdminProfile from './pages/admin/Profile'
import AdminEstimate from './pages/admin/Estimate'
import AdminQuery from './pages/admin/Query'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/app', element: <Navigate to="/app/sources" replace /> },
          { path: '/app/sources', element: <Sources /> },
          { path: '/app/mount', element: <Mount /> },
          { path: '/app/describe', element: <Describe /> },
          { path: '/app/profile', element: <Profile /> },
          { path: '/app/estimate', element: <Estimate /> },
          { path: '/app/settings', element: <Settings /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute requiredRole="admin" />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/sources" replace /> },
          { path: '/admin/sources', element: <AdminSources /> },
          { path: '/admin/mount', element: <AdminMount /> },
          { path: '/admin/describe', element: <AdminDescribe /> },
          { path: '/admin/profile', element: <AdminProfile /> },
          { path: '/admin/estimate', element: <AdminEstimate /> },
          { path: '/admin/query', element: <AdminQuery /> },
          { path: '/admin/settings', element: <Settings /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
