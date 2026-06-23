'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Plus, MapPin,
  Settings, LogOut, Users, Map, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn, getRoleDisplayName, getRoleBadgeClass } from '@/lib/utils';
import type { UserRole } from '@/types';

// ─── Nav config ───────────────────────────────────────────────────────

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
  readonly roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard, roles: ['ADMIN', 'VERIFIER'] },
  { href: '/lapangan',    label: 'Antrian Laporan', icon: ClipboardList,   roles: ['ADMIN', 'FIELD_VERIFIER'] },
  { href: '/reports',     label: 'Laporan Saya',    icon: FileText },
  { href: '/reports/new', label: 'Buat Laporan',    icon: Plus },
  { href: '/map',         label: 'Peta',            icon: Map },
  // { href: '/users',       label: 'Kelola User',     icon: Users,     roles: ['ADMIN'] },
  { href: '/settings',   label: 'Pengaturan',      icon: Settings,  roles: ['ADMIN'] },
];

// ─── Component ────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isAdmin, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    return user?.role && item.roles.includes(user.role);
  });

  function handleLogout() {
    logout();
    router.push('/');
  }

  const roleLabel = user
    ? (user.roleInfo?.displayName ?? getRoleDisplayName(user.role))
    : null;

  return (
    <aside className="w-full h-full md:h-screen border-r border-slate-800 bg-slate-900 flex flex-col md:sticky md:top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg text-slate-100 hover:opacity-80 transition-opacity"
        >
          <MapPin className="h-5 w-5 text-blue-400 shrink-0" />
          <span>JalanRusak</span>
        </Link>
        {user && roleLabel && (
          <span
            className={cn(
              'mt-1.5 inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border',
              getRoleBadgeClass(user.role),
            )}
          >
            {roleLabel}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100 truncate leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate leading-tight">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
