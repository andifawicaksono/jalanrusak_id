'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Settings, Users, ScrollText, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const SUB_NAV = [
  { href: '/settings',            label: 'Ikhtisar',        icon: LayoutDashboard },
  { href: '/settings/users',      label: 'Kelola User',     icon: Users           },
  { href: '/settings/audit-logs', label: 'Audit Log',       icon: ScrollText      },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
          <Settings className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Pengaturan Sistem</h1>
          <p className="text-sm text-slate-500">Administrasi aplikasi JalanRusak</p>
        </div>
      </div>

      {/* Sub navigation */}
      <div className="flex gap-1 border-b border-slate-800 pb-0 -mb-2">
        {SUB_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/settings' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
