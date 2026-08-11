"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  obtenerMapaAsientos,
  bloquearAsiento,
  interpretarCelda,
  obtenerPisosDeDistribucion,
  type MapaAsientos,
} from "@/lib/api";
import { tokenValido } from "@/lib/auth";

/**
 * Vacío real de diseño encontrado el 29-jul-2026: hasta ahora esta
 * pantalla ignoraba `distribucionAsientos` (el backend ya la enviaba)
 * y siempre dibujaba una simplificación de 2+2 — un bus real de dos
 * pisos o con sección VIP se veía como una fila plana, sin importar
 * su configuración real.
 *
 * Ahora: si el tipo de vehículo tiene una distribución real
 * configurada (uno o más pisos, cada uno con sus filas), se usa tal
 * cual. Si no la tiene (tipos de vehículo antiguos, o cooperativas que
 * todavía no configuraron la suya), se cae de forma segura al mismo
 * generador simple 2+2 de siempre — nadie se queda sin mapa de
 * asientos mientras se termina de adoptar el nuevo formato.
 *
 * Ítem 14 (05-ago-2026) -- el generador de respaldo y obtenerPisos se
 * movieron de verdad a lib/api.ts, compartidos con el backend (antes
 * vivían duplicados aquí y en asientos.service.ts, dos copias que
 * podían desincronizarse -- ver hallazgo real corregido en
 * distribucion-asientos.util.ts).
 */

