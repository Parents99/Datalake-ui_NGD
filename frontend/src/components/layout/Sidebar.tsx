import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

type IconName = 'search' | 'sources' | 'mount' | 'describe' | 'profile' | 'estimate' | 'query'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

const userNav: NavItem[] = [
  { to: '/app/sources', label: 'Sources', icon: 'sources' },
  { to: '/app/mount', label: 'Mount', icon: 'mount' },
  { to: '/app/describe', label: 'Describe', icon: 'describe' },
  { to: '/app/profile', label: 'Profile', icon: 'profile' },
  { to: '/app/estimate', label: 'Estimate', icon: 'estimate' },
]

const adminNav: NavItem[] = [
  { to: '/admin/sources', label: 'Sources', icon: 'sources' },
  { to: '/admin/mount', label: 'Mount', icon: 'mount' },
  { to: '/admin/describe', label: 'Describe', icon: 'describe' },
  { to: '/admin/profile', label: 'Profile', icon: 'profile' },
  { to: '/admin/estimate', label: 'Estimate', icon: 'estimate' },
  { to: '/admin/query', label: 'Query', icon: 'query' },
]

function NavIcon({ name }: { name: IconName }) {
  const common = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </svg>
    )
  }

  if (name === 'mount') {
    return (
      <svg {...common}>
        <path d="M12 4v11" />
        <path d="m8 8 4-4 4 4" />
        <path d="M5 16v3h14v-3" />
      </svg>
    )
  }

  if (name === 'describe') {
    return (
      <svg {...common}>
        <path d="M7 4h7l3 3v13H7z" />
        <path d="M14 4v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    )
  }

  if (name === 'profile') {
    return (
      <svg {...common}>
        <path d="M5 19V9" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
      </svg>
    )
  }

  if (name === 'estimate') {
    return (
      <svg {...common}>
        <path d="M7 8h10" />
        <path d="M7 16h10" />
        <path d="M9 6 7 8l2 2" />
        <path d="m15 14 2 2-2 2" />
      </svg>
    )
  }

  if (name === 'query') {
    return (
      <svg {...common}>
        <path d="m8 9-3 3 3 3" />
        <path d="m16 9 3 3-3 3" />
        <path d="m14 5-4 14" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1" />
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H8" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9-.2 1.7 1.7 0 0 0-1 1.6v.3H9.3v-.3a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.2l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.4-1H3v-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9.2 1.7 1.7 0 0 0 1-1.6V2h5.4v.3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.2l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'admin'
  const navItems = isAdmin ? adminNav : userNav

  const handleLogout = async () => {
    setAccountMenuOpen(false)
    await logout()
    navigate('/login')
  }

  const handleSettings = () => {
    setAccountMenuOpen(false)
    navigate(isAdmin ? '/admin/settings' : '/app/settings')
  }

  const activeClass = isAdmin
    ? 'text-amber-700 bg-amber-50 font-medium'
    : 'text-blue-700 bg-blue-50 font-medium'
  const activeBarClass = isAdmin ? 'bg-amber-500' : 'bg-blue-500'

  const hoverClass = 'hover:bg-gray-50 hover:text-gray-900'

  return (
    <aside
      className={`bg-white border-r border-gray-100 flex flex-col transition-[width,min-width] duration-200 ${
        collapsed ? 'w-[76px] min-w-[76px]' : 'w-[220px] min-w-[220px]'
      }`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <MenuIcon />
          </button>
        )}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-semibold shrink-0 ${isAdmin ? 'bg-amber-600' : 'bg-blue-600'}`}>
          SDL
        </div>
        {!collapsed && <span className="text-base font-medium text-gray-900">DataLake</span>}
        {!collapsed && isAdmin && (
          <span className="ml-auto text-[10px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-medium">
            admin
          </span>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mx-auto mt-3 h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <MenuIcon />
        </button>
      )}

      <nav className="flex-1 py-2">
        <p className={`px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-gray-400 ${collapsed ? 'sr-only' : ''}`}>
          {isAdmin ? 'Management' : 'Explore'}
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 py-2.5 text-sm text-gray-600 transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-4'
              } ${
                isActive ? activeClass : hoverClass
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-2 bottom-2 w-1 rounded-r transition-opacity ${
                    isActive ? `${activeBarClass} opacity-100` : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isAdmin ? 'bg-amber-50/70' : 'bg-blue-50/70'
                }`}>
                  <NavIcon name={item.icon} />
                </span>
                {!collapsed && item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`relative border-t border-gray-100 px-4 py-3 ${collapsed ? 'px-0 flex justify-center' : ''}`}>
        {accountMenuOpen && (
          <div
            className={`absolute z-20 bottom-[calc(100%+0.5rem)] rounded-xl border border-gray-100 bg-white p-1 shadow-lg ${
              collapsed ? 'left-2 w-44' : 'left-4 right-4'
            }`}
          >
            <button
              type="button"
              onClick={handleSettings}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <SettingsIcon />
              Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        )}
        {collapsed ? (
          <button
            type="button"
            onClick={() => setAccountMenuOpen((current) => !current)}
            className="h-9 w-9 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
            title="Account menu"
            aria-label="Account menu"
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${isAdmin ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}
            >
              {username?.slice(0, 2).toUpperCase() ?? '??'}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${isAdmin ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}
            >
              {username?.slice(0, 2).toUpperCase() ?? '??'}
            </span>
            <span className="text-sm text-gray-500 flex-1 truncate">{username}</span>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((current) => !current)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              aria-label="Account menu"
            >
                Account
                <ChevronIcon open={accountMenuOpen} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
