"use client";

import { useEffect, useState } from "react";
import { obtenerSaldoWallet, listarMovimientosWallet, type MovimientoWallet } from "@/lib/api";
import { tokenValido } from "@/lib/auth";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ETIQUETAS_TIPO: Record<string, { texto: string; positivo: boolean }> = {
  credito_cashback: { texto: "Cashback ganado", positivo: true },
  credito_referido: { texto: "Crédito por referido", positivo: true },
  debito_compra: { texto: "Usado en una compra", positivo: false },
};

/**
 * Hallazgo real del director (15-ago-2026, recorrido en vivo de
 * producción): el wallet ya funcionaba de punta a punta en el backend
 * (ganar cashback, gastarlo en una compra, ganar por referidos) desde
 * hacía días -- el pasajero simplemente nunca tuvo dónde verlo. Este
 * es el primer lugar real donde existe.
 */
export function TabWallet() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoWallet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    Promise.all([obtenerSaldoWallet(token), listarMovimientosWallet(token)])
      .then(([s, m]) => {
        setSaldo(s);
        setMovimientos(m);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar tu wallet."));
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-6">
      <div className="overflow-hidden rounded-2xl bg-brand-dark lg:sticky lg:top-6">
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Saldo disponible</p>
          <p className="mt-1 font-display text-4xl font-bold text-brand-amber">
            {saldo === null ? "—" : `$${saldo.toFixed(2)}`}
          </p>
          <p className="mt-2 text-xs text-white/40">
            Gana cashback cada vez que viajas, y úsalo para pagar tu próximo pasaje.
          </p>
        </div>
      </div>

      <div className="mt-6 lg:mt-0">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {movimientos === null && !error && <p className="text-sm text-brand-dark/50">Cargando...</p>}

        {movimientos !== null && movimientos.length === 0 && (
          <p className="text-center text-sm text-brand-dark/50">
            Todavía no tienes movimientos — aparecerán aquí cuando ganes cashback en un viaje, o cuando lo
            uses para pagar uno.
          </p>
        )}

        {movimientos !== null && movimientos.length > 0 && (
          <>
            <h2 className="font-display text-sm font-bold text-brand-dark">Historial</h2>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {movimientos.map((m) => {
                const etiqueta = ETIQUETAS_TIPO[m.tipo] ?? { texto: m.tipo, positivo: m.monto >= 0 };
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-brand-light/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-brand-dark">{etiqueta.texto}</p>
                      <p className="text-xs text-brand-dark/50">{formatearFecha(m.creadoEn)}</p>
                    </div>
                    <p
                      className={`font-display text-lg font-bold ${
                        etiqueta.positivo ? "text-emerald-600" : "text-brand-dark/50"
                      }`}
                    >
                      {etiqueta.positivo ? "+" : "-"}${Math.abs(m.monto).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
