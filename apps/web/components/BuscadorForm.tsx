"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectorCiudad } from "./SelectorCiudad";
import type { PuntoOperacion } from "@/lib/api";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BuscadorForm() {
  const router = useRouter();
  const [origen, setOrigen] = useState<PuntoOperacion | null>(null);
  const [destino, setDestino] = useState<PuntoOperacion | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  // Fase 7-idayvuelta (11-ago-2026) -- interruptor de ida y vuelta,
  // patron confirmado con investigacion real (AbhiBus/redBus, Wanderu):
  // el buscador pide ambas fechas desde el inicio, no se agrega
  // despues. fechaVuelta solo se usa si idaYVuelta esta activo.
  const [idaYVuelta, setIdaYVuelta] = useState(false);
  const [fechaVuelta, setFechaVuelta] = useState(hoyISO());
  const [pasajeros, setPasajeros] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!origen || !destino) {
      setError("Elige una ciudad de origen y una de destino de la lista.");
      return;
    }
    if (origen.id === destino.id) {
      setError("El origen y el destino no pueden ser la misma ciudad.");
      return;
    }
    if (idaYVuelta && fechaVuelta < fecha) {
      setError("La fecha de vuelta no puede ser antes que la fecha de ida.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      origenId: origen.id,
      origenCiudad: origen.ciudad,
      destinoId: destino.id,
      destinoCiudad: destino.ciudad,
      fecha,
      pasajeros: String(pasajeros),
    });
    if (idaYVuelta) {
      params.set("fechaVuelta", fechaVuelta);
    }
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form
      onSubmit={buscar}
      className="rounded-2xl bg-white/95 p-3 shadow-xl shadow-brand-dark/25 ring-1 ring-black/5 backdrop-blur-sm md:p-4"
    >
      <div
        role="group"
        aria-label="Tipo de viaje"
        className="mb-2 inline-flex overflow-hidden rounded-lg ring-1 ring-brand-light"
      >
        <button
          type="button"
          onClick={() => setIdaYVuelta(false)}
          aria-pressed={!idaYVuelta}
          className={`px-3 py-1 text-xs font-semibold transition ${
            !idaYVuelta ? "bg-brand text-white" : "bg-white text-brand-dark/60 hover:bg-brand-light/50"
          }`}
        >
          Solo ida
        </button>
        <button
          type="button"
          onClick={() => setIdaYVuelta(true)}
          aria-pressed={idaYVuelta}
          className={`px-3 py-1 text-xs font-semibold transition ${
            idaYVuelta ? "bg-brand text-white" : "bg-white text-brand-dark/60 hover:bg-brand-light/50"
          }`}
        >
          Ida y vuelta
        </button>
      </div>

      {/* Orden real del director (17-ago-2026): recrear el diseño de
          referencia -- barra compacta en una sola fila en pantalla
          grande (con divisores verticales, no cada campo flotando por
          separado), y también más compacta en celular (2 columnas en
          vez de 5 filas apiladas -- reduce la altura total real). */}
      <div className="grid grid-cols-2 gap-2 md:flex md:items-stretch md:divide-x md:divide-brand-light md:gap-0 md:rounded-lg md:ring-1 md:ring-brand-light">
        <div className="col-span-2 md:flex-1 md:px-3 md:py-1.5">
          <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde sales?" valor={origen} onCambio={setOrigen} compacto />
        </div>
        <div className="col-span-2 md:flex-1 md:px-3 md:py-1.5">
          <SelectorCiudad etiqueta="Destino" placeholder="¿A dónde vas?" valor={destino} onCambio={setDestino} compacto />
        </div>
        <div className="md:px-3 md:py-1.5">
          <label htmlFor="buscador-fecha" className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-dark/50">
            {idaYVuelta ? "Fecha de ida" : "Fecha"}
          </label>
          <input
            id="buscador-fecha"
            type="date"
            value={fecha}
            min={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-2.5 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium md:w-32 md:border-0 md:p-0 md:focus:ring-0"
          />
        </div>
        {idaYVuelta && (
          <div className="md:px-3 md:py-1.5">
            <label htmlFor="buscador-fecha-vuelta" className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-dark/50">
              Fecha de vuelta
            </label>
            <input
              id="buscador-fecha-vuelta"
              type="date"
              value={fechaVuelta}
              min={fecha}
              onChange={(e) => setFechaVuelta(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-2.5 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium md:w-32 md:border-0 md:p-0 md:focus:ring-0"
            />
          </div>
        )}
        <div className="md:px-3 md:py-1.5">
          <label htmlFor="buscador-pasajeros" className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-dark/50">
            Pasajeros
          </label>
          <input
            id="buscador-pasajeros"
            type="number"
            min={1}
            max={10}
            value={pasajeros}
            onChange={(e) => setPasajeros(Number(e.target.value))}
            className="w-full rounded-lg border border-brand-light bg-white px-2.5 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium md:w-20 md:border-0 md:p-0 md:focus:ring-0"
          />
        </div>
        <button
          type="submit"
          className="col-span-2 shrink-0 rounded-lg bg-brand-amber px-6 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 md:col-span-1 md:m-1.5 md:rounded-lg"
        >
          Buscar pasajes
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
