"use client";

// Call clinic button with an explicit user confirmation before dialing.
import { useState } from "react";
import { Phone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { openDialer } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export function CallClinicButton({
  phone,
  label = "CALL CLINIC",
  variant = "outline",
  size = "default",
  className,
  showIcon = true,
}: {
  phone: string;
  label?: string;
  variant?: "outline" | "default" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={cn("gap-2", className)}>
          {showIcon && <Phone className="h-4 w-4" aria-hidden />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Call the clinic?</AlertDialogTitle>
          <AlertDialogDescription>
            Your phone app will open with the clinic number{" "}
            <span className="font-semibold text-foreground">{phone}</span>. You can confirm the call there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => openDialer(phone)}
            className="bg-success text-white hover:bg-success/90"
          >
            Call now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
