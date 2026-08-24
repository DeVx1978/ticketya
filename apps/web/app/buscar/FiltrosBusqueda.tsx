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
 *
 * Fase 7-buscador (17-ago-2026) -- hallazgo real del director: los 2
 * campos de hora nativos (`<input type="time">`) mostraban cada uno
 * su propio reloj del navegador, uno al lado del otro -- se veía como
 * un error visual (íconos "duplicados"), y un pasajero normal no
 * entendía para qué servían. Reemplazados por franjas de horario de
 * un solo clic (Madrugada/Mañana/Tarde/Noche) -- mismo patrón real de
 * la referencia del director, mucho más claro que escribir una hora
 * exacta. El backend real solo acepta un rango continuo
 * (horaDesde/horaHasta) -- por eso esto funciona como selección
 * única (una franja a la vez), no casillas independientes: así el
 * resultado siempre es predecible, sin necesitar cambios de backend.
 */
const FRANJAS_HORARIO = [
  { valor: "madrugada", etiqueta: "Madrugada", horaDesde: "00:00", horaHasta: "06:00" },
  { valor: "manana", etiqueta: "Mañana", horaDesde: "06:00", horaHasta: "12:00" },
  { valor: "tarde", etiqueta: "Tarde", horaDesde: "12:00", horaHasta: "18:00" },
  { valor: "noche", etiqueta: "Noche", horaDesde: "18:00", horaHasta: "23:59" },
] as const;

function franjaActivaDesdeUrl(horaDesde: string | null, horaHasta: string | null): string | null {
  const encontrada = FRANJAS_HORARIO.find((f) => f.horaDesde === horaDesde && f.horaHasta === horaHasta);
  return encontrada?.valor ?? null;
}

export function FiltrosBusqueda({ variante = "dropdown" }: { variante?: "dropdown" | "panel" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [franjaHorario, setFranjaHorario] = useState<string | null>(
    franjaActivaDesdeUrl(searchParams.get("horaDesde"), searchParams.get("horaHasta")),
  );
  const [amenidades, setAmenidades] = useState<Amenidad[]>(
    (searchParams.get("amenidades")?.split(",").filter(Boolean) as Amenidad[]) ?? [],
  );
  // Fase 8-buscador (24-ago-2026) -- filtro de precio real, orden del
  // director tras comparar contra su demo de referencia. Se filtra en
  // el CLIENTE sobre los resultados que el servidor ya obtuvo -- cada
  // resultado ya trae `precioBase`, no hace falta ningún cambio de
  // backend ni un parámetro nuevo en `buscarViajes`. Mismo patrón real
  // que ya usan `horaDesde`/`horaHasta`: solo actualiza la URL,
  // page.tsx (servidor) hace el filtrado real.
  const [precioMin, setPrecioMin] = useState<string>(searchParams.get("precioMin") ?? "");
  const [precioMax, setPrecioMax] = useState<string>(searchParams.get("precioMax") ?? "");
  const [abierto, setAbierto] = useState(false);

  function alternarAmenidad(valor: Amenidad) {
    setAmenidades((actuales) =>
      actuales.includes(valor) ? actuales.filter((a) => a !== valor) : [...actuales, valor],
    );
  }

  function alternarFranja(valor: string) {
    setFranjaHorario((actual) => (actual === valor ? null : valor));
  }

  function aplicar() {
    const params = new URLSearchParams(searchParams.toString());
    const franja = FRANJAS_HORARIO.find((f) => f.valor === franjaHorario);
    if (franja) {
      params.set("horaDesde", franja.horaDesde);
      params.set("horaHasta", franja.horaHasta);
    } else {
      params.delete("horaDesde");
      params.delete("horaHasta");
    }
    if (amenidades.length > 0) {
      params.set("amenidades", amenidades.join(","));
    } else {
      params.delete("amenidades");
    }
    if (precioMin.trim()) {
      params.set("precioMin", precioMin.trim());
    } else {
      params.delete("precioMin");
    }
    if (precioMax.trim()) {
      params.set("precioMax", precioMax.trim());
    } else {
      params.delete("precioMax");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpiar() {
    setFranjaHorario(null);
    setAmenidades([]);
    setPrecioMin("");
    setPrecioMax("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("horaDesde");
    params.delete("horaHasta");
    params.delete("amenidades");
    params.delete("precioMin");
    params.delete("precioMax");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hayFiltrosActivos = Boolean(
    searchParams.get("horaDesde") || searchParams.get("amenidades") || searchParams.get("precioMin") || searchParams.get("precioMax"),
  );

  const contenidoFiltros = (
    <div className="space-y-4">
      <div>
        <label id="filtros-precio-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Precio (USD)
        </label>
        <div role="group" aria-labelledby="filtros-precio-label" className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Min"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-2.5 py-1.5 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <span className="text-brand-dark/30">—</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Max"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-2.5 py-1.5 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
      </div>

      <div>
        <label id="filtros-hora-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Hora de salida
        </label>
        <div role="group" aria-labelledby="filtros-hora-label" className="grid grid-cols-2 gap-2">
          {FRANJAS_HORARIO.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => alternarFranja(f.valor)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                franjaHorario === f.valor
                  ? "border-brand-cobalto bg-brand-cobalto/10 text-brand-cobalto"
                  : "border-brand-light text-brand-dark/70 hover:border-brand-cobalto/40"
              }`}
            >
              {f.etiqueta}
              <span className="block text-[10px] font-normal text-brand-dark/40">
                {f.horaDesde}–{f.horaHasta}
              </span>
            </button>
          ))}
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
