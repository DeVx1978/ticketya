"use client";

import { useEffect, useRef, useState } from "react";
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
 */
export function SelectorCiudad({ etiqueta, placeholder, valor, onCambio }: Props) {
  const [texto, setTexto] = useState(valor?.ciudad ?? "");
  const [sugerencias, setSugerencias] = useState<PuntoOperacion[]>([]);
  const [abierto, setAbierto] = useState(false);
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
    }, 250);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/60 mb-1">
        {etiqueta}
      </label>
      <input
        type="text"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          onCambio(null);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-brand-light bg-white shadow-lg">
          {sugerencias.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setTexto(s.ciudad);
                  onCambio(s);
                  setAbierto(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-light"
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
