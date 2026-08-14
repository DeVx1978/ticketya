"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buscarPuntosOperacion, type PuntoOperacion } from "@/lib/api";

interface Props {
  etiqueta: string;
  placeholder: string;
  valor: PuntoOperacion | null;
  onCambio: (punto: PuntoOperacion | null) => void;
}

/**
 * Autocompletado de ciudad/terminal — RF-BUS-002. Debounce simple de
 * 250ms para no disparar una consulta al backend en cada tecla.
 *
 * Navegación por teclado real (13-ago-2026, accesibilidad parte 2) --
 * hallazgo real: antes solo se podía elegir una sugerencia con clic de
 * mouse (el cierre por onBlur + setTimeout no dejaba tiempo real para
 * que Tab llegara a un botón de la lista, y no había manejo de flechas
 * ni Enter). Corregido con el patrón ARIA "combobox + listbox" real: el
 * foco NUNCA sale del campo de texto -- flecha abajo/arriba mueve un
 * resaltado virtual (aria-activedescendant), Enter confirma la
 * seleccionada, Escape cierra. Así no hay ninguna carrera con blur.
 */
export function SelectorCiudad({ etiqueta, placeholder, valor, onCambio }: Props) {
  // Ítem 21 (07-ago-2026) -- useId(), no un id fijo: este componente se
  // usa 2 veces en la misma página (Origen y Destino) -- un id fijo
  // haría que ambas etiquetas apuntaran al mismo campo.
  const idCampo = useId();
  const idListbox = `${idCampo}-listbox`;
  const [texto, setTexto] = useState(valor?.ciudad ?? "");
  const [sugerencias, setSugerencias] = useState<PuntoOperacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [indiceResaltado, setIndiceResaltado] = useState(-1);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!texto || (valor && texto === valor.ciudad)) {
      setSugerencias([]);
      return;
    }
    temporizador.current = setTimeout(async () => {
      const resultado = await buscarPuntosOperacion(texto);
      setSugerencias(resultado);
      setIndiceResaltado(-1);
    }, 250);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function elegir(s: PuntoOperacion) {
    setTexto(s.ciudad);
    onCambio(s);
    setAbierto(false);
    setIndiceResaltado(-1);
  }

  function alPresionarTecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceResaltado((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceResaltado((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (indiceResaltado >= 0 && indiceResaltado < sugerencias.length) {
        e.preventDefault();
        elegir(sugerencias[indiceResaltado]);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
      setIndiceResaltado(-1);
    }
  }

  return (
    <div className="relative flex-1">
      <label htmlFor={idCampo} className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70 mb-1">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        type="text"
        role="combobox"
        aria-expanded={abierto && sugerencias.length > 0}
        aria-controls={idListbox}
        aria-autocomplete="list"
        aria-activedescendant={
          indiceResaltado >= 0 ? `${idListbox}-opcion-${indiceResaltado}` : undefined
        }
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambio(null);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={alPresionarTecla}
        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
      />
      {abierto && sugerencias.length > 0 && (
        <ul id={idListbox} role="listbox" aria-label={etiqueta} className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-brand-light bg-white shadow-lg">
          {sugerencias.map((s, i) => (
            <li key={s.id} id={`${idListbox}-opcion-${i}`} role="option" aria-selected={i === indiceResaltado}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(s)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === indiceResaltado ? "bg-brand-light" : "hover:bg-brand-light"
                }`}
              >
                <span className="font-medium text-brand-dark">{s.ciudad}</span>{" "}
                <span className="text-brand-dark/50">— {s.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
