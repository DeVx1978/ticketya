"use client";

import { useEffect, useState } from "react";
import {
  generarLiquidacion,
  listarLiquidacionesAdmin,
  marcarLiquidacionPagada,
  type LiquidacionCooperativa,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Panel de Liquidaciones (30-jul-2026) -- el backend ya existía y
 * estaba probado desde el 28-jul, esto es solo la pantalla que
 * faltaba (hallazgo real de la auditoría de estado del proyecto).
 */
export default function LiquidacionesAdminPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionCooperativa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [cooperativaId, setCooperativaId] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [generando, setGenerando] = useState(false);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarLiquidacionesAdmin(token)
      .then(setLiquidaciones)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !cooperativaId.trim() || !periodoInicio || !periodoFin) return;
    setGenerando(true);
    setError(null);
    try {
      await generarLiquidacion(token, cooperativaId.trim(), periodoInicio, periodoFin);
      setMensajeExito("Liquidación generada.");
      setCooperativaId("");
      setPeriodoInicio("");
      setPeriodoFin("");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la liquidación.");
    } finally {
      setGenerando(false);
    }
  }

  async function marcarPagada(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await marcarLiquidacionPagada(token, id);
      setMensajeExito("Liquidación marcada como pagada.");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como pagada.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Liquidaciones</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Genera la liquidación de una cooperativa por período, y márcala como pagada cuando
        corresponda.
      </p>

      <form
        onSubmit={generar}
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-4 sm:items-end"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            ID de la cooperativa
          </label>
          <input
            type="text"
            value={cooperativaId}
            onChange={(e) => setCooperativaId(e.target.value)}
            placeholder="UUID de la cooperativa"
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Desde
          </label>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Hasta
          </label>
          <input
            type="date"
            value={periodoFin}
            onChange={(e) => setPeriodoFin(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="sm:col-span-4">
          {error && <p className="mb-2 text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={generando}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar liquidación"}
          </button>
        </div>
      </form>

      {liquidaciones === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {liquidaciones !== null && liquidaciones.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no se ha generado ninguna liquidación.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {liquidaciones?.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-brand-dark/50">Cooperativa: {l.cooperativaId}</p>
                <p className="text-sm font-semibold text-brand-dark">
                  {formatearFecha(l.periodoInicio)} — {formatearFecha(l.periodoFin)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  l.estado === "pagada"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {l.estado === "pagada" ? "Pagada" : "Pendiente"}
              </span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-brand-dark">
              ${l.montoLiquidado.toFixed(2)}
            </p>
            {l.estado === "pendiente" && (
              <button
                onClick={() => marcarPagada(l.id)}
                className="mt-2 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Marcar como pagada
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
