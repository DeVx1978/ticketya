"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

export default function AdminHome() {
  const [ivaPorcentaje, setIvaPorcentaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token
    fetch(`${API_URL}/admin/iva-nacional`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((res) => res.json())
      .then((cuerpo: { ivaPorcentaje: number }) => setIvaPorcentaje(String(cuerpo.ivaPorcentaje)))
      .catch(() => setError("No se pudo cargar el IVA nacional."))
      .finally(() => setCargando(false));
  }, []);

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
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Panel Admin</h1>
        <p className="mt-2 text-sm text-brand-dark/60">
          El acceso protegido ya funciona. El dashboard real (cooperativas, ventas nacionales) es el siguiente paso.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-lg font-bold text-brand-dark">IVA nacional</h2>
        <p className="mt-1 text-sm text-brand-dark/60">
          Al cambiarlo, se propaga de inmediato a todas las cooperativas que estén en modo automático. Las que
          fijaron su propio valor manualmente no se ven afectadas.
        </p>

        {cargando ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardar} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
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
                <span className="text-brand-dark/60">%</span>
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
    </div>
  );
}
