import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voltica Solar | Energía diseñada para avanzar",
  description:
    "Diseñamos soluciones solares On-Grid, híbridas y Off-Grid para hogares y empresas.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
