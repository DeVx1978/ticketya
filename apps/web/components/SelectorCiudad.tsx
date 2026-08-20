"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buscarPuntosOperacion, type PuntoOperacion } from "@/lib/api";

interface Props {
  etiqueta: string;
  placeholder: string;
  valor: PuntoOperacion | null;
  onCambio: (punto: PuntoOperacion | null) => void;
  /** Orden real del director (17-ago-2026), recreando una referencia
   * real: dentro de la barra compacta del Hero, sin borde ni fondo
   * propio (el contenedor exterior ya trae el borde/divisor real) --
   * opcional, false por defecto, no afecta dónde ya se usa sin esto. */
  compacto?: boolean;
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
export function SelectorCiudad({ etiqueta, placeholder, valor, onCambio, compacto = false }: Props) {
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
  // Hallazgo real (15-ago-2026, reportado por el director al recorrer
  // producción real): condición de carrera en el autocompletado -- con
  // varias peticiones disparadas mientras se escribe (una por letra,
  // el debounce solo cancela el TIMEOUT, nunca la petición ya en
  // vuelo), una respuesta vieja (de un texto parcial, ej. "gu") podía
  // llegar DESPUÉS de la respuesta correcta más reciente y
  // sobrescribirla -- el usuario veía menos opciones de las reales,
  // sin ningún error visible. Corregido con un número de secuencia:
  // solo se aplica la respuesta si sigue siendo la petición más
  // reciente en el momento en que vuelve.
  const secuenciaPeticion = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });

  // Mismo hallazgo real que en CampoFecha (19-ago-2026): el Hero tiene
  // `overflow-hidden` en su <section> (necesario para el slider de
  // fotos) -- la lista de sugerencias, posicionada `absolute` dentro
  // de ese árbol, queda recortada e invisible cuando el campo está
  // cerca del borde inferior de la sección. Solo en modo `compacto`
  // (el único uso real dentro del Hero) se monta con un portal a
  // `document.body` y se posiciona con `position: fixed` según el
  // rect real del input. El uso en panel-empresa/rutas (compacto
  // = false, sin overflow-hidden alrededor) no se toca.
  useLayoutEffect(() => {
    if (!compacto || !abierto || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPosicion({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [compacto, abierto, texto]);

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!texto || (valor && texto === valor.ciudad)) {
      setSugerencias([]);
      return;
    }
    temporizador.current = setTimeout(async () => {
      const idPeticion = ++secuenciaPeticion.current;
      const resultado = await buscarPuntosOperacion(texto);
      if (idPeticion !== secuenciaPeticion.current) return; // ya no es la más reciente -- descartar
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
    <div className="relative min-w-[140px] flex-1">
      <label htmlFor={idCampo} className={`block text-xs font-semibold uppercase tracking-wide text-brand-dark/70 mb-1 ${compacto ? "md:text-[10px] md:text-white/60 md:mb-0.5" : ""}`}>
        {etiqueta}
      </label>
      <input
        id={idCampo}
        ref={inputRef}
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
        className={
          compacto
            ? "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-medium md:border-0 md:bg-transparent md:p-0 md:text-sm md:placeholder:text-white/40 md:focus:ring-0"
            : "w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
        }
      />
      {abierto && sugerencias.length > 0 && (() => {
        const lista = (
          <ul
            id={idListbox}
            role="listbox"
            aria-label={etiqueta}
            style={compacto ? { position: "fixed", top: posicion.top, left: posicion.left, width: posicion.width } : undefined}
            className={
              compacto
                ? "z-[100] overflow-hidden rounded-lg border border-white/15 bg-brand-dark/90 shadow-2xl shadow-black/40 backdrop-blur-md"
                : "absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-brand-light bg-white shadow-lg"
            }
          >
            {sugerencias.map((s, i) => (
              <li key={s.id} id={`${idListbox}-opcion-${i}`} role="option" aria-selected={i === indiceResaltado}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(s)}
                  className={
                    compacto
                      ? `block w-full px-3 py-2 text-left text-sm ${i === indiceResaltado ? "bg-white/15" : "hover:bg-white/10"}`
                      : `block w-full px-3 py-2 text-left text-sm ${i === indiceResaltado ? "bg-brand-light" : "hover:bg-brand-light"}`
                  }
                >
                  <span className={compacto ? "font-medium text-white" : "font-medium text-brand-dark"}>{s.ciudad}</span>{" "}
                  <span className={compacto ? "text-white/50" : "text-brand-dark/50"}>— {s.nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        );
        return compacto && typeof document !== "undefined" ? createPortal(lista, document.body) : lista;
      })()}
    </div>
  );
}
