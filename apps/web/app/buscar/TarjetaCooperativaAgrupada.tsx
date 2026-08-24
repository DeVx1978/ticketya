"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AMENIDADES_CATALOGO, listarParadasDeViaje, type ResultadoViaje, type ParadaTrayecto } from "@/lib/api";
import { ResenasCooperativa } from "./ResenasCooperativa";

function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });
}

/** Mismo cálculo real ya usado en page.tsx -- nunca un dato inventado. */
function calcularDuracion(salida: string, llegada: string | null): string | null {
  if (!llegada) return null;
  const minutos = Math.round((new Date(llegada).getTime() - new Date(salida).getTime()) / 60000);
  if (minutos <= 0) return null;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

/**
 * Fase 6-buscador (17-ago-2026) -- "Ver horarios" agrupado por
 * cooperativa, orden real del director: hoy cada horario de una
 * cooperativa aparecía como una tarjeta separada; el pasajero busca
 * una ruta y, apenas la encuentra, debe poder elegir el horario que
 * más le convenga dentro de esa misma tarjeta -- no una tarjeta por
 * cada hora.
 *
 * Componente cliente (necesita estado: qué horario está activo, si el
 * desplegable está abierto) -- recibe TODOS los viajes reales de una
 * misma cooperativa+tipo de vehículo para esta ruta/fecha, ya
 * agrupados en page.tsx (componente de servidor, mismo patrón real de
 * siempre: la agrupación ocurre sobre datos ya obtenidos, sin ningún
 * endpoint nuevo).
 */
export function TarjetaCooperativaAgrupada({
  viajes,
  hrefsPorViaje,
  esMejorPrecio,
  esTopCalificado,
  beneficiosReferidos,
}: {
  viajes: ResultadoViaje[];
  hrefsPorViaje: Record<string, string>;
  esMejorPrecio: boolean;
  esTopCalificado: boolean;
  beneficiosReferidos: { creditoReferidor: number; descuentoReferido: number } | null;
}) {
  const [viajeActivoId, setViajeActivoId] = useState(viajes[0].viajeId);
  const [horariosAbiertos, setHorariosAbiertos] = useState(false);

  const activo = viajes.find((v) => v.viajeId === viajeActivoId) ?? viajes[0];
  const [paradas, setParadas] = useState<ParadaTrayecto[]>([]);
  useEffect(() => {
    listarParadasDeViaje(activo.viajeId).then(setParadas);
  }, [activo.viajeId]);
  const duracion = calcularDuracion(activo.horaSalidaProgramada, activo.horaLlegadaEstimada);
  const hayVariosHorarios = viajes.length > 1;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      {beneficiosReferidos && beneficiosReferidos.creditoReferidor > 0 && (
        <div className="bg-emerald-50 px-5 py-2 text-xs font-medium text-emerald-800">
          🎁 Invita a un amigo y gana ${beneficiosReferidos.creditoReferidor.toFixed(2)} de crédito
        </div>
      )}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        {activo.cooperativaLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica (Cloudinary u otro), no un asset local
          <img
            src={activo.cooperativaLogoUrl}
            alt={activo.cooperativaNombre}
            className="h-12 w-auto max-w-[140px] shrink-0 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-cobalto-claro">
            <span className="font-display text-sm font-bold text-brand-cobalto">
              {activo.cooperativaNombre.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-xl font-bold text-brand-dark">{activo.cooperativaNombre}</p>
            {activo.cooperativaCalificacionPromedio !== null && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.445a1 1 0 00-1.176 0l-3.367 2.445c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.285-3.958z" />
                </svg>
                {activo.cooperativaCalificacionPromedio.toFixed(1)}
                <span className="font-normal text-brand-dark/40">({activo.cooperativaCalificacionCantidad})</span>
              </span>
            )}
          </div>
          <p className="text-sm text-brand-dark/70">{activo.tipoVehiculoNombre}</p>
          {activo.tipoVehiculoAmenidades.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {activo.tipoVehiculoAmenidades.map((a) => (
                <span key={a} className="rounded-full bg-brand-light/50 px-2 py-0.5 text-xs text-brand-dark/70">
                  {AMENIDADES_CATALOGO.find((cat) => cat.valor === a)?.etiqueta ?? a}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="max-w-[100px] shrink-0 text-right sm:max-w-[140px] sm:text-left">
              {/* Etiquetas SALIDA/LLEGADA -- hallazgo real del director
                  (24-ago-2026), comparando captura real contra su demo
                  de referencia: sin esto, solo se veía la hora en
                  negrita sin identificar qué es cada una. */}
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-brand-dark/40">
                Salida
              </span>
              <span className="block text-lg font-bold text-brand-dark">
                {formatearHora(activo.horaSalidaProgramada)}
              </span>
              <span className="block text-xs text-brand-cobalto/80">{activo.origenNombre}</span>
            </div>
            <span className="flex min-w-[64px] flex-1 items-center gap-1.5 sm:min-w-[90px]">
              {/* Punto de salida verde, punto de llegada rojo -- orden
                  real del director (24-ago-2026), mismo criterio visual
                  de su demo de referencia. El bus va CENTRADO entre el
                  texto de duración y el de distancia (antes iba a un
                  lado del bloque de texto, no en medio). */}
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="h-px flex-1 bg-brand-dark/25" />
              <span className="flex shrink-0 flex-col items-center gap-0.5">
                {duracion && (
                  <span className="text-[10px] font-medium text-brand-dark/50">Aprox. {duracion}</span>
                )}
                <Image src="/img/bus-trayecto.png" alt="" width={44} height={15} className="shrink-0" />
                {activo.distanciaKm && (
                  <span className="text-[10px] text-brand-dark/35">{activo.distanciaKm} km</span>
                )}
              </span>
              <span className="h-px flex-1 bg-brand-dark/25" />
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
            </span>
            {activo.horaLlegadaEstimada && (
              <div className="max-w-[100px] shrink-0 sm:max-w-[140px]">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-brand-dark/40">
                  Llegada
                </span>
                <span className="block text-lg font-bold text-brand-dark">
                  {formatearHora(activo.horaLlegadaEstimada)}
                </span>
                <span className="block text-xs text-brand-cobalto/80">{activo.destinoNombre}</span>
              </div>
            )}
          </div>

          {/* Hallazgo real del director (21-ago-2026): la linea de
              "Ruta: origen -> destino" repetia exactamente lo que ya
              se ve arriba (con horas) -- se quita del todo. La linea
              de paradas tambien repetia origen/destino; ahora solo
              dice por donde pasa, que es el dato real que distingue
              a una cooperativa de otra en la misma ruta (ej. Machala
              -> Quito via Naranjal, vs. via Riobamba). */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${activo.origenLatitud},${activo.origenLongitud}&destination=${activo.destinoLatitud},${activo.destinoLongitud}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-semibold text-brand-cobalto underline decoration-dotted underline-offset-2 hover:text-brand-dark"
          >
            Ver trayecto en el mapa
          </a>

          {/* Por donde pasa esta ruta -- RF-COOP-002, Fase 1 (20-ago-2026). */}
          {paradas.length > 0 && (
            <p className="mt-1 text-xs text-brand-dark/50">
              Vía {paradas.map((p) => p.ciudad).join(", ")}
            </p>
          )}

          {activo.cooperativaCalificacionPromedio !== null && (
            <ResenasCooperativa
              cooperativaId={activo.cooperativaId}
              cantidadTotal={activo.cooperativaCalificacionCantidad}
            />
          )}
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-start">
            <div className="text-right">
              {(esMejorPrecio || esTopCalificado) && (
                <div className="mb-1 flex flex-wrap justify-end gap-1">
                  {esMejorPrecio && (
                    <span className="inline-block rounded-full bg-brand-cobalto px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Mejor precio
                    </span>
                  )}
                  {esTopCalificado && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      ★ Top calificado
                    </span>
                  )}
                </div>
              )}
              <p className="font-display text-3xl font-extrabold text-brand-dark">${Number(activo.precioBase).toFixed(2)}</p>
              <p className="text-xs text-brand-dark/50">
                {activo.asientosDisponibles} asiento{activo.asientosDisponibles !== 1 ? "s" : ""} libre
                {activo.asientosDisponibles !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href={hrefsPorViaje[activo.viajeId]}
              className="shrink-0 rounded-lg bg-brand-amber px-5 py-2.5 font-semibold text-brand-dark transition hover:brightness-95"
            >
              Elegir asiento
            </Link>
          </div>

          {/* Movido aquí, debajo del botón (24-ago-2026, hallazgo real
              del director comparando contra su demo de referencia):
              antes vivía en la columna izquierda, junto al texto de la
              ruta -- en la referencia real, "Ver horarios" acompaña la
              acción de compra, no la descripción de la ruta.

              Bug real de móvil encontrado y corregido en el camino
              (mismo día): este bloque vivía como TERCER hijo dentro de
              la fila `flex items-center justify-between` de arriba --
              en móvil (donde ese contenedor sigue siendo fila, se
              apila solo desde `sm:`), un hijo `w-full` compitiendo por
              espacio con los otros 2 rompía todo el layout, cortando
              "LLEGADA"/"Ver horarios" fuera de la pantalla. Corregido
              sacándolo a un bloque HERMANO, siempre a ancho completo,
              nunca compitiendo por espacio en una fila. */}
          {hayVariosHorarios && (
            <div className="w-full text-right">
              <button
                type="button"
                onClick={() => setHorariosAbiertos((a) => !a)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-dark sm:justify-end"
              >
                🕐 Todos los horarios disponibles — {viajes.length} salidas hoy
                <span className="text-brand-dark/40">{horariosAbiertos ? "▲" : "▼"}</span>
              </button>
              {horariosAbiertos && (
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {viajes.map((v) => (
                    <button
                      key={v.viajeId}
                      type="button"
                      onClick={() => setViajeActivoId(v.viajeId)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        v.viajeId === viajeActivoId
                          ? "border-brand-cobalto bg-brand-cobalto/10 text-brand-cobalto"
                          : "border-brand-light text-brand-dark/70 hover:border-brand-cobalto/40"
                      }`}
                    >
                      {formatearHora(v.horaSalidaProgramada)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
