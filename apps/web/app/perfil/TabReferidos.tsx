"use client";

import { useEffect, useState } from "react";
import { listarMisReferidos, type MiReferido, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Hallazgo real del director (15-ago-2026, recorrido en vivo de
 * producción): "Invita y Gana" ya acreditaba correctamente en el
 * backend desde hacía días, pero no existía NINGÚN lugar donde el
 * pasajero viera a quién había referido -- ni siquiera su propio
 * código, más allá de un dato suelto en el perfil.
 */
export function TabReferidos({ perfil }: { perfil: MiPerfil }) {
  const [referidos, setReferidos] = useState<MiReferido[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisReferidos(token)
      .then(setReferidos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus referidos."));
  }, []);

  function copiarCodigo() {
    navigator.clipboard.writeText(perfil.codigoPasajero).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const yaAcreditados = referidos?.filter((r) => r.creditoDisparado).length ?? 0;

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-amber to-brand-amber/70 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
          Invita a un amigo
        </p>
        <p className="mt-1 text-sm text-brand-dark/80">
          Comparte tu código — tu amigo recibe un descuento en su primer viaje, y tú ganas saldo en tu
          wallet cuando él aborde.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <p className="flex-1 rounded-lg bg-white/70 px-4 py-3 text-center font-display text-xl font-bold tracking-wide text-brand-dark">
            {perfil.codigoPasajero}
          </p>
          <button
            onClick={copiarCodigo}
            className="rounded-lg bg-brand-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/80"
          >
            {copiado ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {referidos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {referidos !== null && referidos.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no has referido a nadie — comparte tu código para empezar a ganar.
        </p>
      )}

      {referidos !== null && referidos.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-brand-dark">
            {referidos.length} {referidos.length === 1 ? "persona referida" : "personas referidas"}
            {yaAcreditados > 0 && (
              <span className="ml-2 font-normal text-brand-dark/50">
                · {yaAcreditados} ya te dieron saldo
              </span>
            )}
          </h2>
          <div className="mt-2 space-y-2">
            {referidos.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-brand-light/40 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-dark">{r.nombreReferido}</p>
                  <p className="text-xs text-brand-dark/50">Se unió el {formatearFecha(r.creadoEn)}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    r.creditoDisparado
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-dark/5 text-brand-dark/50"
                  }`}
                >
                  {r.creditoDisparado ? "Ya viajó" : "Aún no viaja"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
