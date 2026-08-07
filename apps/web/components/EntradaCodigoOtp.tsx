"use client";

import { useRef, useState } from "react";

/**
 * Ítem 19 (06-ago-2026) -- entrada de código de 6 dígitos como casillas
 * separadas, patrón visual estándar de apps de autenticación reales
 * (Google, GitHub, bancos) -- mucho más claro y rápido de escribir que
 * un solo campo de texto plano para un código numérico corto.
 * Avanza de casilla automáticamente, soporta pegar el código completo
 * de una vez (ej. copiado desde la app autenticadora), y borrar con
 * retroceso vuelve a la casilla anterior.
 */
export function EntradaCodigoOtp({
  valor,
  onChange,
  autoFocus = true,
}: {
  valor: string;
  onChange: (valor: string) => void;
  autoFocus?: boolean;
}) {
  const digitos = valor.split("").concat(Array(6).fill("")).slice(0, 6);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [pegando, setPegando] = useState(false);

  function actualizarDigito(indice: number, nuevoValor: string) {
    const soloNumeros = nuevoValor.replace(/\D/g, "");
    if (!soloNumeros) return;
    const nuevosDigitos = [...digitos];
    nuevosDigitos[indice] = soloNumeros[soloNumeros.length - 1];
    onChange(nuevosDigitos.join("").slice(0, 6));
    if (indice < 5) refs.current[indice + 1]?.focus();
  }

  function manejarTeclado(indice: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digitos[indice] && indice > 0) {
      refs.current[indice - 1]?.focus();
    }
  }

  function manejarPegado(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    setPegando(true);
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(texto);
    if (texto.length === 6) refs.current[5]?.focus();
    setTimeout(() => setPegando(false), 0);
  }

  return (
    <div className="flex justify-center gap-2">
      {digitos.map((digito, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={digito}
          onChange={(e) => !pegando && actualizarDigito(i, e.target.value)}
          onKeyDown={(e) => manejarTeclado(i, e)}
          onPaste={manejarPegado}
          className="h-14 w-11 rounded-lg border border-brand-light text-center text-2xl font-bold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium sm:w-12"
        />
      ))}
    </div>
  );
}
