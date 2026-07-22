"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listarMisBoletos, calificarViaje, type MiBoleto } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FormularioCalificar({ boletoId, onEnviado }: { boletoId: string; onEnviado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [puntuacion, setPuntuacion] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Calificar viaje
      </button>
    );
  }

  async function enviar() {
    const token = tokenValido();
    if (!token) {
      setError("Tu sesión expiró — vuelve a iniciar sesión.");
      return;
    }
    if (puntuacion === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await calificarViaje(token, boletoId, puntuacion, comentario.trim() || undefined);
      onEnviado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la calificación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg bg-brand-light/30 p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPuntuacion(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} estrellas`}
            className="text-2xl leading-none"
          >
            <span className={n <= (hover || puntuacion) ? "text-amber-500" : "text-brand-dark/20"}>★</span>
          </button>
        ))}
      </div>
      {puntuacion > 0 && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cuéntanos más (opcional)"
            rows={2}
            maxLength={500}
            className="mt-2 w-full rounded-lg border border-brand-light bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-2 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function MisBoletosPage() {
  const router = useRouter();
  const [boletos, setBoletos] = useState<MiBoleto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  function cargar() {
    const token = tokenValido();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent("/mis-boletos")}`);
      return;
    }
    listarMisBoletos(token)
      .then(setBoletos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar tus boletos."));
  }

  useEffect(cargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <h1 className="font-display text-2xl font-bold text-brand-dark">Mis boletos</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Tu historial de viajes comprados. Podrás calificar cada uno después de la hora estimada de llegada.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {boletos === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {boletos !== null && boletos.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">Todavía no tienes boletos comprados.</p>
      )}

      <div className="mt-6 space-y-3">
        {boletos?.map((b) => {
          const referenciaLlegada = b.horaLlegadaEstimada ?? b.horaSalidaProgramada;
          const yaLlego = new Date() >= new Date(referenciaLlegada);
          return (
            <div key={b.boletoId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="font-display font-bold text-brand-dark">
                {b.origenCiudad} → {b.destinoCiudad}
              </p>
              <p className="text-sm text-brand-dark/60">
                {b.cooperativaNombre} · Sale {formatearFechaHora(b.horaSalidaProgramada)}
              </p>

              <div className="mt-3">
                {b.yaCalificado ? (
                  <p className="text-sm font-medium text-emerald-600">Ya calificaste este viaje. ¡Gracias!</p>
                ) : b.puedeCalificar ? (
                  <FormularioCalificar
                    boletoId={b.boletoId}
                    onEnviado={() => {
                      setMensajeExito("¡Gracias por calificar tu viaje!");
                      cargar();
                    }}
                  />
                ) : (
                  <p className="text-xs text-brand-dark/40">
                    Podrás calificar este viaje después de tu llegada estimada
                    {b.horaLlegadaEstimada && ` (${formatearFechaHora(b.horaLlegadaEstimada)})`}
                    {!yaLlego && !b.horaLlegadaEstimada && ""}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
