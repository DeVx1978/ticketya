"use client";

import { useEffect, useState } from "react";
import {
  listarPublicidadActiva,
  registrarImpresionPublicidad,
  registrarClicPublicidad,
  type CampanaActiva,
} from "@/lib/api";
import { TarjetaPublicidadNativa } from "./TarjetaPublicidadNativa";

/**
 * Fase 3 de la sesión de frontend (16-ago-2026) -- conecta por primera
 * vez el backend real de publicidad (`/publicidad/activas`, cerrado y
 * probado desde el 30-jul-2026, documentado en DOCUMENTO_MAESTRO.md
 * sección 3.9) al frontend público. Mismo patrón real que se repitió
 * con wallet/referidos: backend completo, nunca consumido.
 *
 * Convención real de "ubicación" para este espacio (campo de texto
 * libre en el panel admin, sin catálogo cerrado): "portada_tarjeta_nativa".
 * Si no hay ninguna campaña activa aprobada para esa ubicación, este
 * componente no renderiza nada -- nunca un espacio vacío ni roto.
 */
const UBICACION = "portada_tarjeta_nativa";

export function PublicidadNativa() {
  const [campana, setCampana] = useState<CampanaActiva | null>(null);

  useEffect(() => {
    listarPublicidadActiva(UBICACION).then((campanas) => {
      if (campanas.length > 0) {
        setCampana(campanas[0]);
        // Impresión real, una sola vez, al mostrarse -- no en cada
        // re-render (el array vacío de dependencias abajo lo garantiza).
        registrarImpresionPublicidad(campanas[0].campanaId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!campana) return null;

  return (
    <div className="w-[300px] shrink-0 snap-start">
      <TarjetaPublicidadNativa
        nombreAnunciante={campana.nombreAnunciante}
        archivoUrl={campana.archivoUrl}
        onClic={() => registrarClicPublicidad(campana.campanaId)}
      />
    </div>
  );
}
