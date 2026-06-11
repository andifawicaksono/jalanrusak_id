import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * Layout untuk halaman autentikasi (login, register).
 * Tampilan sederhana dengan logo di tengah — tidak ada Navbar/Sidebar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 text-2xl font-bold">
        <MapPin className="h-8 w-8 text-primary" />
        <span>JalanRusak</span>
      </Link>

      {/* Form area */}
      <div className="w-full max-w-md">{children}</div>

      <p className="mt-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} JalanRusak
      </p>
    </div>
  );
}
