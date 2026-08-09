"use client";

import { useEffect, useRef, useState } from "react";
import { validarQrCoop, verificarMenorCoop, type ResultadoValidacionQr, type InfoMenor } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

type Resultado = ResultadoValidacionQr & { codigo: string };

const ETIQUETA_ACOMPANAMIENTO: Record<string, string> = {
  con_padre_madre_tutor: "Viaja con padre/madre/tutor en esta misma compra",
  con_autorizacion: "Viaja con autorización de un adulto responsable",
};

function BloqueMenor({ menor, onVerificado }: { menor: InfoMenor; onVerificado: () => void }) {
  const [docIdentidad, setDocIdentidad] = useState(false);
  const [docAutorizacion, setDocAutorizacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    const token = obtenerToken();
    if (!token) return;
    setGuardando(true);
    setError(null);
    try {
      await verificarMenorCoop(token, menor.boletoId, docIdentidad, docAutorizacion);
      onVerificado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la verificación.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
      <p className="text-sm font-bold text-amber-800">Pasajero menor de edad — RF-MENOR</p>
      <p className="mt-1 text-sm text-amber-700">{ETIQUETA_ACOMPANAMIENTO[menor.tipoAcompanamiento]}</p>
      {menor.adultoAcompananteNombre && (
        <p className="mt-1 text-sm text-amber-700">Acompañante: {menor.adultoAcompananteNombre}</p>
      )}
      {menor.adultoResponsableNombre && (
        <p className="mt-1 text-sm text-amber-700">
          Responsable: {menor.adultoResponsableNombre} — {menor.adultoResponsableDocumento}
          {menor.adultoResponsableTelefono && ` — ${menor.adultoResponsableTelefono}`}
        </p>
      )}

      {menor.yaVerificado ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">✓ Documentos ya verificados.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input type="checkbox" checked={docIdentidad} onChange={(e) => setDocIdentidad(e.target.checked)} />
            Documento de identidad del menor verificado
          </label>
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input
              type="checkbox"
              checked={docAutorizacion}
              onChange={(e) => setDocAutorizacion(e.target.checked)}
            />
            Documento de autorización verificado
          </label>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || (!docIdentidad && !docAutorizacion)}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Confirmar verificación"}
          </button>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

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
        <p className="mt-1 text-sm text-brand-dark/70">
          Escanea el código QR del boleto (o pégalo aquí) para confirmar el abordaje.
        </p>
      </div>

      <form onSubmit={validar} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <label htmlFor="validar-qr-codigo" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Código QR
        </label>
        <div className="flex gap-3">
          <input
            id="validar-qr-codigo"
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
          {ultimoResultado.menor && (
            <BloqueMenor
              menor={ultimoResultado.menor}
              onVerificado={() =>
                setUltimoResultado((prev) =>
                  prev ? { ...prev, menor: { ...prev.menor!, yaVerificado: true } } : prev,
                )
              }
            />
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
