'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Plus, MapPin,
  Settings, LogOut, Users, Map,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ─── Nav config ───────────────────────────────────────────────────────

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ElementType;
  /** Hanya tampilkan jika user memiliki salah satu role ini */
  readonly roles?: ('PUBLIC' | 'VERIFIER' | 'ADMIN')[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Dashboard',
    icon:  LayoutDashboard,
    roles: ['ADMIN', 'VERIFIER'],
  },
  {
    href:  '/reports',
    label: 'Laporan Saya',
    icon:  FileText,
  },
  {
    href:  '/reports/new',
    label: 'Buat Laporan',
    icon:  Plus,
  },
  {
    href:  '/map',
    label: 'Peta',
    icon:  Map,
  },
  {
    href:  '/users',
    label: 'Kelola User',
    icon:  Users,
    roles: ['ADMIN'],
  },
  {
    href:  '/settings',
    label: 'Pengaturan',
    icon:  Settings,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function getRoleBadgeClass(role: string): string {
  if (role === 'ADMIN')    return 'bg-purple-100 text-purple-700';
  if (role === 'VERIFIER') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

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

  return (
    <aside className="w-64 min-h-screen md:min-h-0 md:h-screen border-r bg-card flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <span>JalanRusak</span>
        </Link>
        {user && (
          <span
            className={cn(
              'mt-1.5 inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full',
              getRoleBadgeClass(user.role),
            )}
          >
            {user.role}
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
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-lg">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate leading-tight">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
