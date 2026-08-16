"use client";

import { IconoPublicidad } from "./ilustraciones/IconoPublicidad";

interface Props {
  /** Nombre real del anunciante -- mismo campo que ya usa CampanaPublicitaria en lib/api.ts. */
  nombreAnunciante: string;
  /** Texto corto de la campaña (oferta, descuento, mensaje). */
  descripcion: string;
  /** URL real del logo/imagen del anunciante, si la campaña ya tiene una subida.
   * Si no existe, se usa el ícono genérico -- nunca queda un espacio vacío ni roto. */
  archivoUrl?: string | null;
  /** A dónde lleva el clic -- opcional, para cuando la tarjeta es interactiva. */
  href?: string;
}

/**
 * Publicidad nativa, no invasiva -- decisión real del director
 * (15-ago-2026, sesión de exploración de diseño): estilo similar a
 * las tarjetas patrocinadas de redes sociales (Reels/Instagram) -- se
 * mezcla con el contenido normal de la página, con una etiqueta
 * pequeña "Patrocinado", nunca un banner que interrumpe.
 *
 * Componente real reutilizable (Fase 1, 16-ago-2026) -- reemplaza el
 * marcado suelto que existía solo en el documento de referencia HTML.
 */
export function TarjetaPublicidadNativa({ nombreAnunciante, descripcion, archivoUrl, href }: Props) {
  const contenido = (
    <div className="relative flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3">
      <span className="absolute right-3 top-2.5 rounded bg-[--color-brand-cobalto-claro] px-2 py-0.5 text-[10px] text-black/40">
        Patrocinado
      </span>
      {archivoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica de la campaña, no un asset local
        <img
          src={archivoUrl}
          alt={nombreAnunciante}
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <IconoPublicidad tamano={48} className="shrink-0" />
      )}
      <div>
        <p className="text-sm font-semibold text-brand-dark">{nombreAnunciante}</p>
        <p className="text-xs text-brand-dark/60">{descripcion}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="block max-w-md">
        {contenido}
      </a>
    );
  }

  return <div className="max-w-md">{contenido}</div>;
}
