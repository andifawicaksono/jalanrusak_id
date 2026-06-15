import { Fragment } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle, Zap, Map,
  Search, Camera, Activity, ChevronDown, ArrowRight,
} from 'lucide-react';

const INDONESIA_BBOX = {
  swLat: -11, swLng: 95,
  neLat: 6,   neLng: 141,
};

// ─── Server-side Data Fetch ───────────────────────────────────────

interface Stats {
  total:    number;
  resolved: number;
  critical: number;
}

async function fetchStats(): Promise<Stats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(
      `${apiUrl}/reports/map-markers?swLat=${INDONESIA_BBOX.swLat}&swLng=${INDONESIA_BBOX.swLng}&neLat=${INDONESIA_BBOX.neLat}&neLng=${INDONESIA_BBOX.neLng}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return { total: 0, resolved: 0, critical: 0 };
    const { markers } = await res.json() as { markers: { status: string; severity: number }[] };
    return {
      total:    markers.length,
      resolved: markers.filter((m) => m.status === 'RESOLVED').length,
      critical: markers.filter(
        (m) => m.severity >= 4 && m.status !== 'RESOLVED' && m.status !== 'REJECTED',
      ).length,
    };
  } catch {
    return { total: 0, resolved: 0, critical: 0 };
  }
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  colorClass,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly value: number;
  readonly label: string;
  readonly colorClass: string;
}) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 sm:p-5 text-center border border-white/20">
      <Icon className={`h-6 w-6 mx-auto mb-2 ${colorClass}`} />
      <p className="text-2xl font-bold text-white">
        {value > 0 ? value.toLocaleString('id-ID') : '—'}
      </p>
      <p className="text-sm text-blue-100 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Steps Data ───────────────────────────────────────────────────

const steps = [
  {
    step: '01',
    icon: Search,
    title: 'Temukan Kerusakan',
    desc: 'Jumpai jalan berlubang, retak, atau banjir di sekitar Anda dan siap untuk dilaporkan kepada pihak berwenang.',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/40',
  },
  {
    step: '02',
    icon: Camera,
    title: 'Buat Laporan',
    desc: 'Tandai lokasi tepat di peta interaktif, isi detail kerusakan, tingkat keparahan, dan unggah foto sebagai bukti.',
    gradient: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    hoverBorder: 'hover:border-indigo-500/40',
  },
  {
    step: '03',
    icon: Activity,
    title: 'Pantau Progress',
    desc: 'Ikuti perkembangan laporan secara real-time dari status terverifikasi hingga selesai diperbaiki oleh dinas terkait.',
    gradient: 'from-violet-500 to-violet-600',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/40',
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default async function HomePage() {
  const { total, resolved, critical } = await fetchStats();

  return (
    <>
      {/* ── Hero Section — Full Screen ── */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-600 to-indigo-700 text-white px-4 min-h-[calc(100vh-64px)] flex flex-col overflow-hidden">

        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute top-0 right-0 h-[36rem] w-[36rem] rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="pointer-events-none absolute top-1/2 left-1/4 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl -translate-y-1/2" />

        {/* Main content — grows to fill space, centers children vertically */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full text-center py-12">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Map className="h-4 w-4" />
            Platform Laporan Jalan Rusak Indonesia
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-4">
            Laporkan, Pantau,{' '}
            <span className="text-yellow-300 drop-shadow-sm">Perbaiki</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
            Platform komunitas untuk memantau dan melaporkan kerusakan jalan.
            Bersama kita wujudkan infrastruktur yang lebih baik.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-10 max-w-md mx-auto">
            <StatCard icon={AlertTriangle} value={total}    label="Total Laporan"    colorClass="text-yellow-300" />
            <StatCard icon={CheckCircle}  value={resolved}  label="Telah Diperbaiki" colorClass="text-green-300" />
            <StatCard icon={Zap}          value={critical}  label="Kondisi Kritis"   colorClass="text-red-300" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/reports/new"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <AlertTriangle className="h-4 w-4" />
              Buat Laporan Baru
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:-translate-y-0.5"
            >
              <Map className="h-4 w-4" />
              Lihat Peta Laporan
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/10 transition-all hover:-translate-y-0.5"
            >
              Semua Laporan
            </Link>
          </div>
        </div>

        {/* Scroll indicator — selalu di bawah konten, tidak pernah overlap */}
        <div className="relative z-10 flex flex-col items-center gap-1.5 pb-8 animate-bounce">
{/*  */}          <span className="text-xs text-blue-200 font-medium tracking-wide">Gulir ke bawah</span>
          <ChevronDown className="h-5 w-5 text-blue-300" />
        </div>
      </section>

      {/* ── Cara Kerja Platform ── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-400 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-blue-500/20">
              <Zap className="h-3.5 w-3.5" />
              Mudah &amp; Cepat
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3">
              Cara Kerja Platform
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto">
              Tiga langkah sederhana untuk melaporkan dan memantau kerusakan jalan di sekitar Anda.
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
            {steps.map(({ step, icon: Icon, title, desc, gradient, iconBg, iconColor, hoverBorder }, i) => (
              <Fragment key={step}>
                <div
                  className={`group flex-1 bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50 ${hoverBorder} hover:shadow-xl hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center cursor-default`}
                >
                  {/* Numbered circle */}
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {step}
                  </div>

                  {/* Icon */}
                  <div className={`${iconBg} rounded-2xl p-4 mb-5 group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className={`h-8 w-8 ${iconColor}`} />
                  </div>

                  {/* Text */}
                  <h3 className="font-bold text-slate-100 text-lg mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>

                {i < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center px-3 flex-shrink-0">
                    <ArrowRight className="h-7 w-7 text-slate-700" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Map className="h-4 w-4" />
              Buka Peta Laporan
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
