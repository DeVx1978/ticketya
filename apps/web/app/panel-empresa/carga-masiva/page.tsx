"use client";

import { useState } from "react";
import { importarDatosCoop, type ResultadoImportacion } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const EJEMPLO = `{
  "tiposVehiculo": [
    { "ref": "tipo1", "nombre": "Bus 40 asientos", "capacidadTotal": 40 }
  ],
  "conductores": [
    { "nombreCompleto": "Juan Pérez", "cedula": "0912345678" }
  ],
  "unidades": [
    { "tipoVehiculoRef": "tipo1", "placa": "ABC-1234", "identificadorOperativo": "Unidad 1" }
  ],
  "rutas": [
    { "ref": "ruta1", "origenPuntoOperacionId": "...", "destinoPuntoOperacionId": "...", "precioBaseReferencia": 8.5, "nombre": "Machala - Guayaquil" }
  ],
  "horarios": [
    { "rutaRef": "ruta1", "tipoVehiculoRef": "tipo1", "horaSalida": "08:00", "diasSemana": [1, 2, 3, 4, 5] }
  ],
  "generarViajesDesde": "2026-09-01",
  "generarViajesHasta": "2026-09-30"
}`;

/**
 * Carga masiva (RF-COOP-008), ítem 8 (04-ago-2026). Pantalla simple a
 * propósito (decisión del director): el mismo JSON que ya acepta el
 * backend, pegado directo -- sin un formulario estructurado. Pensado
 * para cuando la cooperativa ya tiene su flota/rutas en un sistema
 * propio y las exporta a este formato, no para tipeo manual campo por
 * campo (eso ya existe en las pantallas de Rutas/Unidades/Personal).
 */
export default function CargaMasivaPage() {
  const [json, setJson] = useState(EJEMPLO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    const token = obtenerToken();
    if (!token) return;

    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      setError("Eso no es JSON válido -- revisa comas, comillas y llaves.");
      return;
    }

    setEnviando(true);
    try {
      const res = await importarDatosCoop(token, payload);
      setResultado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la carga masiva.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Carga masiva</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Sube tipos de vehículo, conductores, unidades, rutas y horarios de una sola vez, en vez
          de crear cada uno a mano. Si incluyes <code className="text-xs">generarViajesDesde</code>{" "}
          y <code className="text-xs">generarViajesHasta</code>, también se generan los viajes
          reales de esos horarios en ese rango automáticamente.
        </p>
      </div>

      <form onSubmit={enviar} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <label htmlFor="carga-masiva-json" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          JSON a importar
        </label>
        <textarea
          id="carga-masiva-json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={20}
          spellCheck={false}
          className="w-full rounded-lg border border-brand-light bg-brand-light/10 px-3 py-2.5 font-mono text-xs text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
        />
        <p className="mt-2 text-xs text-brand-dark/50">
          <code>tipoVehiculoRef</code> en cada horario es obligatorio -- sin eso, ese horario nunca
          podría generar viajes automáticos después.
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {resultado && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-200 sm:grid-cols-3">
            <div>
              <p className="text-xs text-emerald-700">Tipos de vehículo</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.tiposVehiculoCreados}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Conductores</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.conductoresCreados}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Unidades</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.unidadesCreadas}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Rutas</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.rutasCreadas}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Horarios</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.horariosCreados}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Viajes generados</p>
              <p className="font-display text-xl font-bold text-emerald-900">
                {resultado.viajesGenerados}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-4 rounded-lg bg-brand-amber px-5 py-2.5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
        >
          {enviando ? "Procesando..." : "Importar"}
        </button>
      </form>
    </div>
  );
}
