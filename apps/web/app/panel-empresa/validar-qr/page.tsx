"use client";

import { useEffect, useRef, useState } from "react";
import { validarQrCoop, type ResultadoValidacionQr } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

type Resultado = ResultadoValidacionQr & { codigo: string };

export default function ValidarQrPage() {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<Resultado | null>(null);
  const [historial, setHistorial] = useState<Resultado[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // El escáner de QR físico (si se usa uno) funciona escribiendo el
  // código como si fuera un teclado — por eso el campo debe estar
  // siempre enfocado y listo, sin que el vendedor tenga que hacer clic
  // cada vez entre un boleto y el siguiente.
  useEffect(() => {
    inputRef.current?.focus();
  }, [ultimoResultado]);

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    const codigoLimpio = codigo.trim();
    if (!token || !codigoLimpio) return;

    setValidando(true);
    try {
      const res = await validarQrCoop(token, codigoLimpio);
      const conCodigo: Resultado = { ...res, codigo: codigoLimpio };
      setUltimoResultado(conCodigo);
      setHistorial((prev) => [conCodigo, ...prev].slice(0, 8));
    } catch (err) {
      setUltimoResultado({
        valido: false,
        mensaje: err instanceof Error ? err.message : "No se pudo validar el boleto.",
        codigo: codigoLimpio,
      });
    } finally {
      setCodigo("");
      setValidando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Validar boleto</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Escanea el código QR del boleto (o pégalo aquí) para confirmar el abordaje.
        </p>
      </div>

      <form onSubmit={validar} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
          Código QR
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Escanea o pega el código aquí..."
            autoFocus
            className="flex-1 rounded-lg border border-brand-light bg-white px-4 py-3 text-lg text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            type="submit"
            disabled={validando || !codigo.trim()}
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {validando ? "Validando..." : "Validar"}
          </button>
        </div>
      </form>

      {ultimoResultado && (
        <div
          className={`rounded-2xl p-6 text-center shadow-sm ring-1 ${
            ultimoResultado.valido
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-red-50 ring-red-200"
          }`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
              ultimoResultado.valido ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {ultimoResultado.valido ? "✓" : "✕"}
          </div>
          <p
            className={`mt-3 font-display text-lg font-bold ${
              ultimoResultado.valido ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {ultimoResultado.mensaje}
          </p>
          {ultimoResultado.pasajeroNombre && (
            <p className="mt-1 text-base text-brand-dark/70">{ultimoResultado.pasajeroNombre}</p>
          )}
        </div>
      )}

      {historial.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="border-b border-black/5 px-6 py-4">
            <h2 className="font-display text-sm font-bold text-brand-dark">Últimas validaciones</h2>
          </div>
          <ul className="divide-y divide-black/5">
            {historial.map((h, i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="text-brand-dark/70">{h.pasajeroNombre ?? h.mensaje}</span>
                <span className={`font-semibold ${h.valido ? "text-emerald-600" : "text-red-600"}`}>
                  {h.valido ? "Válido" : "Rechazado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
