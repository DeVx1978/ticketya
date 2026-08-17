"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Filtro rápido por cooperativa -- orden real de la directora
 * (16-ago-2026, protocolo de medición precisa de referencias):
 * píldoras horizontales arriba de los resultados, mismo patrón real
 * que ya usan FiltrosBusqueda y OrdenarPor (actualiza la URL, el
 * filtrado real ocurre en el servidor sobre los resultados ya
 * obtenidos). Usa las cooperativas REALES que aparecen en los
 * resultados de esta búsqueda -- nunca códigos ni nombres de otro
 * conjunto de datos.
 */
export function FiltroCooperativaPills({
  cooperativas,
}: {
  cooperativas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cooperativaActiva = searchParams.get("cooperativaId");

  function alternar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cooperativaActiva === id) {
      params.delete("cooperativaId");
    } else {
      params.set("cooperativaId", id);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (cooperativas.length < 2) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {cooperativas.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => alternar(c.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            cooperativaActiva === c.id
              ? "bg-brand-dark text-white"
              : "bg-white text-brand-dark/70 ring-1 ring-black/10 hover:bg-brand-light/40"
          }`}
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
