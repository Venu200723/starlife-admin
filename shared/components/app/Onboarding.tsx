"use client";

// First-run onboarding: 3 short slides, skippable, remembered locally.
import { useState } from "react";
import { HeartPulse, CalendarCheck2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icon: HeartPulse,
    title: "Healthcare made simple",
    body: "Everything about STAR LIFE Clinic — the doctor, services and timings — in one clean, easy app.",
  },
  {
    icon: CalendarCheck2,
    title: "Book your clinic appointment easily",
    body: "Pick a service, choose a date and time that suits you, and confirm — in under a minute.",
  },
  {
    icon: BellRing,
    title: "Stay connected with your doctor",
    body: "Track your appointments, receive updates from the clinic, and reach us with one tap.",
  },
];

export function Onboarding() {
  const [index, setIndex] = useState(0);
  const enterApp = useAppStore((s) => s.enterApp);

  const finish = () => {
    localStorage.setItem("slc_onboarding_done_v1", "1");
    enterApp();
  };

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const last = index === SLIDES.length - 1;

  return (
    <div className="flex h-full flex-col bg-background" aria-roledescription="carousel" aria-label="Introduction">
      <div className="flex justify-end p-4">
        <button
          onClick={finish}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="brand-gradient flex h-24 w-24 items-center justify-center rounded-[2rem] text-white shadow-lg shadow-teal-900/20">
          <Icon className="h-11 w-11" aria-hidden />
        </div>
        <h2 className="mt-10 text-[22px] font-bold leading-snug tracking-tight">{slide.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-8 p-8 pt-0">
        <div className="flex items-center gap-2" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
        <Button
          onClick={() => (last ? finish() : setIndex(index + 1))}
          className="h-12 w-full rounded-xl text-base font-semibold"
          aria-label={last ? "Get started" : "Next slide"}
        >
          {last ? "Get Started" : "Next"}
        </Button>
      </div>
    </div>
  );
}
