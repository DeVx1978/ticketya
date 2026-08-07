"use client";

import { useEffect, useState } from "react";
import {
  API_URL,
  dashboardNacionalAdmin,
  obtenerCargoPlataforma,
  actualizarCargoPlataforma,
  contarUsuariosPorRolAdmin,
  type FilaVentaNacional,
  type ConteoUsuarios,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

const ETIQUETA_ROL: Record<string, string> = {
  pasajero: "Pasajeros",
  vendedor: "Vendedores",
  admin_cooperativa: "Admins de cooperativa",
  admin_plataforma: "Admins de plataforma",
};

export default function AdminHome() {
  const [ivaPorcentaje, setIvaPorcentaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ventas, setVentas] = useState<FilaVentaNacional[] | null>(null);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<ConteoUsuarios | null>(null);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const [cargoPlataforma, setCargoPlataforma] = useState("");
  const [cargandoCargo, setCargandoCargo] = useState(true);
  const [guardandoCargo, setGuardandoCargo] = useState(false);
  const [errorCargo, setErrorCargo] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token
    fetch(`${API_URL}/admin/iva-nacional`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((res) => res.json())
      .then((cuerpo: { ivaPorcentaje: number }) => setIvaPorcentaje(String(cuerpo.ivaPorcentaje)))
      .catch(() => setError("No se pudo cargar el IVA nacional."))
      .finally(() => setCargando(false));

    dashboardNacionalAdmin(token)
      .then(setVentas)
      .catch((err) => setErrorVentas(err instanceof Error ? err.message : "No se pudo cargar el dashboard nacional."));

    contarUsuariosPorRolAdmin(token)
      .then(setUsuarios)
      .catch((err) => setErrorUsuarios(err instanceof Error ? err.message : "No se pudo cargar el contador de usuarios."));

    obtenerCargoPlataforma(token)
      .then((monto) => setCargoPlataforma(String(monto)))
      .catch((err) => setErrorCargo(err instanceof Error ? err.message : "No se pudo cargar el cargo de plataforma."))
      .finally(() => setCargandoCargo(false));
  }, []);

  async function guardarCargo(e: React.FormEvent) {
    e.preventDefault();
    setErrorCargo(null);
    const token = obtenerToken();
    const valor = Number(cargoPlataforma);
    if (!token || Number.isNaN(valor) || valor < 0) {
      setErrorCargo("Escribe un monto válido, igual o mayor a $0.");
      return;
    }
    setGuardandoCargo(true);
    try {
      await actualizarCargoPlataforma(token, valor);
      setMensajeExito("Cargo de plataforma actualizado.");
    } catch (err) {
      setErrorCargo(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoCargo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    const token = obtenerToken();
    const valor = Number(ivaPorcentaje);
    if (!token || Number.isNaN(valor) || valor < 0 || valor > 100) {
      setError("Escribe un porcentaje válido entre 0 y 100.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/admin/iva-nacional`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ivaPorcentaje: valor }),
      });
      const cuerpo = await res.json();
      if (!res.ok) {
        throw new Error(cuerpo?.message ?? "No se pudo guardar el IVA nacional.");
      }
      setMensaje(
        `Guardado. Se propagó a ${cuerpo.cooperativasActualizadas} cooperativa(s) en modo automático. Las que tienen un valor propio manual no se tocaron.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Dashboard nacional</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Ventas acumuladas por cooperativa, en toda la red (RF-ADMIN-002).
        </p>
      </div>

      {errorVentas && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {errorVentas}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Cooperativas activas</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-brand-dark">
            {ventas === null ? "—" : ventas.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Boletos vendidos (total)</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-brand-dark">
            {ventas === null ? "—" : ventas.reduce((acc, v) => acc + v.totalBoletos, 0)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Total vendido (histórico)</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-brand-dark">
            {ventas === null ? "—" : formatearDolares(ventas.reduce((acc, v) => acc + v.totalVentas, 0))}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">Ventas por cooperativa</h2>
        </div>

        {ventas === null && !errorVentas && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">Cargando...</p>
        )}

        {ventas !== null && ventas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay cooperativas registradas.
          </p>
        )}

        {ventas !== null && ventas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Cooperativa</th>
                <th className="px-6 py-3 text-right">Boletos vendidos</th>
                <th className="px-6 py-3 text-right">Total vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {ventas.map((v, i) => (
                <tr key={i}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{v.cooperativaNombre}</td>
                  <td className="px-6 py-3 text-right text-brand-dark/70">{v.totalBoletos}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(v.totalVentas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-lg font-bold text-brand-dark">Usuarios registrados</h2>
        <p className="mt-1 text-sm text-brand-dark/70">
          Total de cuentas activas en la plataforma, desglosado por rol (RF-ADMIN, sección 3.13).
        </p>

        {errorUsuarios && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {errorUsuarios}
          </div>
        )}

        {usuarios === null && !errorUsuarios && (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        )}

        {usuarios !== null && (
          <>
            <p className="mt-4 font-display text-3xl font-extrabold text-brand-dark">
              {usuarios.total}
              <span className="ml-2 text-sm font-normal text-brand-dark/50">usuarios activos en total</span>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              {usuarios.porRol.map((fila) => (
                <div key={fila.rol} className="rounded-xl bg-brand-light/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
                    {ETIQUETA_ROL[fila.rol] ?? fila.rol}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{fila.cantidad}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-lg font-bold text-brand-dark">IVA nacional</h2>
        <p className="mt-1 text-sm text-brand-dark/70">
          Al cambiarlo, se propaga de inmediato a todas las cooperativas que estén en modo automático. Las que
          fijaron su propio valor manualmente no se ven afectadas.
        </p>

        {cargando ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardar} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Porcentaje de IVA vigente
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
                <span className="text-brand-dark/70">%</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {guardando ? "Propagando..." : "Guardar y propagar"}
            </button>
          </form>
        )}
        {mensaje && <p className="mt-3 text-sm font-medium text-emerald-600">{mensaje}</p>}
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-lg font-bold text-brand-dark">Cargo de plataforma</h2>
        <p className="mt-1 text-sm text-brand-dark/70">
          Monto fijo que la plataforma cobra por cada pasajero, sumado aparte de la tarifa (RN-002).
        </p>

        {cargandoCargo ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardarCargo} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Monto por pasajero
              </label>
              <div className="flex items-center gap-1">
                <span className="text-brand-dark/70">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cargoPlataforma}
                  onChange={(e) => setCargoPlataforma(e.target.value)}
                  className="w-28 rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={guardandoCargo}
              className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {guardandoCargo ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
        {errorCargo && <p className="mt-3 text-sm font-medium text-red-600">{errorCargo}</p>}
      </div>
    </div>
  );
}
