"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { obtenerMapaAsientos, bloquearAsiento, type MapaAsientos, type PisoDistribucionAsientos } from "@/lib/api";
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
 */
function generarPisosDeRespaldo(capacidadTotal: number): PisoDistribucionAsientos[] {
  const letras = ["A", "B", "C", "D"];
  const filas: Array<{ celdas: Array<string | null> }> = [];
  let restante = capacidadTotal;
  let numeroFila = 1;
  while (restante > 0) {
    const enEstaFila = Math.min(4, restante);
    const celdas: Array<string | null> = letras
      .slice(0, enEstaFila)
      .map((l) => `${numeroFila}${l}`);
    celdas.splice(2, 0, null); // pasillo entre la 2da y 3ra columna
    filas.push({ celdas });
    restante -= enEstaFila;
    numeroFila++;
  }
  return [{ nombre: "Piso único", filas }];
}

function obtenerPisos(mapa: MapaAsientos): PisoDistribucionAsientos[] {
  const distribucion = mapa.distribucionAsientos;
  if (distribucion && Array.isArray(distribucion.pisos) && distribucion.pisos.length > 0) {
    return distribucion.pisos;
  }
  return generarPisosDeRespaldo(mapa.capacidadTotal);
}

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
  const [seleccionado, setSeleccionado] = useState<string | null>(
    () => searchParams.get("preseleccionado"),
  );
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
  const pisos = obtenerPisos(mapa);

  async function continuar() {
    if (!seleccionado) return;
    const token = tokenValido();
    if (!token) {
      const volver = `/viajes/${viajeId}/asientos?preseleccionado=${encodeURIComponent(seleccionado)}`;
      router.push(`/ingresar?volverA=${encodeURIComponent(volver)}`);
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
                    {fila.celdas.map((numero, j) => {
                      if (numero === null) {
                        return <span key={j} className="w-4" />;
                      }
                      const estado = estadoPorNumero.get(numero);
                      const noDisponible = estado === "ocupado" || estado === "bloqueado_temporal";
                      const esSeleccionado = seleccionado === numero;
                      return (
                        <button
                          key={numero}
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
