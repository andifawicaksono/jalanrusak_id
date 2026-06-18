'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, FolderOpen, Star, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportFormStore } from '@/store/reportFormStore';

// ─── Constants ───────────────────────────────────────────────────────

const MAX_PHOTOS   = 5;
const MAX_SIZE_MB  = 10;
const MAX_BYTES    = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  readonly photos: File[];
  readonly primaryIndex: number;
  readonly onPhotosChange: (photos: File[]) => void;
  readonly onPrimaryChange: (index: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function PhotoUpload({
  photos,
  primaryIndex,
  onPhotosChange,
  onPrimaryChange,
}: Props) {
  const { isSubmitting, uploadProgress } = useReportFormStore();

  const [isDragging, setIsDragging]           = useState(false);
  const [fileErrors, setFileErrors]           = useState<string[]>([]);
  const [previews, setPreviews]               = useState<string[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [cameraError, setCameraError]         = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function addFiles(incoming: File[]) {
    const errs: string[] = [];
    const valid: File[]  = [];
    const slots = MAX_PHOTOS - photos.length;

    if (incoming.length > slots) {
      errs.push(`Maksimal ${MAX_PHOTOS} foto. Hanya ${slots} slot tersisa.`);
    }

    incoming.slice(0, slots).forEach((file) => {
      if (!ALLOWED_MIME.includes(file.type)) {
        errs.push(`${file.name}: format tidak didukung (JPEG, PNG, WebP saja)`);
        return;
      }
      if (file.size > MAX_BYTES) {
        errs.push(`${file.name}: ukuran melebihi ${MAX_SIZE_MB}MB`);
        return;
      }
      valid.push(file);
    });

    setFileErrors(errs);
    if (valid.length > 0) onPhotosChange([...photos, ...valid]);
  }

  function removePhoto(index: number) {
    const next = photos.filter((_, i) => i !== index);
    onPhotosChange(next);
    if (primaryIndex === index) onPrimaryChange(0);
    else if (primaryIndex > index) onPrimaryChange(primaryIndex - 1);
  }

  function openSourcePicker() {
    setCameraError(null);
    setShowSourcePicker(true);
  }

  function handleGalleryChoice() {
    setShowSourcePicker(false);
    galleryInputRef.current?.click();
  }

  async function handleCameraChoice() {
    setShowSourcePicker(false);

    // Cek apakah browser mendukung akses kamera via MediaDevices API
    if (!navigator.mediaDevices?.getUserMedia) {
      // Browser tidak mendukung (HTTP non-localhost, atau browser lama)
      // Fallback: gunakan input capture — browser/OS yang menangani
      cameraInputRef.current?.click();
      return;
    }

    // Minta izin kamera terlebih dahulu agar error bisa ditangkap
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Matikan stream segera — hanya untuk cek izin, bukan preview
      stream.getTracks().forEach((t) => t.stop());
      cameraInputRef.current?.click();
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      if (isDenied) {
        setCameraError(
          'Akses kamera ditolak. Buka pengaturan browser dan izinkan akses kamera, lalu coba lagi.',
        );
      } else {
        // Kamera tidak tersedia (perangkat tanpa kamera), fallback ke gallery
        setCameraError('Kamera tidak tersedia di perangkat ini. Gunakan opsi Gallery/File.');
      }
    }
  }

  function handleFilesFromInput(ref: React.RefObject<HTMLInputElement>) {
    if (!ref.current?.files) return;
    addFiles(Array.from(ref.current.files));
    ref.current.value = '';
  }

  const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Upload Foto Bukti</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Minimal 1 foto. Klik foto untuk jadikan utama (★).
          </p>
        </div>
        <span className={cn('text-sm font-semibold tabular-nums', photos.length === 0 ? 'text-red-400' : 'text-slate-500')}>
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {/* Progress bar saat submit */}
      {isSubmitting && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Mengupload foto...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drop zone */}
      {photos.length < MAX_PHOTOS && !isSubmitting && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openSourcePicker}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openSourcePicker(); }}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none',
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50',
          )}
        >
          <Upload className={cn('h-8 w-8 mx-auto mb-2', isDragging ? 'text-blue-400' : 'text-slate-500')} />
          <p className="text-sm font-medium text-slate-300">
            {isDragging ? 'Lepaskan foto di sini' : 'Klik untuk tambah foto atau seret ke sini'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            JPEG, PNG, WebP · maks {MAX_SIZE_MB}MB per foto
          </p>
        </div>
      )}

      {/* Hidden inputs */}
      {/* capture="environment" → kamera belakang; browser/OS menangani izin */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => handleFilesFromInput(cameraInputRef)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={ALLOWED_MIME.join(',')}
        multiple
        className="hidden"
        onChange={() => handleFilesFromInput(galleryInputRef)}
      />

      {/* Source picker modal */}
      {showSourcePicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSourcePicker(false)}
            aria-hidden="true"
          />

          {/* Sheet — bottom on mobile, centered on desktop */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih sumber foto"
            className={cn(
              'fixed z-50 bg-slate-900 border border-slate-700 shadow-2xl',
              // Mobile: full-width sheet dari bawah
              'bottom-0 left-0 right-0 rounded-t-3xl px-4 pb-8 pt-4',
              // Desktop: modal kecil di tengah
              'sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-80 sm:rounded-2xl sm:px-6 sm:py-6',
            )}
          >
            {/* Handle bar (mobile only) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />

            <p className="text-center text-sm font-semibold text-slate-200 mb-5">
              Tambah Foto Bukti
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Kamera */}
              <button
                type="button"
                onClick={handleCameraChoice}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-5 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20">
                  <Camera className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">Ambil Foto</p>
                  <p className="text-xs text-slate-500 mt-0.5">Kamera</p>
                </div>
              </button>

              {/* Gallery */}
              <button
                type="button"
                onClick={handleGalleryChoice}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-5 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <FolderOpen className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">Pilih File</p>
                  <p className="text-xs text-slate-500 mt-0.5">Gallery / File</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSourcePicker(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
          </div>
        </>
      )}

      {/* Error kamera */}
      {cameraError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Error validasi file */}
      {fileErrors.length > 0 && (
        <div className="space-y-1">
          {fileErrors.map((err) => (
            <div key={err} className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid preview */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {previews.map((url, idx) => {
            const isPrimary = idx === primaryIndex;
            return (
              <div
                key={url}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-700 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />

                {/* Full-area button for primary selection */}
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={() => onPrimaryChange(idx)}
                    aria-label={`Jadikan foto ${idx + 1} sebagai foto utama`}
                    className="absolute inset-0 cursor-pointer"
                  />
                )}

                {isPrimary && (
                  <div className="absolute top-1.5 left-1.5 bg-yellow-400 rounded-full p-1 shadow pointer-events-none">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                )}

                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                    className="absolute top-1.5 right-1.5 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {!isPrimary && !isSubmitting && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-2 pointer-events-none">
                    <span className="text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 bg-black/70 rounded px-1.5 py-0.5 whitespace-nowrap">
                      Jadikan utama
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Peringatan minimal foto */}
      {photos.length === 0 && !isSubmitting && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Minimal 1 foto harus dilampirkan sebagai bukti kerusakan
        </div>
      )}
    </div>
  );
}
