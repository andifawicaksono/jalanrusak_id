import Link from 'next/link';
import { MapPin, Map, Shield, Users } from 'lucide-react';

const features = [
  { icon: Map,    text: 'Peta interaktif untuk visualisasi laporan secara real-time' },
  { icon: Shield, text: 'Laporan terverifikasi langsung oleh petugas resmi' },
  { icon: Users,  text: 'Komunitas aktif menjaga kualitas infrastruktur kota' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left: Branding Panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex-col justify-between p-12 relative overflow-hidden">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-2xl translate-y-1/3 -translate-x-1/4" />

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-flex items-center gap-2.5 font-bold text-xl text-white">
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-blue-300" />
          </div>
          JalanRusak
        </Link>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Bersama Wujudkan<br />
              <span className="text-blue-300">Infrastruktur Lebih Baik</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Platform komunitas untuk melaporkan dan memantau perbaikan jalan
              rusak di seluruh Indonesia.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm text-slate-300 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-600">
          © {new Date().getFullYear()} JalanRusak
        </p>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 px-6 py-12 min-h-screen">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-10 font-bold text-lg text-white">
          <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-blue-400" />
          </div>
          JalanRusak
        </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>

        <p className="mt-10 text-xs text-slate-700">
          © {new Date().getFullYear()} JalanRusak
        </p>
      </div>

    </div>
  );
}
