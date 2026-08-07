"use client";

import { useEffect, useState } from "react";
import { listarMisLiquidaciones, type LiquidacionCooperativa } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Historial de liquidaciones propio (30-jul-2026, hallazgo real de la
 * auditoría): antes, la cooperativa no tenía ninguna forma de ver
 * cuánto se le debe o cuándo se le pagó sin pedírselo al admin de
 * plataforma cada vez. Solo lectura -- generar y marcar pagada siguen
 * siendo exclusivos del admin de plataforma.
 */
export default function LiquidacionesCoopPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionCooperativa[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarMisLiquidaciones(token)
      .then(setLiquidaciones)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }, []);

  const pendientes = liquidaciones?.filter((l) => l.estado === "pendiente") ?? [];
  const pagadas = liquidaciones?.filter((l) => l.estado === "pagada") ?? [];

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Liquidaciones</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Tu historial de liquidaciones — cuánto se te debe y cuándo se te ha pagado. La plataforma
        las genera según su calendario; aquí solo las consultas.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {liquidaciones === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {liquidaciones !== null && liquidaciones.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no tienes ninguna liquidación generada.
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark">Pendientes de pago</h2>
          <div className="mt-2 space-y-2">
            {pendientes.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-brand-amber/10 px-4 py-3 ring-1 ring-brand-amber/30"
              >
                <p className="text-sm text-brand-dark">
                  {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                </p>
                <p className="font-display text-lg font-bold text-brand-dark">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagadas.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Ya pagadas</h2>
          <div className="mt-2 space-y-2">
            {pagadas.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-brand-dark/70">
                    {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                  </p>
                  {l.pagadoEn && (
                    <p className="text-xs text-brand-dark/40">Pagada el {formatearFecha(l.pagadoEn)}</p>
                  )}
                </div>
                <p className="font-display text-lg font-bold text-brand-dark/40">
                  ${l.montoLiquidado.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
