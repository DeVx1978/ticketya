"use client";

import { useEffect, useState } from "react";
import {
  listarMetodosPago,
  guardarMetodoPago,
  eliminarMetodoPago,
  type MetodoPagoCooperativa,
  type TipoMetodoPago,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const ETIQUETAS: Record<TipoMetodoPago, string> = {
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  deuna: "DeUna",
  payphone: "PayPhone (billetera)",
  tarjeta_pasarela: "Tarjeta (pasarela — próximamente)",
};

/** Campos que pide cada tipo de método -- estructura libre a propósito, cada uno necesita datos distintos. */
const CAMPOS: Record<TipoMetodoPago, Array<{ clave: string; etiqueta: string; placeholder?: string }>> = {
  transferencia_bancaria: [
    { clave: "banco", etiqueta: "Banco" },
    { clave: "tipoCuenta", etiqueta: "Tipo de cuenta", placeholder: "Ahorros o corriente" },
    { clave: "numeroCuenta", etiqueta: "Número de cuenta" },
    { clave: "titular", etiqueta: "Titular de la cuenta" },
    { clave: "cedulaTitular", etiqueta: "Cédula/RUC del titular" },
  ],
  efectivo: [{ clave: "instrucciones", etiqueta: "Instrucciones para el pasajero" }],
  deuna: [
    { clave: "numeroCelular", etiqueta: "Número de celular" },
    { clave: "titular", etiqueta: "Nombre del titular" },
  ],
  payphone: [
    { clave: "numeroCelular", etiqueta: "Número de celular" },
    { clave: "titular", etiqueta: "Nombre del titular" },
  ],
  tarjeta_pasarela: [],
};

const TIPOS_DISPONIBLES: TipoMetodoPago[] = [
  "transferencia_bancaria",
  "efectivo",
  "deuna",
  "payphone",
];

export function MetodosPago({ onExito, onError }: { onExito: (m: string) => void; onError: (m: string) => void }) {
  const [metodos, setMetodos] = useState<MetodoPagoCooperativa[] | null>(null);
  const [tipoNuevo, setTipoNuevo] = useState<TipoMetodoPago | "">("");
  const [datosNuevo, setDatosNuevo] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarMetodosPago(token).then(setMetodos).catch((err) => onError(err.message));
  }
  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !tipoNuevo) return;
    setGuardando(true);
    try {
      await guardarMetodoPago(token, tipoNuevo, datosNuevo, true);
      onExito(`${ETIQUETAS[tipoNuevo]} configurado.`);
      setTipoNuevo("");
      setDatosNuevo({});
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await eliminarMetodoPago(token, id);
      onExito("Método de pago eliminado.");
      cargar();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div>
        <h2 className="font-display text-base font-bold text-brand-dark">Métodos de pago</h2>
        <p className="mt-1 text-xs text-brand-dark/50">
          Mientras no haya una pasarela conectada, tus pasajeros pagan por transferencia, efectivo,
          DeUna o PayPhone directo a tu cuenta, y suben el comprobante para que lo confirmes.
        </p>
      </div>

      {metodos && metodos.length > 0 && (
        <div className="space-y-2">
          {metodos.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-brand-dark">{ETIQUETAS[m.tipo]}</p>
                <p className="text-xs text-brand-dark/50">
                  {Object.entries(m.datosCuenta)
                    .map(([, v]) => v)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={() => eliminar(m.id)}
                className="text-xs font-semibold text-red-600 underline decoration-dotted underline-offset-2 hover:text-red-700"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={agregar} className="space-y-3 border-t border-black/5 pt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Agregar método
        </label>
        <select
          value={tipoNuevo}
          onChange={(e) => {
            setTipoNuevo(e.target.value as TipoMetodoPago);
            setDatosNuevo({});
          }}
          className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
        >
          <option value="">Elige un método...</option>
          {TIPOS_DISPONIBLES.filter((t) => !metodos?.some((m) => m.tipo === t)).map((t) => (
            <option key={t} value={t}>
              {ETIQUETAS[t]}
            </option>
          ))}
        </select>

        {tipoNuevo &&
          CAMPOS[tipoNuevo].map((campo) => (
            <div key={campo.clave}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                {campo.etiqueta}
              </label>
              <input
                type="text"
                value={datosNuevo[campo.clave] ?? ""}
                placeholder={campo.placeholder}
                onChange={(e) => setDatosNuevo((d) => ({ ...d, [campo.clave]: e.target.value }))}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
          ))}

        {tipoNuevo && (
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Agregar método"}
          </button>
        )}
      </form>
    </div>
  );
}
