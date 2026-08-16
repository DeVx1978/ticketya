import Link from "next/link";
import { buscarViajes, AMENIDADES_CATALOGO, type Amenidad, type ResultadoViaje } from "@/lib/api";
import { FiltrosBusqueda } from "./FiltrosBusqueda";
import { ResenasCooperativa } from "./ResenasCooperativa";
import { OrdenarPor } from "./OrdenarPor";

function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });
}

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Fase 5-buscador (16-ago-2026) -- duración real del viaje, calculada
 * de los 2 horarios que YA existen en ResultadoViaje (horaSalidaProgramada,
 * horaLlegadaEstimada) -- nunca un dato inventado. Si la cooperativa no
 * cargó hora de llegada estimada, simplemente no se muestra duración
 * (se degrada con gracia, en vez de forzar un número falso).
 */
function calcularDuracion(salida: string, llegada: string | null): string | null {
  if (!llegada) return null;
  const minutos = Math.round((new Date(llegada).getTime() - new Date(salida).getTime()) / 60000);
  if (minutos <= 0) return null;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

/**
 * Fase 7-idayvuelta (11-ago-2026) -- tarjeta de resultado extraida
 * como funcion separada, reutilizada para ida y para vuelta (antes
 * vivia una sola vez, embebida directo en el .map() de la pagina).
 * `hrefBase` decide a donde va "Elegir asiento" -- si ya se eligio el
 * tramo de ida, el tramo de vuelta debe llevar esa eleccion consigo en
 * la URL, para poder combinar ambos en un solo checkout mas adelante.
 *
 * Fase 5-buscador (16-ago-2026) -- rediseño real, comparando con
 * referencias de la industria (redBus, FlixBus): agregada la línea
 * visual del trayecto (salida -- duración -- llegada, como cualquier
 * resultado de vuelo/bus real) y la insignia "Mejor precio" (recibida
 * como prop, calculada una sola vez en la página con los datos reales
 * de TODOS los resultados -- nunca decidida tarjeta por tarjeta).
 */
function TarjetaResultado({
  r,
  hrefAsientos,
  esMejorPrecio,
}: {
  r: ResultadoViaje;
  hrefAsientos: string;
  esMejorPrecio: boolean;
}) {
  const duracion = calcularDuracion(r.horaSalidaProgramada, r.horaLlegadaEstimada);
  return (
    <div
      key={r.viajeId}
      className="relative flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:flex-row md:items-center md:justify-between"
    >
      {esMejorPrecio && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-brand-cobalto px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Mejor precio
        </span>
      )}
      <div>
        <div className="flex items-center gap-2">
          {r.cooperativaLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica (Cloudinary u otro), no un asset local
            <img
              src={r.cooperativaLogoUrl}
              alt={r.cooperativaNombre}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5"
            />
          )}
          <p className="font-display text-lg font-bold text-brand-dark">{r.cooperativaNombre}</p>
          {r.cooperativaCalificacionPromedio !== null && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.445a1 1 0 00-1.176 0l-3.367 2.445c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.285-3.958z" />
              </svg>
              {r.cooperativaCalificacionPromedio.toFixed(1)}
              <span className="font-normal text-brand-dark/40">({r.cooperativaCalificacionCantidad})</span>
            </span>
          )}
        </div>
        <p className="text-sm text-brand-dark/70">{r.tipoVehiculoNombre}</p>
        {r.tipoVehiculoAmenidades.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.tipoVehiculoAmenidades.map((a) => (
              <span
                key={a}
                className="rounded-full bg-brand-light/50 px-2 py-0.5 text-xs text-brand-dark/70"
              >
                {AMENIDADES_CATALOGO.find((cat) => cat.valor === a)?.etiqueta ?? a}
              </span>
            ))}
          </div>
        )}

        {/* Línea visual del trayecto -- salida, duración real (si existe), llegada. */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-brand-dark">{formatearHora(r.horaSalidaProgramada)}</span>
          <span className="flex flex-1 items-center gap-1 text-brand-dark/25">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="h-px flex-1 bg-current" />
            {duracion && (
              <span className="shrink-0 text-[10px] font-medium text-brand-dark/50">{duracion}</span>
            )}
            <span className="h-px flex-1 bg-current" />
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {r.horaLlegadaEstimada && (
            <span className="text-sm font-semibold text-brand-dark">{formatearHora(r.horaLlegadaEstimada)}</span>
          )}
        </div>

        {/* Ítem 15 (05-ago-2026) -- link estándar de Google Maps, sin SDK ni API key. */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${r.origenLatitud},${r.origenLongitud}&destination=${r.destinoLatitud},${r.destinoLongitud}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-semibold text-brand-cobalto underline decoration-dotted underline-offset-2 hover:text-brand-dark"
        >
          Ver trayecto en el mapa
        </a>
        {/* Reseñas de texto reales (13-ago-2026) -- mismo umbral mínimo
            de 5 calificaciones que ya gatea el promedio numérico de
            arriba, así que se reutiliza esa misma condición. */}
        {r.cooperativaCalificacionPromedio !== null && (
          <ResenasCooperativa
            cooperativaId={r.cooperativaId}
            cantidadTotal={r.cooperativaCalificacionCantidad}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-6 md:justify-end">
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold text-brand-dark">${Number(r.precioBase).toFixed(2)}</p>
          <p className="text-xs text-brand-dark/50">
            {r.asientosDisponibles} asiento{r.asientosDisponibles !== 1 ? "s" : ""} libre
            {r.asientosDisponibles !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={hrefAsientos}
          className="shrink-0 rounded-lg bg-brand-amber px-5 py-2.5 font-semibold text-brand-dark transition hover:brightness-95"
        >
          Elegir asiento
        </Link>
      </div>
    </div>
  );
}

export default async function ResultadosBusquedaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { origenId, destinoId, origenCiudad, destinoCiudad, fecha, pasajeros, horaDesde, horaHasta, amenidades } = sp;
  // Fase 7-idayvuelta (11-ago-2026) -- fechaVuelta viene del buscador
  // solo si el pasajero activo el interruptor "Ida y vuelta". idaViajeId
  // y idaAsiento llegan cuando ya se eligio el tramo de ida y se esta
  // viendo la busqueda del tramo de vuelta (ver TarjetaResultado, que
  // arma ese link al elegir "Elegir asiento" en el tramo de ida).
  const { fechaVuelta, idaViajeId, idaAsientos, ordenarPor } = sp;
  const esIdaYVuelta = !!fechaVuelta;

  if (!origenId || !destinoId || !fecha) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-brand-dark">Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand-cobalto underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const amenidadesArr = amenidades ? (amenidades.split(",") as Amenidad[]) : undefined;

  let resultadosIda: ResultadoViaje[] = [];
  let resultadosVuelta: ResultadoViaje[] = [];
  let error: string | null = null;
  try {
    // Fase 7-idayvuelta (11-ago-2026) -- si es ida y vuelta, se buscan
    // los 2 tramos en paralelo (ida: origen->destino; vuelta:
    // destino->origen, invertidos), no uno despues del otro.
    const busquedas = [
      buscarViajes({
        origenId,
        destinoId,
        fecha,
        pasajeros: Number(pasajeros ?? 1),
        horaDesde,
        horaHasta,
        amenidades: amenidadesArr,
      }),
    ];
    if (esIdaYVuelta && fechaVuelta) {
      busquedas.push(
        buscarViajes({
          origenId: destinoId,
          destinoId: origenId,
          fecha: fechaVuelta,
          pasajeros: Number(pasajeros ?? 1),
        }),
      );
    }
    const resultados = await Promise.all(busquedas);
    resultadosIda = resultados[0];
    resultadosVuelta = resultados[1] ?? [];
  } catch {
    error = "No se pudo completar la búsqueda. Intenta de nuevo en un momento.";
  }

  // Fase 5-buscador (16-ago-2026) -- ordenamiento real, del lado del
  // servidor, sobre los datos reales ya obtenidos -- nunca se inventa
  // ni se reordena en el cliente por separado.
  function ordenar(lista: ResultadoViaje[]): ResultadoViaje[] {
    const copia = [...lista];
    switch (ordenarPor) {
      case "precio_desc":
        return copia.sort((a, b) => Number(b.precioBase) - Number(a.precioBase));
      case "salida_temprano":
        return copia.sort(
          (a, b) => new Date(a.horaSalidaProgramada).getTime() - new Date(b.horaSalidaProgramada).getTime(),
        );
      case "precio_asc":
      default:
        return copia.sort((a, b) => Number(a.precioBase) - Number(b.precioBase));
    }
  }
  resultadosIda = ordenar(resultadosIda);
  resultadosVuelta = ordenar(resultadosVuelta);

  // Fase 7-idayvuelta (11-ago-2026) -- construye el link de "Elegir
  // asiento" para cada tramo:
  // - Ida, viaje sencillo: va directo a elegir asientos.
  // - Ida, dentro de ida y vuelta: al elegir un viaje de ida, en vez de
  //   ir a elegir asientos, vuelve aqui mismo (a esta pagina de
  //   resultados) pero ahora mostrando el tramo de VUELTA, cargando el
  //   viajeId de ida elegido en la URL para no perderlo.
  // - Vuelta: ya se conoce el viaje de ida (idaViajeId, idaAsiento en
  //   la URL) -- el link de "Elegir asiento" de la vuelta lleva ambos
  //   tramos juntos hacia la pantalla de asientos del tramo de vuelta,
  //   que a su vez debe combinar los 2 en el checkout final.
  function hrefParaIda(viajeId: string): string {
    if (!esIdaYVuelta) {
      return `/viajes/${viajeId}/asientos`;
    }
    // Fase 7-idayvuelta (11-ago-2026) -- hallazgo real corregido: antes
    // esto saltaba directo de vuelta a /buscar, SIN dejar elegir
    // asiento de ida en absoluto. Ahora sí lleva al mapa de asientos
    // real del tramo de ida, cargando los datos del tramo de vuelta en
    // la URL (prefijo "vuelta_") para que esa pantalla sepa que, al
    // terminar de elegir el asiento de ida, debe volver a /buscar por
    // el tramo de vuelta -- no ir directo al checkout.
    const params = new URLSearchParams({
      vuelta_origenId: destinoId ?? "",
      vuelta_origenCiudad: destinoCiudad ?? "",
      vuelta_destinoId: origenId ?? "",
      vuelta_destinoCiudad: origenCiudad ?? "",
      vuelta_fecha: fechaVuelta ?? "",
      pasajeros: pasajeros ?? "1",
    });
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  function hrefParaVuelta(viajeId: string): string {
    const params = new URLSearchParams({
      idaViajeId: idaViajeId ?? "",
      idaAsientos: idaAsientos ?? "",
    });
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  const mostrandoVuelta = esIdaYVuelta && !!idaViajeId;
  const resultadosAMostrar = mostrandoVuelta ? resultadosVuelta : resultadosIda;

  // Fase 5-buscador (16-ago-2026) -- "Mejor precio" real, calculado
  // una sola vez sobre TODOS los resultados que se van a mostrar, no
  // una insignia fija ni inventada por tarjeta.
  const precioMinimo =
    resultadosAMostrar.length > 0
      ? Math.min(...resultadosAMostrar.map((r) => Number(r.precioBase)))
      : null;

  return (
    <main className="flex-1 bg-brand-light/40">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/" className="text-sm font-semibold text-brand-cobalto hover:underline">
          ← Nueva búsqueda
        </Link>

        {esIdaYVuelta && (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <span className={mostrandoVuelta ? "text-brand-dark/40" : "text-brand-cobalto"}>
              1. Ida{idaViajeId && mostrandoVuelta ? " ✓" : ""}
            </span>
            <span className="text-brand-dark/30">→</span>
            <span className={mostrandoVuelta ? "text-brand-cobalto" : "text-brand-dark/40"}>2. Vuelta</span>
          </div>
        )}

        <h1 className="font-display mt-3 text-2xl font-bold text-brand-dark">
          {mostrandoVuelta
            ? `${destinoCiudad ?? "Destino"} → ${origenCiudad ?? "Origen"}`
            : `${origenCiudad ?? "Origen"} → ${destinoCiudad ?? "Destino"}`}
        </h1>
        <p className="text-sm text-brand-dark/70">
          {formatearFecha(mostrandoVuelta ? (fechaVuelta ?? fecha) : fecha)}{" "}
          · {pasajeros ?? 1} pasajero{Number(pasajeros ?? 1) > 1 ? "s" : ""}
        </p>

        <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-6">
          {!mostrandoVuelta && (
            <>
              <div className="lg:hidden">
                <FiltrosBusqueda />
              </div>
              <div className="hidden lg:sticky lg:top-6 lg:block">
                <FiltrosBusqueda variante="panel" />
              </div>
            </>
          )}

          <div className={mostrandoVuelta ? "lg:col-span-2" : ""}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-dark/70">
                {resultadosAMostrar.length} cooperativa{resultadosAMostrar.length !== 1 ? "s" : ""} disponible
                {resultadosAMostrar.length !== 1 ? "s" : ""} para esta ruta
              </p>
              {resultadosAMostrar.length > 1 && <OrdenarPor />}
            </div>

            <div className="space-y-4">
              {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

              {!error && resultadosAMostrar.length === 0 && (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                  <p className="font-display text-lg font-bold text-brand-dark">
                    No encontramos viajes para esta fecha.
                  </p>
                  <p className="mt-1 text-sm text-brand-dark/70">
                    Prueba con otra fecha, o confirma que la ruta ya esté publicada por alguna cooperativa.
                  </p>
                </div>
              )}

              {resultadosAMostrar.map((r) => (
                <TarjetaResultado
                  key={r.viajeId}
                  r={r}
                  hrefAsientos={mostrandoVuelta ? hrefParaVuelta(r.viajeId) : hrefParaIda(r.viajeId)}
                  esMejorPrecio={precioMinimo !== null && Number(r.precioBase) === precioMinimo}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
