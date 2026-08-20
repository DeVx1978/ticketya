"use client";

import { useEffect, useId, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

interface Props {
  etiqueta: string;
  valor: string; // ISO yyyy-mm-dd, mismo formato que ya consume BuscadorForm
  minimo?: string; // ISO yyyy-mm-dd
  onCambio: (valorIso: string) => void;
}

function isoAFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function fechaAIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatoCorto(iso: string): string {
  return isoAFecha(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Calendario propio (19-ago-2026) -- orden real del director: el
 * `<input type="date">` nativo abre un popup dibujado por el sistema
 * operativo/navegador, imposible de vestir con el efecto vidrio de la
 * tarjeta -- quedaba una pieza genérica pegada a un diseño premium.
 * Reemplazado por react-day-picker (sin CSS por defecto, se
 * estiliza 100% por `classNames`) solo en el buscador del Hero, a la
 * espera de decidir si se extiende a los otros 6 usos reales de
 * `type="date"` en la plataforma (admin, panel-empresa, checkout).
 */
export function CampoFecha({ etiqueta, valor, minimo, onCambio }: Props) {
  const idCampo = useId();
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Hallazgo real (19-ago-2026, atrapado en la verificación visual
  // antes de reportar): el Hero tiene `overflow-hidden` en su
  // <section> (necesario para el slider de fotos) -- un popover
  // posicionado con `absolute` dentro de ese árbol queda cortado a la
  // mitad, invisible. Se monta con un portal directo a `document.body`
  // y se posiciona con `position: fixed` según el rect real del botón,
  // así escapa del recorte sin tocar el overflow del Hero (lo rompería
  // para el slider).
  //
  // Bug real encontrado por el director (20-ago-2026): la posición
  // solo se calculaba UNA VEZ al abrir. Como el popover es
  // `position: fixed` (fijo a la PANTALLA, no al campo), si la página
  // se desplazaba con scroll después de abrirlo, el campo "Fecha" se
  // movía junto con el resto de la tarjeta pero el calendario se
  // quedaba clavado en el mismo punto de la pantalla -- se veía
  // "suelto". Reproducido y confirmado con captura real antes de
  // corregir. Corregido escuchando scroll/resize mientras está
  // abierto, para recalcular la posición en cada evento y que el
  // calendario siga al campo real.
  //
  // Ajuste visual real (20-ago-2026, mismo día): incluso ya sin el
  // bug de scroll, el calendario seguía viéndose como una tarjeta
  // aparte, flotando en medio de la pantalla -- fondo más oscuro
  // (bg-brand-dark/90) que la tarjeta principal (bg-brand-dark/40),
  // sombra propia, esquinas redondeadas en las 4 puntas, y 8px de
  // separación respecto al campo. Corregido con el mismo criterio ya
  // aplicado antes al desplegable de ciudades (SelectorCiudad.tsx):
  // sin espacio (`rect.bottom`, no `+8`), mismo tono de vidrio que la
  // tarjeta (`bg-brand-dark/40`), esquinas redondeadas solo abajo
  // (`rounded-b-2xl border-t-0`) -- se siente como una extensión de
  // la tarjeta, no una ventana flotante aparte.
  useLayoutEffect(() => {
    if (!abierto || !botonRef.current) return;
    function recalcular() {
      if (!botonRef.current) return;
      const rect = botonRef.current.getBoundingClientRect();
      setPosicion({ top: rect.bottom, left: rect.left });
    }
    recalcular();
    window.addEventListener("scroll", recalcular, true);
    window.addEventListener("resize", recalcular);
    return () => {
      window.removeEventListener("scroll", recalcular, true);
      window.removeEventListener("resize", recalcular);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(e: MouseEvent) {
      const dentroDelBoton = contenedorRef.current?.contains(e.target as Node);
      const dentroDelPopover = popoverRef.current?.contains(e.target as Node);
      if (!dentroDelBoton && !dentroDelPopover) setAbierto(false);
    }
    function alPresionarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alPresionarEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alPresionarEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative">
      <label htmlFor={idCampo} className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {etiqueta}
      </label>
      <button
        id={idCampo}
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-left text-sm text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-brand-medium md:w-32 md:border-0 md:bg-transparent md:p-0 md:hover:bg-transparent md:focus:ring-0"
      >
        {formatoCorto(valor)}
      </button>

      {abierto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={etiqueta}
            style={{ position: "fixed", top: posicion.top, left: posicion.left }}
            className="z-[100] rounded-b-2xl border border-t-0 border-white/15 bg-brand-dark/40 p-3 shadow-xl shadow-black/30 backdrop-blur-md"
          >
            <DayPicker
              mode="single"
              locale={es}
              selected={isoAFecha(valor)}
              defaultMonth={isoAFecha(valor)}
              disabled={minimo ? { before: isoAFecha(minimo) } : undefined}
              onSelect={(fecha) => {
                if (!fecha) return;
                onCambio(fechaAIso(fecha));
                setAbierto(false);
              }}
              classNames={{
                root: "text-white",
                months: "flex gap-4",
                month: "space-y-2",
                month_caption: "flex items-center justify-center py-1 text-sm font-semibold text-white capitalize",
                nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1",
                button_previous:
                  "flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30",
                button_next:
                  "flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30",
                chevron: "fill-current",
                weekdays: "flex",
                weekday: "w-8 text-center text-[10px] font-semibold uppercase text-white/40",
                week: "flex",
                day: "p-0.5",
                day_button:
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white/85 transition hover:bg-white/15",
                today: "font-bold text-brand-amber",
                selected: "[&>button]:bg-brand-amber [&>button]:text-brand-dark [&>button]:font-bold [&>button]:hover:bg-brand-amber",
                outside: "text-white/25",
                disabled: "text-white/20 hover:bg-transparent cursor-not-allowed",
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
