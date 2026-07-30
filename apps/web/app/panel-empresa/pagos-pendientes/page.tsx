"use client";

import { useEffect, useState } from "react";
import {
  listarPagosPendientes,
  confirmarPagoManual,
  rechazarPagoManual,
  type PagoManualPendiente,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const ETIQUETAS_PROVEEDOR: Record<string, string> = {
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  deuna: "DeUna",
  payphone: "PayPhone",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TarjetaPago({
  pago,
  onProcesado,
  onError,
}: {
  pago: PagoManualPendiente;
  onProcesado: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    try {
      await confirmarPagoManual(token, pago.pagoId);
      onProcesado("Pago confirmado — el boleto ya está vigente.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setProcesando(false);
    }
  }

  async function rechazar() {
    const token = obtenerToken();
    if (!token) return;
    setProcesando(true);
    try {
      await rechazarPagoManual(token, pago.pagoId, motivo.trim() || undefined);
      onProcesado("Pago rechazado — el asiento quedó libre para otro pasajero.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo rechazar.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-brand-dark">{pago.compradorNombre}</p>
          <p className="text-sm text-brand-dark/60">
            {ETIQUETAS_PROVEEDOR[pago.proveedor] ?? pago.proveedor} · ${pago.monto.toFixed(2)}
          </p>
          <p className="text-xs text-brand-dark/40">Subido {formatearFecha(pago.creadoEn)}</p>
        </div>
      </div>

      {pago.comprobanteUrl && (
        <a
          href={pago.comprobanteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-lg ring-1 ring-black/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- comprobante subido por el usuario, no un asset local */}
          <img src={pago.comprobanteUrl} alt="Comprobante de pago" className="max-h-64 w-full object-contain bg-brand-light/20" />
        </a>
      )}

      {!rechazando ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={confirmar}
            disabled={procesando}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {procesando ? "Confirmando..." : "Confirmar pago"}
          </button>
          <button
            onClick={() => setRechazando(true)}
            disabled={procesando}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional) — ej. no coincide con el monto"
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <div className="flex gap-2">
            <button
              onClick={rechazar}
              disabled={procesando}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {procesando ? "Rechazando..." : "Confirmar rechazo"}
            </button>
            <button
              onClick={() => setRechazando(false)}
              className="rounded-lg border border-brand-light px-4 py-2 text-sm text-brand-dark/60 hover:bg-brand-light/40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PagosPendientesPage() {
  const [pagos, setPagos] = useState<PagoManualPendiente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarPagosPendientes(token)
      .then(setPagos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Pagos pendientes</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Boletos pagados por transferencia, efectivo, DeUna o PayPhone, esperando tu confirmación.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {pagos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {pagos !== null && pagos.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          No hay pagos pendientes de confirmar por ahora.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {pagos?.map((p) => (
          <TarjetaPago
            key={p.pagoId}
            pago={p}
            onProcesado={(mensaje) => {
              setMensajeExito(mensaje);
              cargar();
            }}
            onError={setError}
          />
        ))}
      </div>
    </main>
  );
}
