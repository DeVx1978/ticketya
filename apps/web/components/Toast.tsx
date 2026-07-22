"use client";

import { useEffect } from "react";

interface ToastProps {
  mensaje: string | null;
  onCerrar: () => void;
  /** ms antes de auto-cerrarse. Default 4000. */
  duracion?: number;
}

/**
 * Notificación flotante de éxito — pedido explícito del usuario
 * (22-jul-2026): antes, crear algo (ruta, punto de operación,
 * cooperativa, etc.) no daba ninguna confirmación visual más allá de
 * que el formulario se limpiaba solo, lo cual es fácil de no notar.
 *
 * Cada página mantiene su propio string de estado (`mensajeExito`) y
 * renderiza este componente condicionalmente — no hay contexto global
 * de notificaciones todavía porque no hace falta: nunca hay más de un
 * mensaje relevante a la vez en una sola pantalla.
 */
export function Toast({ mensaje, onCerrar, duracion = 4000 }: ToastProps) {
  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(onCerrar, duracion);
    return () => clearTimeout(temporizador);
  }, [mensaje, duracion, onCerrar]);

  if (!mensaje) return null;

  return (
    <div
      role="status"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0">
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{mensaje}</span>
      <button onClick={onCerrar} aria-label="Cerrar" className="shrink-0 text-white/70 transition hover:text-white">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
