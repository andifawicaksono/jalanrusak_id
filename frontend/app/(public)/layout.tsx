import Navbar from '@/components/layout/Navbar';

/**
 * Layout untuk halaman publik (landing page, daftar laporan publik).
 * Menampilkan Navbar dengan navigasi publik.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} JalanRusak — Bersama Memperbaiki Infrastruktur Kota
      </footer>
    </div>
  );
}
