import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketYa — Pasajes de bus interprovincial en Ecuador",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
