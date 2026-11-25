import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GradeFlow – Deine Noten. Dein Überblick.",
  description: "Kostenlose Noten- und Schulverwaltung."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
