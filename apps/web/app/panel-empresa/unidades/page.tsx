"use client";

import { useEffect, useState } from "react";
import {
  crearTipoVehiculoCoop,
  crearUnidadCoop,
  listarTiposVehiculoCoop,
  listarUnidadesCoop,
  actualizarEstadoUnidadCoop,
  type TipoVehiculoResumen,
  type UnidadResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function BotonEstadoUnidad({
  unidad,
  onCambiado,
  onError,
}: {
  unidad: UnidadResumen;
  onCambiado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);

  async function alternar() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    try {
      await actualizarEstadoUnidadCoop(token, unidad.id, !unidad.activo);
      onCambiado();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo actualizar la unidad.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={guardando}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition disabled:opacity-50 ${
        unidad.activo
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {unidad.activo ? "Activa" : "Inactiva"}
    </button>
  );
}

export default function UnidadesPage() {
  const [tipos, setTipos] = useState<TipoVehiculoResumen[] | null>(null);
  const [unidades, setUnidades] = useState<UnidadResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formulario: tipo de vehículo
  const [nombreTipo, setNombreTipo] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [guardandoTipo, setGuardandoTipo] = useState(false);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);

  // Formulario: unidad
  const [tipoElegido, setTipoElegido] = useState("");
  const [placa, setPlaca] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [guardandoUnidad, setGuardandoUnidad] = useState(false);
  const [errorUnidad, setErrorUnidad] = useState<string | null>(null);

  function cargarTodo() {
    const token = obtenerToken();
    if (!token) return;
    Promise.all([listarTiposVehiculoCoop(token), listarUnidadesCoop(token)])
      .then(([t, u]) => {
        setTipos(t);
        setUnidades(u);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."));
  }

  useEffect(cargarTodo, []);

  async function crearTipo(e: React.FormEvent) {
    e.preventDefault();
    setErrorTipo(null);
    const token = obtenerToken();
    if (!token || !nombreTipo.trim() || !capacidad) {
      setErrorTipo("Escribe un nombre y una capacidad.");
      return;
    }
    setGuardandoTipo(true);
    try {
      await crearTipoVehiculoCoop(token, { nombre: nombreTipo.trim(), capacidadTotal: Number(capacidad) });
      setMensajeExito(`Tipo de vehículo "${nombreTipo.trim()}" creado correctamente.`);
      setNombreTipo("");
      setCapacidad("");
      cargarTodo();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el tipo de vehículo.";
      setErrorTipo(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoTipo(false);
    }
  }

  async function crearUnidad(e: React.FormEvent) {
    e.preventDefault();
    setErrorUnidad(null);
    const token = obtenerToken();
    if (!token || !tipoElegido || !placa.trim() || !identificador.trim()) {
      setErrorUnidad("Elige el tipo de vehículo y completa placa e identificador operativo.");
      return;
    }
    setGuardandoUnidad(true);
    try {
      await crearUnidadCoop(token, {
        tipoVehiculoId: tipoElegido,
        placa: placa.trim(),
        identificadorOperativo: identificador.trim(),
      });
      setPlaca("");
      setIdentificador("");
      setMensajeExito(`Unidad "${placa.trim()}" registrada correctamente.`);
      cargarTodo();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la unidad.";
      setErrorUnidad(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoUnidad(false);
    }
  }

  return (
    <div className="space-y-8">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Unidades</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Primero define los tipos de vehículo que operas (bus estándar, buseta, doble piso...), y luego
          registra cada unidad física con su placa y su identificador operativo.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* ─── Tipos de vehículo ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Tipos de vehículo</h2>

        <form
          onSubmit={crearTipo}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-3 sm:items-end"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Nombre
            </label>
            <input
              type="text"
              value={nombreTipo}
              onChange={(e) => setNombreTipo(e.target.value)}
              placeholder="Ej. Bus estándar 2+2"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Capacidad (asientos)
            </label>
            <input
              type="number"
              min="1"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              placeholder="40"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoTipo}
            className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {guardandoTipo ? "Guardando..." : "Crear tipo de vehículo"}
          </button>
          {errorTipo && <p className="sm:col-span-3 text-sm font-medium text-red-600">{errorTipo}</p>}
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {tipos !== null && tipos.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              Todavía no has creado ningún tipo de vehículo.
            </p>
          )}
          {tipos !== null && tipos.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3 text-right">Capacidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{t.nombre}</td>
                    <td className="px-6 py-3 text-right text-brand-dark/70">{t.capacidadTotal} asientos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ─── Unidades ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Unidades</h2>

        <form
          onSubmit={crearUnidad}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Tipo de vehículo
            </label>
            <select
              value={tipoElegido}
              onChange={(e) => setTipoElegido(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="">Selecciona...</option>
              {tipos?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Placa
            </label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              placeholder="ABC-1234"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Identificador operativo (disco)
            </label>
            <input
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Disco 07"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoUnidad || !tipos?.length}
            className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {guardandoUnidad ? "Guardando..." : "Crear unidad"}
          </button>
          {!tipos?.length && tipos !== null && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-brand-dark/50">
              Crea primero al menos un tipo de vehículo arriba.
            </p>
          )}
          {errorUnidad && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{errorUnidad}</p>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {unidades !== null && unidades.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              Todavía no has registrado ninguna unidad.
            </p>
          )}
          {unidades !== null && unidades.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                <tr>
                  <th className="px-6 py-3">Placa</th>
                  <th className="px-6 py-3">Identificador operativo</th>
                  <th className="px-6 py-3">Tipo de vehículo</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {unidades.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{u.placa}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{u.identificadorOperativo}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{u.tipoVehiculoNombre}</td>
                    <td className="px-6 py-3">
                      <BotonEstadoUnidad
                        unidad={u}
                        onCambiado={() => {
                          setMensajeExito(u.activo ? "Unidad desactivada." : "Unidad activada.");
                          cargarTodo();
                        }}
                        onError={setMensajeError}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
