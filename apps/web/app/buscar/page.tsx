import Link from "next/link";
import { buscarViajes, AMENIDADES_CATALOGO, type Amenidad, type ResultadoViaje } from "@/lib/api";
import { FiltrosBusqueda } from "./FiltrosBusqueda";

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
 * Fase 7-idayvuelta (11-ago-2026) -- tarjeta de resultado extraida
 * como funcion separada, reutilizada para ida y para vuelta (antes
 * vivia una sola vez, embebida directo en el .map() de la pagina).
 * `hrefBase` decide a donde va "Elegir asiento" -- si ya se eligio el
 * tramo de ida, el tramo de vuelta debe llevar esa eleccion consigo en
 * la URL, para poder combinar ambos en un solo checkout mas adelante.
 */
function TarjetaResultado({ r, hrefAsientos }: { r: ResultadoViaje; hrefAsientos: string }) {
  return (
    <div
      key={r.viajeId}
      className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:flex-row md:items-center md:justify-between"
    >
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
        <p className="mt-1 text-sm text-brand-dark/70">
          Sale {formatearHora(r.horaSalidaProgramada)}
          {r.horaLlegadaEstimada && <> · Llega {formatearHora(r.horaLlegadaEstimada)}</>}
        </p>
        {/* Ítem 15 (05-ago-2026) -- link estándar de Google Maps, sin SDK ni API key. */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${r.origenLatitud},${r.origenLongitud}&destination=${r.destinoLatitud},${r.destinoLongitud}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-brand-dark"
        >
          Ver trayecto en el mapa
        </a>
      </div>
      <div className="flex items-center justify-between gap-6 md:justify-end">
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold text-brand">${Number(r.precioBase).toFixed(2)}</p>
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
  const { fechaVuelta, idaViajeId, idaAsiento } = sp;
  const esIdaYVuelta = !!fechaVuelta;

  if (!origenId || !destinoId || !fecha) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-brand-dark">Faltan datos de búsqueda. Vuelve al inicio e intenta de nuevo.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand underline">
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
    const params = new URLSearchParams({
      origenId: destinoId ?? "",
      origenCiudad: destinoCiudad ?? "",
      destinoId: origenId ?? "",
      destinoCiudad: origenCiudad ?? "",
      fecha: fechaVuelta ?? "",
      pasajeros: pasajeros ?? "1",
      idaViajeId: viajeId,
    });
    return `/buscar?${params.toString()}`;
  }

  function hrefParaVuelta(viajeId: string): string {
    const params = new URLSearchParams({ idaViajeId: idaViajeId ?? "", vueltaViajeId: viajeId });
    return `/viajes/${viajeId}/asientos?${params.toString()}`;
  }

  const mostrandoVuelta = esIdaYVuelta && !!idaViajeId;
  const resultadosAMostrar = mostrandoVuelta ? resultadosVuelta : resultadosIda;

  return (
    <main className="flex-1 bg-brand-light/40">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Nueva búsqueda
        </Link>

        {esIdaYVuelta && (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <span className={mostrandoVuelta ? "text-brand-dark/40" : "text-brand"}>
              1. Ida{idaViajeId && mostrandoVuelta ? " ✓" : ""}
            </span>
            <span className="text-brand-dark/30">→</span>
            <span className={mostrandoVuelta ? "text-brand" : "text-brand-dark/40"}>2. Vuelta</span>
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

        {!mostrandoVuelta && (
          <div className="mt-4">
            <FiltrosBusqueda />
          </div>
        )}

        <div className="mt-6 space-y-4">
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
            />
          ))}
        </div>
      </div>
    </main>
  );
}