export default function SeleccionAsientosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = usePromise(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Hallazgo real de auditoría (28-jul-2026): si el usuario elegía un
  // asiento sin sesión iniciada, lo mandábamos a /ingresar y al volver
  // este estado se perdía por completo (vivía solo en memoria del
  // componente) — tenía que elegir el asiento otra vez. Ahora, si
  // volvemos de login con `?preseleccionado=8A` en la URL (ver
  // `continuar()` más abajo), lo restauramos aquí.
  // Fase 7-item29 (07-ago-2026) -- multi-pasajero: de un solo asiento a
  // un arreglo. Limite de 10, mismo tope ya usado en el campo
  // "Pasajeros" del buscador (BuscadorForm.tsx, max={10}).
  const MAXIMO_ASIENTOS = 10;
  const preseleccionadoInicial = searchParams.get("preseleccionado");
  const [seleccionados, setSeleccionados] = useState<string[]>(
    () => (preseleccionadoInicial ? preseleccionadoInicial.split(",") : []),
  );
  const [bloqueando, setBloqueando] = useState(false);

  function alternarAsiento(numero: string) {
    setSeleccionados((actual) => {
      if (actual.includes(numero)) {
        return actual.filter((n) => n !== numero);
      }
      if (actual.length >= MAXIMO_ASIENTOS) {
        return actual;
      }
      return [...actual, numero];
    });
  }

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
      <main className="flex-1 px-4 py-16 text-center text-brand-dark/70">
        Cargando mapa de asientos...
      </main>
    );
  }

  const estadoPorNumero = new Map(mapa.asientosNoDisponibles.map((a) => [a.numeroAsiento, a.estado]));
  const pisos = obtenerPisosDeDistribucion(mapa.distribucionAsientos, mapa.capacidadTotal);

  // Ítem 14 (05-ago-2026) -- la leyenda de etiquetas solo se muestra si
  // el vehículo tiene al menos un asiento con alguna, para no ensuciar
  // la pantalla en la enorme mayoría de viajes que no usan esto todavía.
  const hayEtiquetas = pisos.some((piso) =>
    piso.filas.some((fila) =>
      fila.celdas.some((celda) => {
        const interpretada = interpretarCelda(celda, piso);
        return interpretada !== null && interpretada.etiquetas.length > 0;
      }),
    ),
  );

  async function continuar() {
    if (seleccionados.length === 0) return;
    const token = tokenValido();
    if (!token) {
      const volver = `/viajes/${viajeId}/asientos?preseleccionado=${encodeURIComponent(seleccionados.join(","))}`;
      router.push(`/ingresar?volverA=${encodeURIComponent(volver)}`);
      return;
    }
    setBloqueando(true);
    setError(null);
    try {
      // Fase 7-item29 (07-ago-2026) -- se re-bloquean TODOS los asientos
      // elegidos en cada llamada a continuar(), no solo el ultimo -- el
      // backend ya soporta re-bloquear el propio asiento sin fallar,
      // renovando su tiempo de expiracion (ver asiento.repositorio.drizzle.ts,
      // comentario "es el mismo usuario re-seleccionando su propio
      // asiento"). Esto sincroniza el reloj de expiracion de todos los
      // asientos del grupo, para que el primero elegido no expire
      // mientras se llenan los datos de los demas en el checkout.
      for (const numero of seleccionados) {
        await bloquearAsiento(viajeId, numero, token);
      }
      router.push(
        `/viajes/${viajeId}/checkout?asientos=${encodeURIComponent(seleccionados.join(","))}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear el asiento.");
      setSeleccionados([]);
      // Refresca el mapa para reflejar el estado real tras el intento fallido.
      obtenerMapaAsientos(viajeId).then(setMapa);
    } finally {
      setBloqueando(false);
    }
  }

  const ocupados = mapa.asientosNoDisponibles.length;
  const disponibles = mapa.capacidadTotal - ocupados;

  return (
    <main className="flex-1 bg-brand-light/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-bold text-brand-dark">Elige tu asiento</h1>
        <p className="mt-1 flex items-center gap-3 text-sm text-brand-dark/70">
          <span>
            <span className="font-semibold text-brand-dark">{disponibles}</span> disponibles
          </span>
          <span className="text-brand-dark/30">·</span>
          <span>
            <span className="font-semibold text-brand-dark">{ocupados}</span> ocupados
          </span>
          <span className="text-brand-dark/30">·</span>
          <span>{mapa.capacidadTotal} en total</span>
        </p>

        {(!mapa.permiteCancelacion || !mapa.permiteReprogramacion) && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">Antes de comprar, lee esto:</p>
            {!mapa.permiteCancelacion && !mapa.permiteReprogramacion ? (
              <p className="mt-1">
                Esta cooperativa no permite cambios ni devoluciones — si no viajas, pierdes el
                boleto completo.
              </p>
            ) : (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {!mapa.permiteCancelacion && <li>No se puede cancelar este boleto.</li>}
                {!mapa.permiteReprogramacion && <li>No se puede reprogramar este boleto.</li>}
              </ul>
            )}
          </div>
        )}

        {hayEtiquetas && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-brand-dark/70">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> VIP
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> Exclusivo mujeres
            </span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {pisos.map((piso, pisoIdx) => (
            <div key={pisoIdx} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              {pisos.length > 1 && (
                <div className="mb-4 flex items-center justify-center gap-2">
                  <h2 className="font-display text-sm font-bold text-brand-dark">{piso.nombre}</h2>
                  {piso.categoria && (
                    <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
                      {piso.categoria}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {piso.filas.map((fila, i) => (
                  <div key={i} className="flex items-center justify-center gap-2">
                    {fila.celdas.map((celda, j) => {
                      const interpretada = interpretarCelda(celda, piso);
                      if (interpretada === null) {
                        return <span key={j} className="w-4" />;
                      }
                      const { numero, etiquetas } = interpretada;
                      const estado = estadoPorNumero.get(numero);
                      const noDisponible = estado === "ocupado" || estado === "bloqueado_temporal";
                      const esSeleccionado = seleccionados.includes(numero);
                      return (
                        <div key={numero} className="relative">
                        <button
                            type="button"
                            disabled={noDisponible}
                            onClick={() => alternarAsiento(numero)}
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
                          {/* Ítem 14 (05-ago-2026) -- indicadores de etiqueta, un asiento puede tener ambas a la vez. */}
                          {!noDisponible && etiquetas.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex gap-0.5">
                              {etiquetas.includes("vip") && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-white"
                                  title="VIP"
                                />
                              )}
                              {etiquetas.includes("mujeres") && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full bg-pink-500 ring-1 ring-white"
                                  title="Exclusivo mujeres"
                                />
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <button
          type="button"
          disabled={seleccionados.length === 0 || bloqueando}
          onClick={continuar}
          className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {bloqueando
            ? "Reservando..."
            : seleccionados.length === 0
              ? "Elige un asiento"
              : seleccionados.length === 1
                ? `Continuar con el asiento ${seleccionados[0]}`
                : `Continuar con ${seleccionados.length} asientos`}
        </button>
      </div>
    </main>
  );
}
