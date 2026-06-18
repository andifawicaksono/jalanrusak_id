'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push('/');
  }

  // Auth guard — redirect jika belum login
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Tutup sidebar mobile saat navigasi
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          // Desktop: always visible, tidak fixed
          'hidden md:flex md:w-64 md:flex-col md:shrink-0',
          // Mobile: fixed overlay, slide in/out
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-72',
          sidebarOpen ? 'max-md:flex max-md:flex-col' : 'max-md:hidden',
        )}
      >
        <Sidebar />
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
            <MapPin className="h-4 w-4 text-primary" />
            JalanRusak
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
