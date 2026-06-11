'use client';

import dynamic from 'next/dynamic';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReportFormStore } from '@/store/reportFormStore';
import DamageForm from '@/components/reports/DamageForm';
import PhotoUpload from '@/components/reports/PhotoUpload';
import ReportConfirm from '@/components/reports/ReportConfirm';
import { cn } from '@/lib/utils';

// LocationPicker memakai Leaflet → wajib ssr:false
const LocationPicker = dynamic(
  () => import('@/components/reports/LocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
        <p className="text-sm text-gray-400">Memuat peta...</p>
      </div>
    ),
  },
);

// ─── Progress Bar ────────────────────────────────────────────────────

const STEPS = [
  { id: 1 as const, label: 'Lokasi' },
  { id: 2 as const, label: 'Detail Kerusakan' },
  { id: 3 as const, label: 'Foto & Konfirmasi' },
];

function ProgressBar({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="mb-8">
      <div className="flex items-start">
        {STEPS.map((step, idx) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                    isDone
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isActive
                        ? 'bg-white border-blue-600 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-400',
                  )}
                >
                  {isDone ? <CheckCircle className="h-5 w-5" /> : step.id}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[11px] font-medium text-center leading-tight',
                    isActive ? 'text-blue-600' : isDone ? 'text-blue-500' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mt-4 mx-2 transition-all',
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const router = useRouter();
  const {
    currentStep, location, damage, photos, primaryPhotoIndex,
    setStep, setLocation, setDamage, setPhotos, setPrimaryPhotoIndex, reset,
  } = useReportFormStore();

  // Auth dijaga oleh dashboard layout — tidak perlu duplicate check

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Buat Laporan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Laporkan kerusakan jalan yang Anda temui
        </p>
      </div>

      <ProgressBar currentStep={currentStep} />

      {/* Step 1 — Lokasi */}
      {currentStep === 1 && (
        <LocationPicker
          defaultValues={location}
          onNext={(data) => {
            setLocation(data);
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Step 2 — Detail Kerusakan */}
      {currentStep === 2 && (
        <DamageForm
          defaultValues={damage}
          onNext={(data) => {
            setDamage(data);
            setStep(3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={() => setStep(1)}
        />
      )}

      {/* Step 3 — Foto & Konfirmasi */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <PhotoUpload
            photos={photos}
            primaryIndex={primaryPhotoIndex}
            onPhotosChange={setPhotos}
            onPrimaryChange={setPrimaryPhotoIndex}
          />
          <ReportConfirm
            location={location}
            damage={damage}
            photos={photos}
            primaryPhotoIndex={primaryPhotoIndex}
            onBack={() => {
              setStep(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSuccess={reset}
          />
        </div>
      )}
    </div>
  );
}
