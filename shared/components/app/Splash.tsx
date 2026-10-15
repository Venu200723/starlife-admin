"use client";

export function Splash() {
  return (
    <div className="brand-gradient flex h-full flex-col items-center justify-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-4xl backdrop-blur-sm">
        ✚
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-[0.18em]">STAR LIFE CLINIC</h1>
      <p className="mt-2 text-sm tracking-wide text-teal-100/90">Dr. Mahesh Kumar</p>
      <div className="mt-10 h-1 w-24 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-white/90" />
      </div>
      <p className="mt-16 text-[11px] tracking-wide text-teal-100/60">Your health, our priority.</p>
    </div>
  );
}
