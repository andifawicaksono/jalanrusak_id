import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DamageType } from '@/types';

// ─── State Shapes ────────────────────────────────────────────────────

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  roadName: string;
}

export interface DamageState {
  title: string;
  description: string;
  damageType: DamageType | null;
  severity: number;
  isAnonymous: boolean;
}

const DEFAULT_LOCATION: LocationState = {
  latitude: null,
  longitude: null,
  address: '',
  roadName: '',
};

const DEFAULT_DAMAGE: DamageState = {
  title: '',
  description: '',
  damageType: null,
  severity: 1,
  isAnonymous: false,
};

// ─── Store Interface ─────────────────────────────────────────────────

interface ReportFormStore {
  // Serializable → persisted to sessionStorage
  currentStep: 1 | 2 | 3;
  location: LocationState;
  damage: DamageState;

  // Non-serializable → memory only (cleared on page refresh)
  photos: File[];
  primaryPhotoIndex: number;

  // Upload state (shared between PhotoUpload + ReportConfirm)
  isSubmitting: boolean;
  uploadProgress: number;

  // Actions
  setStep: (step: 1 | 2 | 3) => void;
  setLocation: (data: Partial<LocationState>) => void;
  setDamage: (data: Partial<DamageState>) => void;
  setPhotos: (photos: File[]) => void;
  setPrimaryPhotoIndex: (index: number) => void;
  setIsSubmitting: (v: boolean) => void;
  setUploadProgress: (progress: number) => void;
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const useReportFormStore = create<ReportFormStore>()(
  persist(
    (set) => ({
      currentStep: 1,
      location: DEFAULT_LOCATION,
      damage: DEFAULT_DAMAGE,
      photos: [],
      primaryPhotoIndex: 0,
      isSubmitting: false,
      uploadProgress: 0,

      setStep: (step) => set({ currentStep: step }),
      setLocation: (data) =>
        set((s) => ({ location: { ...s.location, ...data } })),
      setDamage: (data) =>
        set((s) => ({ damage: { ...s.damage, ...data } })),
      setPhotos: (photos) => set({ photos }),
      setPrimaryPhotoIndex: (primaryPhotoIndex) => set({ primaryPhotoIndex }),
      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
      setUploadProgress: (uploadProgress) => set({ uploadProgress }),
      reset: () =>
        set({
          currentStep: 1,
          location: DEFAULT_LOCATION,
          damage: DEFAULT_DAMAGE,
          photos: [],
          primaryPhotoIndex: 0,
          isSubmitting: false,
          uploadProgress: 0,
        }),
    }),
    {
      name: 'report-form-draft',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? localStorage : sessionStorage,
      ),
      // File[] tidak bisa di-serialize → exclude dari persistence
      partialize: (state) => ({
        currentStep: state.currentStep,
        location: state.location,
        damage: state.damage,
      }),
    },
  ),
);
