import Link from 'next/link';
import { AlertTriangle, CheckCircle, Zap, Map } from 'lucide-react';

// Bounding box lebar Indonesia untuk menghitung statistik
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
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
      <Icon className={`h-6 w-6 mx-auto mb-2 ${colorClass}`} />
      <p className="text-2xl font-bold text-white">
        {value > 0 ? value.toLocaleString('id-ID') : '—'}
      </p>
      <p className="text-sm text-blue-100 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function HomePage() {
  const { total, resolved, critical } = await fetchStats();

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">

      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-10 md:py-14">
        <div className="max-w-5xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Map className="h-4 w-4" />
              Platform Laporan Jalan Rusak Indonesia
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">
              Laporkan, Pantau,{' '}
              <span className="text-yellow-300">Perbaiki testing</span>
            </h1>
            <p className="text-blue-100 text-base md:text-lg">
              Platform komunitas untuk memantau dan melaporkan kerusakan jalan.
              Bersama kita wujudkan infrastruktur yang lebih baik.
            </p>
          </div>

          {/* Statistik */}
          <div className="grid grid-cols-3 gap-3 mb-8 max-w-xl mx-auto">
            <StatCard icon={AlertTriangle} value={total}    label="Total Laporan"   colorClass="text-yellow-300" />
            <StatCard icon={CheckCircle}  value={resolved}  label="Telah Diperbaiki" colorClass="text-green-300" />
            <StatCard icon={Zap}          value={critical}  label="Kondisi Kritis"   colorClass="text-red-300" />
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/reports/new"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Buat Laporan Baru
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Map className="h-4 w-4" />
              Lihat Peta Laporan
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Semua Laporan
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="flex-1 bg-gray-50 px-4 py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Cara Kerja Platform</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Temukan Kerusakan',
                desc: 'Jumpai jalan berlubang, retak, atau banjir di sekitar Anda.',
              },
              {
                step: '2',
                title: 'Buat Laporan',
                desc: 'Tandai lokasi di peta, isi detail kerusakan, dan unggah foto.',
              },
              {
                step: '3',
                title: 'Pantau Progress',
                desc: 'Ikuti status laporan dari terverifikasi hingga selesai diperbaiki.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <Map className="h-4 w-4" />
              Buka Peta Laporan
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
