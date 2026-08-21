"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectorCiudad } from "./SelectorCiudad";
import { CampoFecha } from "./CampoFecha";
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
      className="rounded-2xl bg-brand-dark/40 p-3 shadow-xl shadow-black/30 ring-1 ring-white/15 backdrop-blur-md md:w-fit md:p-4"
    >
      <div
        role="group"
        aria-label="Tipo de viaje"
        className="mb-2 inline-flex overflow-hidden rounded-lg ring-1 ring-white/20"
      >
        <button
          type="button"
          onClick={() => setIdaYVuelta(false)}
          aria-pressed={!idaYVuelta}
          className={`px-3 py-1 text-xs font-semibold transition ${
            !idaYVuelta ? "bg-brand text-white" : "bg-transparent text-white/60 hover:bg-white/10"
          }`}
        >
          Solo ida
        </button>
        <button
          type="button"
          onClick={() => setIdaYVuelta(true)}
          aria-pressed={idaYVuelta}
          className={`px-3 py-1 text-xs font-semibold transition ${
            idaYVuelta ? "bg-brand text-white" : "bg-transparent text-white/60 hover:bg-white/10"
          }`}
        >
          Ida y vuelta
        </button>
      </div>

      {/* Orden real del director (17-ago-2026): recrear el diseño de
          referencia -- barra compacta en una sola fila en pantalla
          grande (con divisores verticales, no cada campo flotando por
          separado), y también más compacta en celular (2 columnas en
          vez de 5 filas apiladas -- reduce la altura total real).

          Bug real encontrado y corregido (21-ago-2026, ver sección
          5.48 del DOCUMENTO_MAESTRO): PR #143 había cambiado esto a
          `md:inline-flex md:w-fit` para quitar el hueco vacío a la
          derecha del botón -- pero `inline-flex` no solo acomoda los
          hijos, también vuelve este `<div>` un elemento EN LÍNEA
          (como un `<span>`), y el interruptor de arriba también lo
          es -- dos elementos en línea seguidos se acomodan uno al
          lado del otro, no uno debajo del otro. Por eso el
          interruptor "Solo ida/Ida y vuelta" quedó al lado de la
          barra en vez de arriba. Corregido con `md:flex` (display de
          bloque, se sigue apilando abajo del interruptor como
          siempre debió ser) + `md:w-fit` (se mantiene, sigue sin
          estirarse de más -- eso sí funcionaba bien).

          Segundo hallazgo real, encontrado al verificar con captura
          (no se veía solo revisando el código): con el interruptor ya
          apilado correctamente, el hueco vacío reportado por el
          director SEGUÍA ahí -- el `<form>` exterior (el que envuelve
          tanto el interruptor como esta barra) nunca tuvo un ancho
          ajustado a su contenido, solo la barra interna lo tenía. Se
          le agregó `md:w-fit` también al `<form>` (más arriba en este
          archivo). */}
      <div className="grid grid-cols-2 gap-2 md:flex md:w-fit md:items-stretch md:divide-x md:divide-white/15 md:gap-0 md:rounded-lg md:ring-1 md:ring-white/20">
        <div className="col-span-2 md:max-w-64 md:flex-1 md:px-3 md:py-1.5">
          <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde sales?" valor={origen} onCambio={setOrigen} compacto />
        </div>
        <div className="col-span-2 md:max-w-64 md:flex-1 md:px-3 md:py-1.5">
          <SelectorCiudad etiqueta="Destino" placeholder="¿A dónde vas?" valor={destino} onCambio={setDestino} compacto />
        </div>
        <div className="md:px-3 md:py-1.5">
          <CampoFecha
            etiqueta={idaYVuelta ? "Fecha de ida" : "Fecha"}
            valor={fecha}
            minimo={hoyISO()}
            onCambio={(v) => setFecha(v)}
          />
        </div>
        {idaYVuelta && (
          <div className="md:px-3 md:py-1.5">
            <CampoFecha etiqueta="Fecha de vuelta" valor={fechaVuelta} minimo={fecha} onCambio={(v) => setFechaVuelta(v)} />
          </div>
        )}
        <div className="md:px-3 md:py-1.5">
          <label htmlFor="buscador-pasajeros" className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-white/60">
            Pasajeros
          </label>
          <input
            id="buscador-pasajeros"
            type="number"
            min={1}
            max={10}
            value={pasajeros}
            onChange={(e) => setPasajeros(Number(e.target.value))}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-medium md:w-20 md:border-0 md:bg-transparent md:p-0 md:focus:ring-0"
          />
        </div>
        <button
          type="submit"
          className="col-span-2 shrink-0 rounded-lg bg-brand-amber px-6 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 md:col-span-1 md:m-1.5 md:rounded-lg"
        >
          Buscar pasajes
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-300">{error}</p>}
    </form>
  );
}
