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
 *
 * Colores cíclicos reales (16-ago-2026, pedido del director: "que
 * tenga esos diseños de colores que le dan vida") -- dentro de
 * nuestra paleta de marca ya establecida, no colores inventados
 * sueltos.
 */
const COLORES_PILDORA = [
  "bg-brand-cobalto text-white",
  "bg-amber-500 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-500 text-white",
  "bg-violet-600 text-white",
  "bg-cyan-600 text-white",
];

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
      {cooperativas.map((c, i) => {
        const colorActivo = COLORES_PILDORA[i % COLORES_PILDORA.length];
        const seleccionada = cooperativaActiva === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => alternar(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              seleccionada
                ? colorActivo
                : "bg-white text-brand-dark/70 ring-1 ring-black/10 hover:bg-brand-light/40"
            }`}
          >
            {c.nombre}
          </button>
        );
      })}
    </div>
  );
}
