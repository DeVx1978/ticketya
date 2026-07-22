"use client";

import { useEffect, useState } from "react";
import {
  obtenerDashboardCoop,
  obtenerConfiguracionFiscal,
  actualizarConfiguracionFiscal,
  type FilaVentaDelDia,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

export default function PanelEmpresaDashboard() {
  const [filas, setFilas] = useState<FilaVentaDelDia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ivaPorcentaje, setIvaPorcentaje] = useState("");
  const [ivaVisible, setIvaVisible] = useState(true);
  const [ivaAutomatico, setIvaAutomatico] = useState(true);
  const [cargandoFiscal, setCargandoFiscal] = useState(true);
  const [guardandoFiscal, setGuardandoFiscal] = useState(false);
  const [mensajeFiscal, setMensajeFiscal] = useState<string | null>(null);
  const [errorFiscal, setErrorFiscal] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token
    obtenerDashboardCoop(token)
      .then(setFilas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard."));

    obtenerConfiguracionFiscal(token)
      .then((cfg) => {
        setIvaPorcentaje(String(cfg.ivaPorcentaje));
        setIvaVisible(cfg.ivaVisibleEnBoleto);
        setIvaAutomatico(cfg.ivaSigueTasaNacional);
      })
      .catch((err) => setErrorFiscal(err instanceof Error ? err.message : "No se pudo cargar la configuración fiscal."))
      .finally(() => setCargandoFiscal(false));
  }, []);

  async function guardarFiscal(e: React.FormEvent) {
    e.preventDefault();
    setErrorFiscal(null);
    setMensajeFiscal(null);
    const token = obtenerToken();
    const valor = Number(ivaPorcentaje);
    if (!token || Number.isNaN(valor) || valor < 0 || valor > 100) {
      setErrorFiscal("Escribe un porcentaje válido entre 0 y 100.");
      return;
    }
    setGuardandoFiscal(true);
    try {
      await actualizarConfiguracionFiscal(token, {
        ivaPorcentaje: valor,
        ivaVisibleEnBoleto: ivaVisible,
        ivaSigueTasaNacional: ivaAutomatico,
      });
      setMensajeFiscal("Configuración guardada.");
    } catch (err) {
      setErrorFiscal(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoFiscal(false);
    }
  }

  const totalBoletos = filas?.reduce((acc, f) => acc + f.totalBoletos, 0) ?? 0;
  const totalVentas = filas?.reduce((acc, f) => acc + f.totalVentas, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Ventas de hoy</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Resumen de boletos vendidos hoy, en línea y en ventanilla, por ruta y por vendedor.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
            Boletos vendidos hoy
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-brand-dark">
            {filas === null ? "—" : totalBoletos}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
            Total vendido hoy
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-brand-dark">
            {filas === null ? "—" : formatearDolares(totalVentas)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">Detalle por ruta y vendedor</h2>
        </div>

        {filas === null && !error && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">Cargando...</p>
        )}

        {filas !== null && filas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay ventas registradas hoy.
          </p>
        )}

        {filas !== null && filas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3 text-right">Boletos</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filas.map((fila, i) => (
                <tr key={i}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{fila.rutaNombre}</td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {fila.vendedorNombre ?? "Venta en línea"}
                  </td>
                  <td className="px-6 py-3 text-right text-brand-dark/70">{fila.totalBoletos}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(fila.totalVentas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Configuración de IVA</h2>
        <p className="mt-1 text-sm text-brand-dark/60">
          El precio de cada boleto ya incluye este porcentaje — no se suma aparte al total.
        </p>

        {cargandoFiscal ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardarFiscal} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Porcentaje de IVA
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  className="w-28 rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                />
                <span className="text-brand-dark/60">%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input
                type="checkbox"
                checked={ivaVisible}
                onChange={(e) => setIvaVisible(e.target.checked)}
                className="h-4 w-4 rounded border-brand-light text-brand focus:ring-brand-medium"
              />
              Mostrar el desglose de IVA en el boleto del pasajero
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input
                type="checkbox"
                checked={ivaAutomatico}
                onChange={(e) => setIvaAutomatico(e.target.checked)}
                className="h-4 w-4 rounded border-brand-light text-brand focus:ring-brand-medium"
              />
              Seguir el IVA nacional automáticamente
            </label>
            <button
              type="submit"
              disabled={guardandoFiscal}
              className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {guardandoFiscal ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
        {mensajeFiscal && <p className="mt-3 text-sm font-medium text-emerald-600">{mensajeFiscal}</p>}
        {errorFiscal && <p className="mt-3 text-sm font-medium text-red-600">{errorFiscal}</p>}
      </div>
    </div>
  );
}
