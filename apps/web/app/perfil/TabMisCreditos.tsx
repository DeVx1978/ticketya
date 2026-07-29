"use client";

import { useEffect, useState } from "react";
import { listarMisCreditos, type MiCredito } from "@/lib/api";
import { tokenValido } from "@/lib/auth";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Vacío real de diseño encontrado el 29-jul-2026: el crédito de
 * reprogramación existía desde el 28-jul, pero el pasajero no tenía
 * ningún lugar dedicado donde ver su historial completo (disponibles
 * y ya usados) — antes solo aparecía como un banner de "disponibles"
 * arriba de Mis boletos.
 */
export function TabMisCreditos() {
  const [creditos, setCreditos] = useState<MiCredito[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisCreditos(token)
      .then(setCreditos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus créditos."));
  }, []);

  const disponibles = creditos?.filter((c) => !c.usadoEn) ?? [];
  const usados = creditos?.filter((c) => c.usadoEn) ?? [];

  return (
    <>
      <p className="text-sm text-brand-dark/60">
        El saldo que te queda cuando reprogramas un boleto a un pasaje más barato. Se usa eligiéndolo
        en el checkout de tu próxima compra con esa misma cooperativa.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {creditos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {creditos !== null && creditos.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no tienes ningún crédito — aparecerá aquí si reprogramas un boleto a un pasaje más
          barato.
        </p>
      )}

      {disponibles.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark">Disponibles</h2>
          <div className="mt-2 space-y-2">
            {disponibles.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-brand-amber/10 px-4 py-3 ring-1 ring-brand-amber/30"
              >
                <div>
                  <p className="font-semibold text-brand-dark">{c.cooperativaNombre}</p>
                  <p className="text-xs text-brand-dark/50">Desde {formatearFecha(c.creadoEn)}</p>
                </div>
                <p className="font-display text-lg font-bold text-brand-dark">${c.monto.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {usados.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Ya usados</h2>
          <div className="mt-2 space-y-2">
            {usados.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-dark/60">{c.cooperativaNombre}</p>
                  <p className="text-xs text-brand-dark/40">
                    Usado el {formatearFecha(c.usadoEn!)}
                  </p>
                </div>
                <p className="font-display text-lg font-bold text-brand-dark/40">
                  ${c.monto.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
