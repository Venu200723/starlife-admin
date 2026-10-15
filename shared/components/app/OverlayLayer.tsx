"use client";

// Renders the top overlay screen from the stack.
import { useAppStore } from "@/store/app-store";
import type { OverlayEntry } from "@/types";
import { DoctorScreen } from "./clinic/DoctorScreen";
import { ServicesScreen } from "./clinic/ServicesScreen";
import { HoursScreen } from "./clinic/HoursScreen";
import { LocationScreen } from "./clinic/LocationScreen";
import { BookingFlow } from "./booking/BookingFlow";
import { ConfirmationScreen } from "./booking/ConfirmationScreen";
import { AppointmentDetailsScreen } from "./appointments/AppointmentDetailsScreen";
import { NotificationsScreen } from "./profile/NotificationsScreen";
import { LegalScreen } from "./profile/LegalScreen";
import { EditProfileScreen } from "./profile/EditProfileScreen";
import { SignInScreen } from "./profile/SignInScreen";

export function OverlayLayer({ entry }: { entry: OverlayEntry }) {
  switch (entry.name) {
    case "doctor":
      return <DoctorScreen />;
    case "services":
      return <ServicesScreen />;
    case "hours":
      return <HoursScreen />;
    case "location":
      return <LocationScreen />;
    case "booking":
      return <BookingFlow />;
    case "confirmation":
      return <ConfirmationScreen confirmation={entry.confirmation!} />;
    case "appointment-details":
      return <AppointmentDetailsScreen id={entry.id!} />;
    case "notifications":
      return <NotificationsScreen />;
    case "privacy":
      return <LegalScreen kind="privacy" />;
    case "terms":
      return <LegalScreen kind="terms" />;
    case "edit-profile":
      return <EditProfileScreen />;
    case "signin":
      return <SignInScreen redirectTo={entry.redirectTo} />;
    default:
      return null;
  }
}

export function useOverlayNav() {
  const push = useAppStore((s) => s.push);
  const pop = useAppStore((s) => s.pop);
  const resetStack = useAppStore((s) => s.resetStack);
  return { push, pop, resetStack };
}
