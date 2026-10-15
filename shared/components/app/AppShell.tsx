"use client";

// Root shell: bootstraps data, decides splash/onboarding/app phases and
// renders the phone canvas (with desktop presentation). Staff use the
// separate admin website (admin-site/, port 3001) — the patient app has
// no admin surface at all.
import { useEffect, useRef } from "react";
import { useAppStore, hydrateClinicCache } from "@/store/app-store";
import { apiFetch, track } from "@/lib/client/api";
import { Splash } from "./Splash";
import { Onboarding } from "./Onboarding";
import { MainApp } from "./MainApp";
import type { ClinicData, PatientInfo } from "@/types";

const ONBOARDING_KEY = "slc_onboarding_done_v1";

export function AppShell() {
  const phase = useAppStore((s) => s.phase);
  const setClinic = useAppStore((s) => s.setClinic);
  const setClinicLoading = useAppStore((s) => s.setClinicLoading);
  const setPatient = useAppStore((s) => s.setPatient);
  const setPatientLoading = useAppStore((s) => s.setPatientLoading);
  const setOnline = useAppStore((s) => s.setOnline);
  const enterApp = useAppStore((s) => s.enterApp);
  const openedTracked = useRef(false);

  // Bootstrap: offline cache first, then network revalidation + session probe.
  useEffect(() => {
    hydrateClinicCache();

    const go = async () => {
      const [clinicRes, meRes] = await Promise.all([
        apiFetch<ClinicData>("/api/clinic"),
        apiFetch<PatientInfo | null>("/api/auth/patient/me"),
      ]);

      if (clinicRes.ok && clinicRes.data) {
        setClinic(clinicRes.data);
        if (openedTracked.current === false) {
          openedTracked.current = true;
          track("APP_OPENED");
        }
      } else {
        setClinicLoading(false);
        // keep cached data if any; surface error only when we have nothing
        const cached = hydrateClinicCache();
        if (!cached) setClinic(null, clinicRes.error?.message ?? "Could not load clinic information.");
      }

      setPatient(meRes.ok ? (meRes.data ?? null) : null);
      setPatientLoading(false);

      // Splash minimum display + onboarding decision
      const done = localStorage.getItem(ONBOARDING_KEY) === "1";
      window.setTimeout(() => {
        if (done) {
          enterApp();
        } else {
          useAppStore.getState().setPhase("onboarding");
        }
      }, 1700);
    };
    void go();

    // Online/offline listeners
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Track a booking-prompting app open only once per tab session (analytics hygiene)
  useEffect(() => {
    if (phase === "app" && !openedTracked.current) {
      openedTracked.current = true;
      track("APP_OPENED");
    }
  }, [phase]);

  return (
    <div className="min-h-dvh bg-[#0b1d21]">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center gap-20 px-0 lg:px-8 lg:py-10">
        <DesktopAside />
        <div
          className="relative flex h-dvh w-full flex-col overflow-hidden bg-background shadow-2xl lg:h-[820px] lg:w-[400px] lg:rounded-[2.5rem] lg:border-8 lg:border-[#0a1417]"
          role="application"
          aria-label="STAR LIFE Clinic app"
        >
          {phase === "splash" && <Splash />}
          {phase === "onboarding" && <Onboarding />}
          {phase === "app" && <MainApp />}
        </div>
      </div>
    </div>
  );
}

function DesktopAside() {
  return (
    <aside className="hidden max-w-md flex-1 text-white lg:block">
      <div className="mb-6 flex items-center gap-3">
        <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold">
          ✚
        </div>
        <div>
          <p className="text-lg font-bold tracking-wide">STAR LIFE CLINIC</p>
          <p className="text-sm text-teal-200/90">Dr. Mahesh Kumar · Tiruchanur, Andhra Pradesh</p>
        </div>
      </div>
      <h1 className="text-4xl font-bold leading-tight tracking-tight">
        Your health,
        <br />
        our priority.
      </h1>
      <p className="mt-4 leading-relaxed text-teal-100/80">
        Book appointments, check clinic timings, get directions and stay in touch with the clinic —
        all from one simple, trustworthy app.
      </p>
      <ul className="mt-8 space-y-3 text-sm text-teal-100/90">
        {[
          "Check live open status before you leave home",
          "Book an appointment in under a minute",
          "Get timely reminders and status updates",
          "One tap to call the clinic or get directions",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-teal-100/50">
        ★ 5.0 · 39 patient reviews · Rated by the community on Google Maps
      </p>
    </aside>
  );
}
