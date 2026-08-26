"use client";

import { useEffect, useState } from "react";
import {
  listarSolicitudesFactura,
  marcarFacturaEmitida,
  type SolicitudFactura,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TarjetaSolicitud({
  solicitud,
  onEmitida,
  onError,
}: {
  solicitud: SolicitudFactura;
  onEmitida: () => void;
  onError: (m: string) => void;
}) {
  const [urlFactura, setUrlFactura] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function marcarEmitida() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await marcarFacturaEmitida(token, solicitud.id, urlFactura.trim() || undefined);
      onEmitida();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo marcar como emitida.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-brand-dark">{solicitud.pasajeroNombre}</p>
          <p className="text-xs text-brand-dark/40">
            Solicitado {formatearFecha(solicitud.creadoEn)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            solicitud.estado === "emitida"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {solicitud.estado === "emitida" ? "Emitida" : "Pendiente"}
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-brand-light/30 p-3 text-sm text-brand-dark">
        {Object.entries(solicitud.datosTributarios).map(([clave, valor]) => (
          <p key={clave}>
            <span className="text-brand-dark/50 capitalize">{clave}: </span>
            <span className="font-semibold">{valor}</span>
          </p>
        ))}
      </div>

      {solicitud.estado === "pendiente" ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={urlFactura}
            onChange={(e) => setUrlFactura(e.target.value)}
            placeholder="Link a la factura (opcional)"
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            onClick={marcarEmitida}
            disabled={guardando}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Marcar como emitida"}
          </button>
        </div>
      ) : (
        solicitud.urlFactura && (
          <a
            href={solicitud.urlFactura}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
          >
            Ver factura
          </a>
        )
      )}
    </div>
  );
}

export default function SolicitudesFacturaPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudFactura[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarSolicitudesFactura(token)
      .then(setSolicitudes)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pendientes = solicitudes?.filter((s) => s.estado === "pendiente") ?? [];
  const emitidas = solicitudes?.filter((s) => s.estado === "emitida") ?? [];

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Solicitudes de factura</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Pasajeros que pidieron la factura de su pasaje — la emites en tu propio sistema contable y
        la marcas aquí como lista.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {solicitudes === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {solicitudes !== null && solicitudes.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no hay ninguna solicitud de factura.
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="mt-6 space-y-3">
          {pendientes.map((s) => (
            <TarjetaSolicitud
              key={s.id}
              solicitud={s}
              onEmitida={() => {
                setMensajeExito("Factura marcada como emitida.");
                cargar();
              }}
              onError={setError}
            />
          ))}
        </div>
      )}

      {emitidas.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Ya emitidas</h2>
          <div className="mt-2 space-y-3">
            {emitidas.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} onEmitida={cargar} onError={setError} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
