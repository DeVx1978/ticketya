"use client";

import { useEffect, useState, Fragment, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { obtenerMapaAsientos, bloquearAsiento, type MapaAsientos } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";

/**
 * Genera un mapa de asientos simple 2+2 (4 por fila, pasillo al medio) a
 * partir de la capacidad total del vehículo. No usa el contenido real de
 * `distribucionAsientos` todavía (hoy es JSON libre sin una forma fija
 * acordada — ver nota en packages/db/schema/flota.ts); esto es una
 * simplificación consciente para tener una primera pantalla funcional,
 * no la versión final de cómo se va a ver el mapa de cada cooperativa.
 */
function generarNumerosAsiento(capacidadTotal: number): string[][] {
  const letras = ["A", "B", "C", "D"];
  const filas: string[][] = [];
  let restante = capacidadTotal;
  let numeroFila = 1;
  while (restante > 0) {
    const enEstaFila = Math.min(4, restante);
    filas.push(letras.slice(0, enEstaFila).map((l) => `${numeroFila}${l}`));
    restante -= enEstaFila;
    numeroFila++;
  }
  return filas;
}

export default function SeleccionAsientosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = usePromise(params);
  const router = useRouter();

  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [bloqueando, setBloqueando] = useState(false);

  useEffect(() => {
    obtenerMapaAsientos(viajeId)
      .then(setMapa)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el viaje."));
  }, [viajeId]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand hover:underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  if (!mapa) {
    return (
      <main className="flex-1 px-4 py-16 text-center text-brand-dark/60">
        Cargando mapa de asientos...
      </main>
    );
  }

  const estadoPorNumero = new Map(mapa.asientosNoDisponibles.map((a) => [a.numeroAsiento, a.estado]));
  const filas = generarNumerosAsiento(mapa.capacidadTotal);

  async function continuar() {
    if (!seleccionado) return;
    const token = obtenerToken();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent(`/viajes/${viajeId}/asientos`)}`);
      return;
    }
    setBloqueando(true);
    setError(null);
    try {
      await bloquearAsiento(viajeId, seleccionado, token);
      router.push(`/viajes/${viajeId}/checkout?asiento=${encodeURIComponent(seleccionado)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear el asiento.");
      setSeleccionado(null);
      // Refresca el mapa para reflejar el estado real tras el intento fallido.
      obtenerMapaAsientos(viajeId).then(setMapa);
    } finally {
      setBloqueando(false);
    }
  }

  return (
    <main className="flex-1 bg-brand-light/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-bold text-brand-dark">Elige tu asiento</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          {mapa.capacidadTotal} puestos en total. Los grises ya no están disponibles.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="space-y-2">
            {filas.map((fila, i) => (
              <div key={i} className="flex items-center justify-center gap-2">
                {fila.map((numero, j) => {
                  const estado = estadoPorNumero.get(numero);
                  const noDisponible = estado === "ocupado" || estado === "bloqueado_temporal";
                  const esSeleccionado = seleccionado === numero;
                  return (
                    <Fragment key={numero}>
                      {j === 2 && <span className="w-4" />}
                      <button
                        type="button"
                        disabled={noDisponible}
                        onClick={() => setSeleccionado(numero)}
                        className={`h-10 w-10 rounded-lg text-xs font-semibold transition ${
                          noDisponible
                            ? "cursor-not-allowed bg-gray-200 text-gray-400"
                            : esSeleccionado
                              ? "bg-brand-amber text-brand-dark ring-2 ring-brand-dark"
                              : "bg-brand-light text-brand-dark hover:bg-brand-medium hover:text-white"
                        }`}
                      >
                        {numero}
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <button
          type="button"
          disabled={!seleccionado || bloqueando}
          onClick={continuar}
          className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {bloqueando ? "Reservando..." : seleccionado ? `Continuar con el asiento ${seleccionado}` : "Elige un asiento"}
        </button>
      </div>
    </main>
  );
}
