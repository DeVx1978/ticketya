"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  crearViajeCoop,
  listarRutasCoop,
  listarUnidadesCoop,
  listarViajesCoop,
  cancelarViajeCoop,
  cambiarUnidadViajeCoop,
  editarViajeCoop,
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

function BotonEditarViaje({
  viaje,
  onEditado,
  onError,
}: {
  viaje: ViajeCoopResumen;
  onEditado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const horaActual = new Date(viaje.horaSalidaProgramada).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Guayaquil",
  });
  const [hora, setHora] = useState(horaActual);
  const [precio, setPrecio] = useState(String(viaje.precioBase));
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await editarViajeCoop(token, viaje.id, {
        horaSalidaProgramada: `${viaje.fechaSalida}T${hora}:00-05:00`,
        precioBase: Number(precio),
      });
      onEditado();
      setAbierto(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo editar el viaje.");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs font-semibold text-brand-dark/70 hover:underline"
      >
        Editar
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        className="w-24 rounded border border-brand-light px-1.5 py-1 text-xs"
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        className="w-16 rounded border border-brand-light px-1.5 py-1 text-xs"
      />
      <button
        onClick={confirmar}
        disabled={guardando}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        ✓
      </button>
      <button
        onClick={() => setAbierto(false)}
        className="rounded border border-brand-light px-2 py-1 text-xs text-brand-dark/60 hover:bg-brand-light/40"
      >
        ✕
      </button>
    </div>
  );
}

function BotonCambiarUnidad({
  viajeId,
  unidades,
  onCambiado,
  onError,
}: {
  viajeId: string;
  unidades: UnidadResumen[];
  onCambiado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [unidadElegida, setUnidadElegida] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    const token = obtenerToken();
    if (!token || !unidadElegida) return;
    setGuardando(true);
    try {
      await cambiarUnidadViajeCoop(token, viajeId, unidadElegida);
      onCambiado();
      setAbierto(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cambiar la unidad.");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs font-semibold text-brand-dark/70 hover:underline"
      >
        Cambiar unidad
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <select
        value={unidadElegida}
        onChange={(e) => setUnidadElegida(e.target.value)}
        className="rounded border border-brand-light px-1.5 py-1 text-xs"
      >
        <option value="">Elige unidad...</option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.placa}
          </option>
        ))}
      </select>
      <button
        onClick={confirmar}
        disabled={guardando || !unidadElegida}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        ✓
      </button>
      <button
        onClick={() => setAbierto(false)}
        className="rounded border border-brand-light px-2 py-1 text-xs text-brand-dark/60 hover:bg-brand-light/40"
      >
        ✕
      </button>
    </div>
  );
}

function BotonCancelarViaje({
  viajeId,
  onCancelado,
  onError,
}: {
  viajeId: string;
  onCancelado: (boletosCancelados: number) => void;
  onError: (mensaje: string) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setCancelando(true);
    try {
      const { boletosCancelados } = await cancelarViajeCoop(token, viajeId);
      onCancelado(boletosCancelados);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cancelar el viaje.");
    } finally {
      setCancelando(false);
      setConfirmando(false);
    }
  }

  if (confirmando) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-brand-dark/60">¿Cancelar?</span>
        <button
          onClick={confirmar}
          disabled={cancelando}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {cancelando ? "..." : "Sí"}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="rounded-lg border border-brand-light px-2.5 py-1 text-xs text-brand-dark/60 hover:bg-brand-light/40"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="text-xs font-semibold text-red-600 hover:underline"
    >
      Cancelar viaje
    </button>
  );
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
  const [mensajeError, setMensajeError] = useState<string | null>(null);

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
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el viaje.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  const faltaConfigurar = rutas !== null && unidades !== null && (rutas.length === 0 || unidades.length === 0);

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
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
            {unidades
              ?.filter((u) => u.activo)
              .map((u) => (
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
                <th className="px-6 py-3"></th>
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
                  <td className="px-6 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Link
                        href={`/panel-empresa/viajes/${v.id}/pasajeros`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Ver pasajeros
                      </Link>
                      {v.estado === "programado" && (
                        <>
                          <BotonEditarViaje
                            viaje={v}
                            onEditado={() => {
                              setMensajeExito("Viaje actualizado.");
                              cargarTodo();
                            }}
                            onError={setMensajeError}
                          />
                          <BotonCambiarUnidad
                            viajeId={v.id}
                            unidades={(unidades ?? []).filter((u) => u.activo)}
                            onCambiado={() => {
                              setMensajeExito("Unidad del viaje actualizada — los boletos ya vendidos no se vieron afectados.");
                              cargarTodo();
                            }}
                            onError={setMensajeError}
                          />
                          <BotonCancelarViaje
                            viajeId={v.id}
                            onCancelado={(boletosCancelados) => {
                              setMensajeExito(
                                `Viaje cancelado — ${boletosCancelados} boleto${boletosCancelados === 1 ? "" : "s"} cancelado${boletosCancelados === 1 ? "" : "s"} automáticamente.`,
                              );
                              cargarTodo();
                            }}
                            onError={setMensajeError}
                          />
                        </>
                      )}
                    </div>
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
