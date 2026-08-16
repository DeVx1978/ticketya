"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Fase 5-buscador (16-ago-2026) -- hallazgo real del director,
 * comparando con referencias reales (redBus, FlixBus): faltaba poder
 * ordenar los resultados. Mismo patrón que FiltrosBusqueda -- actualiza
 * la URL, el ordenamiento real ocurre en el servidor (page.tsx),
 * nunca se inventa nada del lado del cliente.
 */
const OPCIONES = [
  { valor: "precio_asc", etiqueta: "Precio: menor primero" },
  { valor: "precio_desc", etiqueta: "Precio: mayor primero" },
  { valor: "salida_temprano", etiqueta: "Salida más temprano" },
] as const;

export function OrdenarPor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valorActual = searchParams.get("ordenarPor") ?? "precio_asc";

  function cambiar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ordenarPor", valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      aria-label="Ordenar resultados"
      value={valorActual}
      onChange={(e) => cambiar(e.target.value)}
      className="rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
    >
      {OPCIONES.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  );
}
