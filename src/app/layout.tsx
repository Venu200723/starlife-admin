import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../../src/app/globals.css";

export const metadata: Metadata = {
  title: "STAR LIFE CLINIC · Staff Portal",
  description: "Staff dashboard for STAR LIFE CLINIC – Dr. Mahesh Kumar",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
