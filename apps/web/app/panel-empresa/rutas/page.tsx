"use client";

import { useEffect, useState } from "react";
import { crearRutaCoop, listarRutasCoop, type PuntoOperacion, type RutaResumen } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { SelectorCiudad } from "@/components/SelectorCiudad";
import { Toast } from "@/components/Toast";

export default function RutasPage() {
  const [rutas, setRutas] = useState<RutaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [origen, setOrigen] = useState<PuntoOperacion | null>(null);
  const [destino, setDestino] = useState<PuntoOperacion | null>(null);
  const [precio, setPrecio] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  function cargarRutas() {
    const token = obtenerToken();
    if (!token) return;
    listarRutasCoop(token)
      .then(setRutas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las rutas."));
  }

  useEffect(cargarRutas, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !origen || !destino || !precio) {
      setErrorForm("Elige origen, destino y un precio base para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearRutaCoop(token, {
        origenPuntoOperacionId: origen.id,
        destinoPuntoOperacionId: destino.id,
        precioBaseReferencia: Number(precio),
        nombre: nombre.trim() || undefined,
      });
      const descripcion = nombre.trim() || `${origen.ciudad} → ${destino.ciudad}`;
      setOrigen(null);
      setDestino(null);
      setPrecio("");
      setNombre("");
      setMensajeExito(`Ruta "${descripcion}" creada correctamente.`);
      cargarRutas();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la ruta.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Rutas</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Las rutas que operas hoy — el precio base es el punto de partida; cada viaje puede ajustarlo.
        </p>
      </div>

      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde?" valor={origen} onCambio={setOrigen} />
        <SelectorCiudad etiqueta="Destino" placeholder="¿Hacia dónde?" valor={destino} onCambio={setDestino} />
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Precio base (USD)
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
          disabled={guardando}
          className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Crear ruta"}
        </button>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Nombre de la ruta (opcional)
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Machala - Guayaquil directo"
            className="w-full max-w-md rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        {errorForm && (
          <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{errorForm}</p>
        )}
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {rutas === null ? "Cargando..." : `${rutas.length} ruta${rutas.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {rutas !== null && rutas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no has creado ninguna ruta — usa el formulario de arriba.
          </p>
        )}

        {rutas !== null && rutas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Trayecto</th>
                <th className="px-6 py-3 text-right">Precio base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rutas.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">
                    {r.nombre ?? `${r.origenCiudad} → ${r.destinoCiudad}`}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {r.origenCiudad} → {r.destinoCiudad}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                      r.precioBaseReferencia,
                    )}
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
