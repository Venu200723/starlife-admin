"use client";

// Global client store: navigation, session, clinic data, offline cache.
import { create } from "zustand";
import type {
  ClinicData,
  OverlayEntry,
  PatientInfo,
  TabKey,
} from "@/types";

export type Phase = "splash" | "onboarding" | "app";

interface AppState {
  phase: Phase;
  tab: TabKey;
  stack: OverlayEntry[]; // overlay screen stack (top = last)
  clinic: ClinicData | null;
  clinicError: string | null;
  clinicLoading: boolean;
  patient: PatientInfo | null;
  patientLoading: boolean;
  online: boolean;

  enterApp: () => void;
  setPhase: (p: Phase) => void;
  setTab: (t: TabKey) => void;
  push: (entry: OverlayEntry) => void;
  pop: () => void;
  resetStack: () => void;
  setClinic: (c: ClinicData | null, error?: string | null) => void;
  setClinicLoading: (v: boolean) => void;
  setPatient: (p: PatientInfo | null) => void;
  setPatientLoading: (v: boolean) => void;
  setOnline: (v: boolean) => void;
}

const CLINIC_CACHE_KEY = "slc_clinic_cache_v1";

function readCachedClinic(): ClinicData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLINIC_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ClinicData) : null;
  } catch {
    return null;
  }
}

export function cacheClinic(c: ClinicData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLINIC_CACHE_KEY, JSON.stringify(c));
  } catch {
    // storage full/unavailable — non-critical
  }
}

export const useAppStore = create<AppState>((set) => ({
  phase: "splash",
  tab: "home",
  stack: [],
  clinic: null,
  clinicError: null,
  clinicLoading: true,
  patient: null,
  patientLoading: true,
  online: true,

  enterApp: () => set({ phase: "app" }),
  setPhase: (phase) => set({ phase, stack: [], tab: "home" }),
  setTab: (tab) => set({ tab, stack: [] }),
  push: (entry) => set((s) => ({ stack: [...s.stack, entry] })),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  resetStack: () => set({ stack: [] }),
  setClinic: (clinic, clinicError = null) => set({ clinic, clinicError, clinicLoading: false }),
  setClinicLoading: (clinicLoading) => set({ clinicLoading }),
  setPatient: (patient) => set({ patient }),
  setPatientLoading: (patientLoading) => set({ patientLoading }),
  setOnline: (online) => set({ online }),
}));

/** Hydrate from cache immediately (offline-first) then revalidate from network. */
export function hydrateClinicCache() {
  const cached = readCachedClinic();
  if (cached) useAppStore.getState().setClinic(cached);
  return cached;
}
