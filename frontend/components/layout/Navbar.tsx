'use client';

import Link from 'next/link';
import { MapPin, LogIn, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

/**
 * Navbar untuk halaman publik.
 * Menampilkan tombol Login/Logout berdasarkan status autentikasi.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          <span>JalanRusak</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/reports" className="text-sm hover:text-primary transition-colors">
            Laporan
          </Link>
          <Link href="/map" className="text-sm hover:text-primary transition-colors">
            Peta
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-3 bg-background">
          <Link href="/reports" className="text-sm py-2" onClick={() => setMenuOpen(false)}>Laporan</Link>
          <Link href="/map" className="text-sm py-2" onClick={() => setMenuOpen(false)}>Peta</Link>
          {isAuthenticated ? (
            <>
              <span className="text-xs text-muted-foreground">Masuk sebagai {user?.name}</span>
              <Link href="/dashboard" className="text-sm py-2" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-sm text-destructive text-left py-2">Keluar</button>
            </>
          ) : (
            <Link href="/login" className="text-sm py-2 text-primary" onClick={() => setMenuOpen(false)}>Masuk</Link>
          )}
        </div>
      )}
    </header>
  );
}
