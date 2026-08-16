"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AMENIDADES_CATALOGO, type Amenidad } from "@/lib/api";

/**
 * Ítem 11, Fase 2 (04-ago-2026) -- filtros de hora y amenidades.
 * Componente cliente aparte a propósito: la página de resultados es un
 * server component (lee searchParams directo, sin useState) -- este es
 * el único trozo que necesita interactividad, y actualiza la URL en
 * vez de mantener su propio estado de resultados.
 *
 * Fase 5-buscador (16-ago-2026) -- prop `variante`: en pantalla
 * grande se muestra como panel fijo, siempre abierto, al lado de los
 * resultados (mismo patrón real investigado en referencias de la
 * industria: redBus, FlixBus). En celular sigue siendo un desplegable
 * -- la lógica de filtrado real no cambió, solo cómo se muestra.
 */
export function FiltrosBusqueda({ variante = "dropdown" }: { variante?: "dropdown" | "panel" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [horaDesde, setHoraDesde] = useState(searchParams.get("horaDesde") ?? "");
  const [horaHasta, setHoraHasta] = useState(searchParams.get("horaHasta") ?? "");
  const [amenidades, setAmenidades] = useState<Amenidad[]>(
    (searchParams.get("amenidades")?.split(",").filter(Boolean) as Amenidad[]) ?? [],
  );
  const [abierto, setAbierto] = useState(false);

  function alternarAmenidad(valor: Amenidad) {
    setAmenidades((actuales) =>
      actuales.includes(valor) ? actuales.filter((a) => a !== valor) : [...actuales, valor],
    );
  }

  function aplicar() {
    const params = new URLSearchParams(searchParams.toString());
    if (horaDesde && horaHasta) {
      params.set("horaDesde", horaDesde);
      params.set("horaHasta", horaHasta);
    } else {
      params.delete("horaDesde");
      params.delete("horaHasta");
    }
    if (amenidades.length > 0) {
      params.set("amenidades", amenidades.join(","));
    } else {
      params.delete("amenidades");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setHoraDesde("");
    setHoraHasta("");
    setAmenidades([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("horaDesde");
    params.delete("horaHasta");
    params.delete("amenidades");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hayFiltrosActivos = Boolean(searchParams.get("horaDesde") || searchParams.get("amenidades"));

  const contenidoFiltros = (
    <div className="space-y-4">
      <div>
        <label id="filtros-hora-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Hora de salida
        </label>
        <div role="group" aria-labelledby="filtros-hora-label" className="flex items-center gap-2">
          <input
            id="filtros-hora-desde"
            type="time"
            aria-label="Hora desde"
            value={horaDesde}
            onChange={(e) => setHoraDesde(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
          <span className="text-sm text-brand-dark/50">a</span>
          <input
            id="filtros-hora-hasta"
            type="time"
            aria-label="Hora hasta"
            value={horaHasta}
            onChange={(e) => setHoraHasta(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>
      </div>

      <div>
        <label id="filtros-amenidades-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Amenidades
        </label>
        <div role="group" aria-labelledby="filtros-amenidades-label" className="flex flex-wrap gap-2">
          {AMENIDADES_CATALOGO.map((a) => (
            <button
              key={a.valor}
              type="button"
              onClick={() => alternarAmenidad(a.valor)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                amenidades.includes(a.valor)
                  ? "bg-brand-cobalto text-white"
                  : "bg-brand-light/40 text-brand-dark/70"
              }`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={aplicar}
          className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark/80"
        >
          Aplicar filtros
        </button>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-brand-dark/70"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );

  if (variante === "panel") {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-brand-dark">Filtros</h2>
          {hayFiltrosActivos && (
            <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-dark">
              Activos
            </span>
          )}
        </div>
        {contenidoFiltros}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-dark"
      >
        <span>
          Filtros
          {hayFiltrosActivos && (
            <span className="ml-2 rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-dark">
              Activos
            </span>
          )}
        </span>
        <span className="text-brand-dark/40">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && <div className="mt-4 border-t border-black/5 pt-4">{contenidoFiltros}</div>}
    </div>
  );
}
