"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { listarPasajerosDeViajeCoop, type PasajeroDeViaje } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

const ETIQUETA_TARIFA: Record<string, string> = {
  adulto: "Adulto",
  nino: "Niño",
  tercera_edad: "Tercera edad",
  discapacidad: "Discapacidad",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  vigente: "Vigente",
  usado: "Abordó",
  cancelado: "Cancelado",
};

const ESTILO_ESTADO: Record<string, string> = {
  vigente: "bg-brand-light text-brand",
  usado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function ManifiestoViajePage() {
  const params = useParams<{ viajeId: string }>();
  const [pasajeros, setPasajeros] = useState<PasajeroDeViaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarPasajerosDeViajeCoop(token, params.viajeId)
      .then(setPasajeros)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la lista de pasajeros."));
  }, [params.viajeId]);

  const vigentes = pasajeros?.filter((p) => p.estadoBoleto !== "cancelado").length ?? 0;
  const abordaron = pasajeros?.filter((p) => p.estadoBoleto === "usado").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel-empresa/viajes" className="text-sm font-semibold text-brand hover:underline">
          ← Volver a viajes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-dark">Lista de pasajeros</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          {pasajeros === null ? "Cargando..." : `${vigentes} pasajero${vigentes === 1 ? "" : "s"} · ${abordaron} ya abordó/aron`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {pasajeros !== null && pasajeros.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay boletos vendidos para este viaje.
          </p>
        )}

        {pasajeros !== null && pasajeros.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-6 py-3">Asiento</th>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Tarifa</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {pasajeros.map((p) => (
                <tr key={p.numeroAsiento}>
                  <td className="px-6 py-3 font-semibold text-brand-dark">{p.numeroAsiento}</td>
                  <td className="px-6 py-3 font-medium text-brand-dark">
                    {p.nombreCompleto}
                    {p.esMenorEdad && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Menor
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-brand-dark/70">{p.documento}</td>
                  <td className="px-6 py-3 text-brand-dark/70">{ETIQUETA_TARIFA[p.tipoTarifa] ?? p.tipoTarifa}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[p.estadoBoleto] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {ETIQUETA_ESTADO[p.estadoBoleto] ?? p.estadoBoleto}
                    </span>
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
