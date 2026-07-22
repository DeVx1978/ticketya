"use client";

import { useEffect } from "react";

interface ToastProps {
  mensaje: string | null;
  onCerrar: () => void;
  /** ms antes de auto-cerrarse. Default 4000 (éxito) / 6000 (error, se queda más tiempo porque hay que leerlo). */
  duracion?: number;
  tipo?: "exito" | "error";
}

/**
 * Notificación flotante — pedido explícito del usuario (22-jul-2026):
 * - Éxito: antes, crear algo no daba ninguna confirmación visual más
 *   allá de que el formulario se limpiaba solo.
 * - Error: antes, un fallo real (ej. correo duplicado) solo se veía
 *   como "Internal server error" en la consola del backend — el
 *   usuario no tenía forma de saber qué estuvo mal. Ver también el
 *   mapeo de errores en admin.repositorio.drizzle.ts, que es la mitad
 *   real del arreglo: esta notificación solo puede mostrar un mensaje
 *   útil si el backend primero lo traduce a algo legible.
 *
 * Cada página mantiene su propio string de estado y renderiza este
 * componente condicionalmente — no hay contexto global de
 * notificaciones todavía porque no hace falta: nunca hay más de un
 * mensaje relevante a la vez en una sola pantalla.
 */
export function Toast({ mensaje, onCerrar, duracion, tipo = "exito" }: ToastProps) {
  const duracionFinal = duracion ?? (tipo === "error" ? 6000 : 4000);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(onCerrar, duracionFinal);
    return () => clearTimeout(temporizador);
  }, [mensaje, duracionFinal, onCerrar]);

  if (!mensaje) return null;

  const colorFondo = tipo === "error" ? "bg-red-600" : "bg-emerald-600";

  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl ${colorFondo} px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5`}
    >
      {tipo === "error" ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="flex-1">{mensaje}</span>
      <button onClick={onCerrar} aria-label="Cerrar" className="shrink-0 text-white/70 transition hover:text-white">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
