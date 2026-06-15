'use client';

import Link from 'next/link';
import { MapPin, LogIn, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-100">
          <MapPin className="h-5 w-5 text-blue-400" />
          <span>JalanRusak</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Laporan
          </Link>
          <Link href="/map" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Peta
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-slate-400 hover:text-slate-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 px-4 py-4 flex flex-col gap-3 bg-slate-900">
          <Link href="/reports" className="text-sm text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Laporan</Link>
          <Link href="/map" className="text-sm text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Peta</Link>
          {isAuthenticated ? (
            <>
              <span className="text-xs text-slate-500">Masuk sebagai {user?.name}</span>
              <Link href="/dashboard" className="text-sm text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-sm text-red-400 text-left py-2">Keluar</button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-blue-400 py-2" onClick={() => setMenuOpen(false)}>Masuk</Link>
          )}
        </div>
      )}
    </header>
  );
}
