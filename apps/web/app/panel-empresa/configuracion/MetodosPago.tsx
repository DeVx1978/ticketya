"use client";

import { useEffect, useState } from "react";
import {
  listarMetodosPago,
  guardarMetodoPago,
  eliminarMetodoPago,
  type MetodoPagoCooperativa,
  type TipoMetodoPago,
  type EntidadFinanciera,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const ETIQUETAS: Record<TipoMetodoPago, string> = {
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  deuna: "DeUna",
  payphone: "PayPhone (billetera)",
  tarjeta_pasarela: "Tarjeta (pasarela — próximamente)",
};

/**
 * Ítem 21/22 (06-ago-2026) -- catálogo cerrado de entidad financiera.
 * Reemplaza el campo "banco" de texto libre que vivía en CAMPOS más
 * abajo -- sin esto no había forma confiable de saber qué banco era
 * cada configuración (ver nota completa en el esquema de base de
 * datos). "otro" mantiene un campo de texto libre como respaldo, para
 * no bloquear a ninguna cooperativa cuyo banco no esté en esta lista.
 */
const ENTIDADES_FINANCIERAS: Array<{ valor: EntidadFinanciera; etiqueta: string }> = [
  { valor: "banco_pichincha", etiqueta: "Banco Pichincha" },
  { valor: "banco_guayaquil", etiqueta: "Banco Guayaquil" },
  { valor: "banco_pacifico", etiqueta: "Banco del Pacífico" },
  { valor: "produbanco", etiqueta: "Produbanco" },
  { valor: "banco_bolivariano", etiqueta: "Banco Bolivariano" },
  { valor: "banco_internacional", etiqueta: "Banco Internacional" },
  { valor: "diners_club", etiqueta: "Diners Club" },
  { valor: "banco_ruminahui", etiqueta: "Banco Rumiñahui" },
  { valor: "coop_jep", etiqueta: "Coop. JEP" },
  { valor: "coop_jardin_azuayo", etiqueta: "Coop. Jardín Azuayo" },
  { valor: "otro", etiqueta: "Otro (no está en la lista)" },
];

const ETIQUETA_ENTIDAD: Record<EntidadFinanciera, string> = Object.fromEntries(
  ENTIDADES_FINANCIERAS.map((e) => [e.valor, e.etiqueta]),
) as Record<EntidadFinanciera, string>;

/** Campos que pide cada tipo de método -- estructura libre a propósito, cada uno necesita datos distintos. */
const CAMPOS: Record<TipoMetodoPago, Array<{ clave: string; etiqueta: string; placeholder?: string }>> = {
  transferencia_bancaria: [
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
  const [entidadNueva, setEntidadNueva] = useState<EntidadFinanciera | "">("");
  const [nombreEntidadOtro, setNombreEntidadOtro] = useState("");
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
    if (tipoNuevo === "transferencia_bancaria" && !entidadNueva) {
      onError("Elige el banco o entidad receptora de la transferencia.");
      return;
    }
    setGuardando(true);
    try {
      const datosFinales =
        tipoNuevo === "transferencia_bancaria" && entidadNueva === "otro"
          ? { ...datosNuevo, banco: nombreEntidadOtro }
          : datosNuevo;
      const entidadFinal = tipoNuevo === "transferencia_bancaria" ? (entidadNueva as EntidadFinanciera) : null;
      await guardarMetodoPago(token, tipoNuevo, datosFinales, true, entidadFinal);
      onExito(`${ETIQUETAS[tipoNuevo]} configurado.`);
      setTipoNuevo("");
      setDatosNuevo({});
      setEntidadNueva("");
      setNombreEntidadOtro("");
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
                  {m.entidadFinanciera && m.entidadFinanciera !== "otro" && (
                    <span className="font-medium text-brand-dark/70">
                      {ETIQUETA_ENTIDAD[m.entidadFinanciera]} ·{" "}
                    </span>
                  )}
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
        <label htmlFor="metodo-pago-tipo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Agregar método
        </label>
        <select
          id="metodo-pago-tipo"
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

        {tipoNuevo === "transferencia_bancaria" && (
          <div>
            <label
              htmlFor="metodo-pago-entidad"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
            >
              Banco o entidad receptora
            </label>
            <select
              id="metodo-pago-entidad"
              value={entidadNueva}
              onChange={(e) => setEntidadNueva(e.target.value as EntidadFinanciera | "")}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="">Elige el banco...</option>
              {ENTIDADES_FINANCIERAS.map((ent) => (
                <option key={ent.valor} value={ent.valor}>
                  {ent.etiqueta}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipoNuevo === "transferencia_bancaria" && entidadNueva === "otro" && (
          <div>
            <label
              htmlFor="metodo-pago-otro"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
            >
              Nombre del banco
            </label>
            <input
              id="metodo-pago-otro"
              type="text"
              value={nombreEntidadOtro}
              onChange={(e) => setNombreEntidadOtro(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
        )}

        {tipoNuevo &&
          CAMPOS[tipoNuevo].map((campo) => (
            <div key={campo.clave}>
              <label
                htmlFor={`metodo-pago-${campo.clave}`}
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
              >
                {campo.etiqueta}
              </label>
              <input
                id={`metodo-pago-${campo.clave}`}
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
