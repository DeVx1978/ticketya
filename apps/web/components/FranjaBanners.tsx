"use client";

import { useEffect, useState } from "react";
import { listarBannersActivos, type BannerPropio } from "@/lib/api";

/**
 * Franja de banners propios en la portada — promoción interna (DevX,
 * Surebets24/7, el terminal, etc.), ver 22-jul-2026. Si no hay ninguno
 * activo, no se renderiza nada — nunca deja un espacio vacío feo.
 */
export function FranjaBanners() {
  const [banners, setBanners] = useState<BannerPropio[]>([]);

  useEffect(() => {
    listarBannersActivos()
      .then(setBanners)
      .catch(() => {
        /* si falla, simplemente no se muestra la franja — no es contenido crítico */
      });
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {banners.map((b) => (
          <a
            key={b.id}
            href={b.enlaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 transition hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
            <img src={b.imagenUrl} alt={b.titulo} className="h-28 w-56 object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}
