"use client";

import { useEffect, useState } from "react";
import { obtenerDashboardCoop, type FilaVentaDelDia } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

export default function PanelEmpresaDashboard() {
  const [filas, setFilas] = useState<FilaVentaDelDia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token
    obtenerDashboardCoop(token)
      .then(setFilas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard."));
  }, []);

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
    </div>
  );
}
