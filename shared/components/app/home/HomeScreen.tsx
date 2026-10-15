"use client";

// Home — the premium clinic overview screen.
import { Bell, MapPin, CalendarCheck2, BellRing, ShieldCheck, MessagesSquare, ChevronRight, Phone, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { CallClinicButton } from "../CallClinicButton";
import { openDirections, track } from "@/lib/client/api";
import { ClinicStatusPill, RatingStars, AvatarInitials, SectionHeader, DurationChip } from "../shared";
import { DAY_NAMES, formatTime12h } from "@/lib/time";

export function HomeScreen() {
  const clinic = useAppStore((s) => s.clinic);
  const loading = useAppStore((s) => s.clinicLoading);
  const patient = useAppStore((s) => s.patient);
  const { push } = useOverlayNav();

  if (loading && !clinic) return <HomeSkeleton />;
  if (!clinic) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Clinic information could not be loaded. Please check your connection and try again.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const todayHours = clinic.hours.find((h) => h.dayOfWeek === new Date().getDay());
  const status = clinic.status;
  const featured = clinic.services.slice(0, 4);

  return (
    <div className="pb-6">
      {/* Header */}
      <header className="flex items-center justify-between bg-background px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
            ✚
          </div>
          <div>
            <p className="text-sm font-bold leading-tight tracking-wide">{clinic.clinic.name}</p>
            <p className="text-[11px] text-muted-foreground">Your health, our priority.</p>
          </div>
        </div>
        <button
          onClick={() => push({ name: "notifications" })}
          className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Notifications${patient?.unreadNotifications ? `, ${patient.unreadNotifications} unread` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {(patient?.unreadNotifications ?? 0) > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {patient!.unreadNotifications! > 9 ? "9+" : patient!.unreadNotifications}
            </span>
          )}
        </button>
      </header>

      {/* Hero status card */}
      <section className="px-4" aria-label="Clinic status">
        <div className="brand-gradient relative overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-teal-900/10">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold leading-tight">{clinic.clinic.name}</h2>
                <p className="mt-0.5 text-xs text-teal-100/90">{clinic.doctor?.name ?? "—"}</p>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                {isOpenText(status.isOpen)}
              </span>
            </div>

            <p className="mt-3 text-sm font-medium text-teal-50">{status.message}</p>
            {todayHours?.isOpen && (
              <p className="mt-0.5 text-xs text-teal-100/80">
                Today: {formatTime12h(todayHours.openingTime)} – {formatTime12h(todayHours.closingTime)}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3 text-xs text-teal-100/90">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 font-semibold">
                <RatingStars rating={clinic.clinic.rating} className="text-white [&>svg]:h-3.5 [&>svg]:w-3.5" />
              </span>
              <span>{clinic.clinic.reviewCount} reviews on Google</span>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-teal-100/80">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Tiruchanur, Andhra Pradesh 517503
            </p>
          </div>
        </div>
      </section>

      {/* Primary + secondary CTAs */}
      <section className="px-4 pt-4" aria-label="Quick actions">
        {clinic.settings.bookingEnabled ? (
          <Button
            onClick={() => {
              track("BOOKING_STARTED");
              push({ name: "booking" });
            }}
            className="h-13 w-full rounded-xl text-base font-bold tracking-wide shadow-md shadow-primary/20"
            size="lg"
          >
            <CalendarCheck2 className="mr-2 h-5 w-5" aria-hidden />
            BOOK APPOINTMENT
          </Button>
        ) : (
          <div className="rounded-xl bg-warning-soft px-4 py-3 text-center text-sm font-medium text-warning">
            Online booking is temporarily unavailable — please call the clinic.
          </div>
        )}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <CallClinicButton
            phone={clinic.clinic.phone}
            variant="outline"
            className="h-11 rounded-xl border-input font-semibold"
          />
          <Button
            variant="outline"
            className="h-11 gap-2 rounded-xl border-input font-semibold"
            onClick={() => openDirections(clinic.clinic.mapsUrl, clinic.clinic.address)}
          >
            <Navigation className="h-4 w-4" aria-hidden />
            GET DIRECTIONS
          </Button>
        </div>
        {clinic.settings.whatsappEnabled && clinic.settings.whatsappNumber && (
          <Button
            variant="secondary"
            className="mt-2.5 h-11 w-full gap-2 rounded-xl font-semibold text-secondary-foreground"
            onClick={() =>
              window.open(
                `https://wa.me/${clinic.settings.whatsappNumber!.replace(/\D/g, "")}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <MessagesSquare className="h-4 w-4" aria-hidden />
            CHAT ON WHATSAPP
          </Button>
        )}
      </section>

      {/* Doctor */}
      <section className="pt-6" aria-label="Doctor">
        <SectionHeader title="Doctor" actionLabel="View profile" onAction={() => push({ name: "doctor" })} />
        <button
          onClick={() => push({ name: "doctor" })}
          className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-border/60 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AvatarInitials name={clinic.doctor?.name ?? "Dr"} className="h-12 w-12 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{clinic.doctor?.name ?? "Doctor"}</p>
            <p className="truncate text-xs text-muted-foreground">
              Consultations {todayHours?.isOpen ? `today ${formatTime12h(todayHours.openingTime)} – ${formatTime12h(todayHours.closingTime)}` : "as per clinic hours"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </section>

      {/* Services */}
      <section className="pt-6" aria-label="Services">
        <SectionHeader title="Services" actionLabel={clinic.services.length ? "View all" : undefined} onAction={() => push({ name: "services" })} />
        {featured.length === 0 ? (
          <p className="mx-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-sm ring-1 ring-border/60">
            Services will be published by the clinic shortly. You can still book a General Consultation.
          </p>
        ) : (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {featured.map((s) => (
              <button
                key={s.id}
                onClick={() => push({ name: "services" })}
                className="w-56 shrink-0 rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-border/60 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <p className="truncate font-semibold">{s.name}</p>
                <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                  {s.description ?? "Consultation at the clinic."}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <DurationChip minutes={s.durationMinutes} />
                  {s.price != null ? (
                    <span className="text-xs font-semibold text-primary">₹{s.price}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Price on consultation</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Clinic hours teaser */}
      <section className="pt-6" aria-label="Clinic hours">
        <SectionHeader title="Clinic Hours" actionLabel="Full schedule" onAction={() => push({ name: "hours" })} />
        <button
          onClick={() => push({ name: "hours" })}
          className="mx-4 w-[calc(100%-2rem)] rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-border/60 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{DAY_NAMES[new Date().getDay()]}</p>
            <ClinicStatusPill isOpen={status.isOpen} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {todayHours?.isOpen
              ? `${formatTime12h(todayHours.openingTime)} – ${formatTime12h(todayHours.closingTime)}`
              : "Closed today"}
            {" · "}Mon–Sat evening, Sun morning
          </p>
        </button>
      </section>

      {/* Why choose us */}
      <section className="pt-6" aria-label="Why choose us">
        <SectionHeader title="Why Choose Us" />
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {[
            { icon: CalendarCheck2, title: "Easy booking", body: "Book in under a minute, anytime." },
            { icon: BellRing, title: "Timely reminders", body: "Notifications for every visit." },
            { icon: ShieldCheck, title: "Private & secure", body: "Only the details we need." },
            { icon: MessagesSquare, title: "Clear updates", body: "Know when your appointment is confirmed." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-border/60">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="pt-6" aria-label="Location">
        <SectionHeader title="Location" actionLabel="Open in Maps" onAction={() => openDirections(clinic.clinic.mapsUrl, clinic.clinic.address)} />
        <div className="mx-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">{clinic.clinic.address}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tap “Open in Maps” for turn-by-turn directions.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-9 flex-1 gap-2 rounded-lg text-secondary-foreground"
              onClick={() => push({ name: "location" })}
            >
              View location
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 flex-1 gap-2 rounded-lg"
              onClick={() => openDirections(clinic.clinic.mapsUrl, clinic.clinic.address)}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden /> Directions
            </Button>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        STAR LIFE CLINIC · {clinic.clinic.phone}
      </p>
    </div>
  );
}

function isOpenText(open: boolean) {
  return open ? "OPEN NOW" : "CLOSED";
}

function HomeSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading clinic information">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-13 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
