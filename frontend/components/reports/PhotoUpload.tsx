'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Star, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportFormStore } from '@/store/reportFormStore';

// ─── Constants ───────────────────────────────────────────────────────

const MAX_PHOTOS   = 5;
const MAX_SIZE_MB  = 5;
const MAX_BYTES    = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Props ───────────────────────────────────────────────────────────

interface Props {
  photos: File[];
  primaryIndex: number;
  onPhotosChange: (photos: File[]) => void;
  onPrimaryChange: (index: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function PhotoUpload({
  photos,
  primaryIndex,
  onPhotosChange,
  onPrimaryChange,
}: Props) {
  const { isSubmitting, uploadProgress } = useReportFormStore();

  const [isDragging, setIsDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Buat blob URL untuk preview; revoke saat foto berubah atau unmount
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function addFiles(incoming: File[]) {
    const errs: string[] = [];
    const valid: File[] = [];
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
    if (primaryIndex === index) {
      onPrimaryChange(0);
    } else if (primaryIndex > index) {
      onPrimaryChange(primaryIndex - 1);
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };
  const handleInputChange = () => {
    if (inputRef.current?.files) {
      addFiles(Array.from(inputRef.current.files));
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Upload Foto Bukti</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Minimal 1 foto. Klik foto untuk jadikan utama (★).
          </p>
        </div>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            photos.length === 0 ? 'text-red-500' : 'text-gray-500',
          )}
        >
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {/* Progress bar (ditampilkan saat submit berlangsung) */}
      {isSubmitting && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Mengupload foto...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drop zone — sembunyikan saat sudah penuh atau sedang submit */}
      {photos.length < MAX_PHOTOS && !isSubmitting && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 mx-auto mb-2',
              isDragging ? 'text-blue-500' : 'text-gray-400',
            )}
          />
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? 'Lepaskan foto di sini' : 'Klik atau seret foto ke sini'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPEG, PNG, WebP · maks {MAX_SIZE_MB}MB per foto
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_MIME.join(',')}
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* Error validasi */}
      {fileErrors.length > 0 && (
        <div className="space-y-1">
          {fileErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600">
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
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer"
                onClick={() => !isSubmitting && onPrimaryChange(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="h-full w-full object-cover"
                />

                {/* Badge foto utama */}
                {isPrimary && (
                  <div className="absolute top-1.5 left-1.5 bg-yellow-400 rounded-full p-1 shadow">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                )}

                {/* Tombol hapus */}
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(idx);
                    }}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Overlay "Jadikan utama" */}
                {!isPrimary && !isSubmitting && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-2">
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
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Minimal 1 foto harus dilampirkan sebagai bukti kerusakan
        </div>
      )}
    </div>
  );
}
