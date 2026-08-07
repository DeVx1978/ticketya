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
    setError(null);
    const params = new URLSearchParams({
      origenId: origen.id,
      origenCiudad: origen.ciudad,
      destinoId: destino.id,
      destinoCiudad: destino.ciudad,
      fecha,
      pasajeros: String(pasajeros),
    });
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form
      onSubmit={buscar}
      className="rounded-2xl bg-white p-4 shadow-xl shadow-brand-dark/20 ring-1 ring-black/5 md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde sales?" valor={origen} onCambio={setOrigen} />
        <SelectorCiudad etiqueta="Destino" placeholder="¿A dónde vas?" valor={destino} onCambio={setDestino} />
        <div className="w-full md:w-40">
          <label htmlFor="buscador-fecha" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Fecha
          </label>
          <input
            id="buscador-fecha"
            type="date"
            value={fecha}
            min={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="w-full md:w-28">
          <label htmlFor="buscador-pasajeros" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Pasajeros
          </label>
          <input
            id="buscador-pasajeros"
            type="number"
            min={1}
            max={10}
            value={pasajeros}
            onChange={(e) => setPasajeros(Number(e.target.value))}
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <button
          type="submit"
          className="w-full shrink-0 rounded-lg bg-brand px-6 py-2.5 text-base font-semibold text-white transition hover:bg-brand-dark md:w-auto"
        >
          Buscar pasajes
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
