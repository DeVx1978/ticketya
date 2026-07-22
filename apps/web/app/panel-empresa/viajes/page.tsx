"use client";

import { useEffect, useState } from "react";
import {
  crearViajeCoop,
  listarRutasCoop,
  listarUnidadesCoop,
  listarViajesCoop,
  type RutaResumen,
  type UnidadResumen,
  type ViajeCoopResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

const ESTADO_ESTILO: Record<string, string> = {
  programado: "bg-brand-light text-brand",
  en_curso: "bg-amber-100 text-amber-700",
  finalizado: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
};

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

export default function ViajesPage() {
  const [rutas, setRutas] = useState<RutaResumen[] | null>(null);
  const [unidades, setUnidades] = useState<UnidadResumen[] | null>(null);
  const [viajes, setViajes] = useState<ViajeCoopResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [rutaElegida, setRutaElegida] = useState("");
  const [unidadElegida, setUnidadElegida] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  function cargarTodo() {
    const token = obtenerToken();
    if (!token) return;
    Promise.all([listarRutasCoop(token), listarUnidadesCoop(token), listarViajesCoop(token)])
      .then(([r, u, v]) => {
        setRutas(r);
        setUnidades(u);
        setViajes(v);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."));
  }

  useEffect(cargarTodo, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !rutaElegida || !unidadElegida || !fecha || !hora || !precio) {
      setErrorForm("Completa ruta, unidad, fecha, hora y precio para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearViajeCoop(token, {
        rutaId: rutaElegida,
        unidadId: unidadElegida,
        fechaSalida: fecha,
        horaSalidaProgramada: `${fecha}T${hora}:00-05:00`,
        precioBase: Number(precio),
      });
      setFecha("");
      setHora("");
      setPrecio("");
      setMensajeExito("Viaje programado correctamente.");
      cargarTodo();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "No se pudo crear el viaje.");
    } finally {
      setGuardando(false);
    }
  }

  const faltaConfigurar = rutas !== null && unidades !== null && (rutas.length === 0 || unidades.length === 0);

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Viajes</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Cada viaje programado aquí es el que un pasajero ve al buscar — con la misma ruta, unidad y precio.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {faltaConfigurar && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
          Antes de crear un viaje necesitas al menos una ruta y una unidad — revisa las pestañas
          &quot;Rutas&quot; y &quot;Unidades&quot;.
        </div>
      )}

      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Ruta
          </label>
          <select
            value={rutaElegida}
            onChange={(e) => setRutaElegida(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecciona...</option>
            {rutas?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre ?? `${r.origenCiudad} → ${r.destinoCiudad}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Unidad
          </label>
          <select
            value={unidadElegida}
            onChange={(e) => setUnidadElegida(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          >
            <option value="">Selecciona...</option>
            {unidades?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.placa} — {u.tipoVehiculoNombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Hora de salida
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Precio (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="8.50"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <button
          type="submit"
          disabled={guardando || faltaConfigurar}
          className="lg:col-span-5 h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Crear viaje"}
        </button>
        {errorForm && <p className="lg:col-span-5 text-sm font-medium text-red-600">{errorForm}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {viajes === null ? "Cargando..." : `${viajes.length} viaje${viajes.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {viajes !== null && viajes.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no has programado ningún viaje.
          </p>
        )}

        {viajes !== null && viajes.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Fecha y hora</th>
                <th className="px-6 py-3">Unidad</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {viajes.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{v.rutaNombre}</td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {v.fechaSalida} —{" "}
                    {new Date(v.horaSalidaProgramada).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Guayaquil",
                    })}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {v.unidadPlaca} · {v.tipoVehiculoNombre}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_ESTILO[v.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(v.precioBase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
