import type { Metadata } from "next";
import "./globals.css";
import { HeaderPublico } from "@/components/HeaderPublico";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Columbus — Pasajes de bus interprovincial en Ecuador",
  description:
    "Busca, compara y compra tu pasaje de bus interprovincial en Ecuador. Boleto digital con QR, sin filas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <HeaderPublico />
        {children}
        <Footer />
      </body>
    </html>
  );
}
