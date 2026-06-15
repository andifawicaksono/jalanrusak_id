'use client';

import Link from 'next/link';
import { MapPin, LogIn, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

// ─── Style variants ───────────────────────────────────────────────

const homeStyles = {
  logo:         'text-white',
  logoIcon:     'text-yellow-300',
  navLink:      'text-blue-100 hover:text-white',
  logoutBtn:    'text-red-300 hover:text-red-200',
  loginBtn:     'bg-white/20 hover:bg-white/30 border border-white/30 text-white',
  menuToggle:   'text-blue-100 hover:text-white',
  mobilePanel:  'border-blue-700/40 bg-blue-900/95 backdrop-blur-md',
  mobileLink:   'text-blue-100',
  mobileUser:   'text-blue-300',
  mobileLogout: 'text-red-300',
  mobileLogin:  'text-white font-medium',
};

const defaultStyles = {
  logo:         'text-slate-100',
  logoIcon:     'text-blue-400',
  navLink:      'text-slate-400 hover:text-slate-100',
  logoutBtn:    'text-red-400 hover:text-red-300',
  loginBtn:     'bg-blue-600 hover:bg-blue-500 text-white',
  menuToggle:   'text-slate-400 hover:text-slate-100',
  mobilePanel:  'border-slate-800 bg-slate-900',
  mobileLink:   'text-slate-300',
  mobileUser:   'text-slate-500',
  mobileLogout: 'text-red-400',
  mobileLogin:  'text-blue-400',
};

// ─── Component ────────────────────────────────────────────────────

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === '/';
  const s = isHome ? homeStyles : defaultStyles;

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Home: fixed agar hero section bisa muncul di balik navbar (fullscreen)
  // Other: sticky agar konten tidak tertimpa navbar
  const positionClass = isHome ? 'fixed inset-x-0 top-0' : 'sticky top-0';

  return (
    <header className={`${positionClass} z-50`}>

      {/* ── Background layer ──────────────────────────────────────────
          Pada home: gradient transparan → muncul smooth saat scroll via opacity.
          Karena opacity:0 me-nonaktifkan backdrop-filter di browser modern,
          blur hanya terasa saat gradient sudah visible. ──────────────── */}
      {isHome ? (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300
            bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700
            backdrop-blur-md border-b border-blue-700/40 shadow-lg shadow-blue-900/30
            ${scrolled ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-slate-950/95 backdrop-blur border-b border-slate-800"
        />
      )}

      {/* ── Navbar content ── */}
      <div className="relative z-10 container mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className={`flex items-center gap-2 font-bold text-lg transition-colors ${s.logo}`}>
          <MapPin className={`h-5 w-5 transition-colors ${s.logoIcon}`} />
          <span>JalanRusak</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/reports" className={`text-sm transition-colors ${s.navLink}`}>Laporan</Link>
          <Link href="/map"     className={`text-sm transition-colors ${s.navLink}`}>Peta</Link>

          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className={`flex items-center gap-1 text-sm transition-colors ${s.navLink}`}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button onClick={handleLogout} className={`flex items-center gap-1 text-sm transition-colors ${s.logoutBtn}`}>
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </>
          ) : (
            <Link href="/login" className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${s.loginBtn}`}>
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          )}
        </nav>

        <button
          className={`md:hidden transition-colors ${s.menuToggle}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className={`relative z-10 md:hidden border-t px-4 py-4 flex flex-col gap-3 ${s.mobilePanel}`}>
          <Link href="/reports" className={`text-sm py-2 ${s.mobileLink}`} onClick={() => setMenuOpen(false)}>Laporan</Link>
          <Link href="/map"     className={`text-sm py-2 ${s.mobileLink}`} onClick={() => setMenuOpen(false)}>Peta</Link>
          {isAuthenticated ? (
            <>
              <span className={`text-xs ${s.mobileUser}`}>Masuk sebagai {user?.name}</span>
              <Link href="/dashboard" className={`text-sm py-2 ${s.mobileLink}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className={`text-sm text-left py-2 ${s.mobileLogout}`}>Keluar</button>
            </>
          ) : (
            <Link href="/login" className={`text-sm py-2 ${s.mobileLogin}`} onClick={() => setMenuOpen(false)}>Masuk</Link>
          )}
        </div>
      )}
    </header>
  );
}
