"use client";

import Image from "next/image";
import { IconoPublicidad } from "./ilustraciones/IconoPublicidad";

interface Props {
  /** Nombre real del anunciante -- mismo campo que ya usa CampanaActiva en lib/api.ts. */
  nombreAnunciante: string;
  /** URL real de la creatividad ya diseñada, subida por el equipo desde el Panel Admin
   * (RF-COMM-009) -- nunca la carga el anunciante directamente. Si no existe, se usa el
   * ícono genérico -- nunca queda un espacio vacío ni roto. */
  archivoUrl?: string | null;
  /** A dónde lleva el clic -- opcional, para cuando la tarjeta es interactiva. */
  href?: string;
  /** Se dispara al hacer clic, antes de navegar -- para registrar la métrica real. */
  onClic?: () => void;
}

/**
 * Publicidad nativa -- decisión real de diseño, investigada y
 * documentada el 07-ago-2026 (DOCUMENTO_MAESTRO.md sección 3.9, con
 * fuentes reales: Booking.com, Skyscanner, "Paid Posts" de NYT):
 * "el resultado patrocinado usa el MISMO formato de tarjeta que un
 * resultado orgánico -- mismo tamaño, tipografía y bordes que el
 * resto de Columbus". Por eso esta tarjeta usa exactamente el mismo
 * estilo visual que una tarjeta de DestinosPopulares.tsx (foto de
 * fondo, degradado, nombre abajo) -- no un formato distinto.
 *
 * Etiqueta "Publicidad" (no "Patrocinado" -- texto exacto ya decidido
 * en esa misma sección), pequeña y discreta, nunca oculta.
 *
 * Componente real reutilizable (Fase 1, 16-ago-2026; ajustado en la
 * Fase 3 al conectar datos reales de campañas -- CampanaActiva no
 * trae descripción, solo nombre + creatividad ya diseñada).
 */
export function TarjetaPublicidadNativa({ nombreAnunciante, archivoUrl, href, onClic }: Props) {
  const contenido = (
    <div className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[385/178] w-full">
        {archivoUrl ? (
          <Image
            src={archivoUrl}
            alt={nombreAnunciante}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-cobalto-claro">
            <IconoPublicidad tamano={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/10 to-transparent" />
        <span className="absolute right-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white/90">
          Publicidad
        </span>
        <p className="absolute bottom-2 left-3 right-3 text-base font-bold leading-tight text-white sm:text-lg">
          {nombreAnunciante}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClic}
        className="block transition hover:-translate-y-0.5"
      >
        {contenido}
      </a>
    );
  }

  // Sin URL de destino real todavía (hallazgo real: CrearCampanaDto no
  // captura ningún campo de destino/landing del anunciante) -- se
  // registra el clic igual como métrica real, sin fingir un enlace.
  return (
    <button type="button" onClick={onClic} className="block w-full text-left transition hover:-translate-y-0.5">
      {contenido}
    </button>
  );
}
