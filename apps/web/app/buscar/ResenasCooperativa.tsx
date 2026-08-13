"use client";

/**
 * Reseñas de texto reales (13-ago-2026) -- el campo `comentario` ya se
 * guardaba desde el 22-jul-2026, pero nunca existió ninguna forma de
 * leerlo. Se muestra plegado por defecto (no se piden reseñas de cada
 * cooperativa de la lista de resultados sin que el pasajero lo pida --
 * evita N peticiones extra en cada búsqueda) -- solo se carga la
 * primera página al abrir, y el resto bajo demanda con paginación real
 * (10 por página, mismo criterio que Amazon).
 */

import { useState } from "react";
import { listarResenasCooperativa, type Resena } from "@/lib/api";

function formatearFechaResena(iso: string): string {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Guayaquil",
  });
}

export function ResenasCooperativa({
  cooperativaId,
  cantidadTotal,
}: {
  cooperativaId: string;
  cantidadTotal: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const porPagina = 10;

  async function cargar(p: number) {
    setCargando(true);
    setError(null);
    try {
      const data = await listarResenasCooperativa(cooperativaId, p, porPagina);
      setResenas(data.resenas);
      setTotal(data.total);
      setPagina(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las reseñas.");
    } finally {
      setCargando(false);
    }
  }

  function alternar() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente && resenas.length === 0 && !cargando) {
      cargar(1);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={alternar}
        className="text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
      >
        {abierto ? "Ocultar reseñas" : `Ver reseñas (${cantidadTotal})`}
      </button>

      {abierto && (
        <div className="mt-2 space-y-3 rounded-lg bg-brand-light/30 p-3">
          {cargando && <p className="text-xs text-brand-dark/50">Cargando reseñas...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!cargando && !error && resenas.length === 0 && (
            <p className="text-xs text-brand-dark/50">Todavía no hay reseñas de texto.</p>
          )}
          {resenas.map((r) => (
            <div key={r.id} className="border-b border-brand-dark/10 pb-2 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-600" aria-label={`${r.puntuacion} de 5 estrellas`}>
                  {"★".repeat(r.puntuacion)}
                  {"☆".repeat(5 - r.puntuacion)}
                </span>
                <span className="text-xs font-semibold text-brand-dark">{r.nombreAutor}</span>
                <span className="text-xs text-brand-dark/40">{formatearFechaResena(r.creadoEn)}</span>
              </div>
              <p className="mt-1 text-sm text-brand-dark/80">{r.comentario}</p>
            </div>
          ))}

          {!cargando && totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => cargar(pagina - 1)}
                className="text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-30"
              >
                Anterior
              </button>
              <span className="text-xs text-brand-dark/50">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => cargar(pagina + 1)}
                className="text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
