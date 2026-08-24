import Link from "next/link";
import { buscarViajes, obtenerBeneficiosReferidos, type Amenidad, type ResultadoViaje } from "@/lib/api";
import { FiltrosBusqueda } from "./FiltrosBusqueda";
import { OrdenarPor } from "./OrdenarPor";
import { FiltroCooperativaPills } from "./FiltroCooperativaPills";
import { TarjetaCooperativaAgrupada } from "./TarjetaCooperativaAgrupada";

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
  const { fechaVuelta, idaViajeId, idaAsientos, ordenarPor, cooperativaId, precioMin, precioMax } = sp;
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

  // Fase 5-buscador (16-ago-2026) -- en paralelo con la búsqueda de
  // viajes, no en secuencia (no debe agregar latencia extra). Si
  // falla, el resultado es null -- la franja de beneficio real
  // simplemente no se muestra, sin romper toda la página.
  const promesaBeneficios = obtenerBeneficiosReferidos();

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

  const beneficiosReferidos = await promesaBeneficios;

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
  let resultadosAMostrar = mostrandoVuelta ? resultadosVuelta : resultadosIda;

  // Corrección real de un bug de producción (17-ago-2026, reportado
  // por el director con evidencia -- "This page couldn't load"):
  // page.tsx es un componente de SERVIDOR, TarjetaCooperativaAgrupada
  // es de CLIENTE -- Next.js no permite pasar una función como prop a
  // través de esa frontera (no es serializable), solo datos.
  // Corregido: en vez de pasar `construirHref` como función, se
  // calcula aquí mismo un mapa real {viajeId: href} con datos ya
  // resueltos (strings), y se le pasa el mapa -- 100% serializable.
  // No se detectó en tsc/next build porque /buscar es una ruta
  // dinámica (no se prerender con datos reales en build) -- solo se
  // manifiesta al navegar de verdad, como hizo el director.
  const hrefsPorViaje: Record<string, string> = {};
  for (const r of resultadosAMostrar) {
    hrefsPorViaje[r.viajeId] = mostrandoVuelta ? hrefParaVuelta(r.viajeId) : hrefParaIda(r.viajeId);
  }

  // Filtro rápido por cooperativa (16-ago-2026, orden real de la
  // directora) -- lista de cooperativas ÚNICAS reales presentes en
  // los resultados de ESTA búsqueda (nunca un catálogo fijo -- si una
  // cooperativa no tiene viajes en esta ruta/fecha, no aparece).
  const cooperativasUnicas = Array.from(
    new Map(resultadosAMostrar.map((r) => [r.cooperativaId, { id: r.cooperativaId, nombre: r.cooperativaNombre }])).values(),
  );

  if (cooperativaId) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => r.cooperativaId === cooperativaId);
  }

  // Fase 8-buscador (24-ago-2026) -- filtro de precio real, sobre
  // datos ya obtenidos -- mismo patrón que el filtro de cooperativa de
  // arriba. `Number(precioMin)` con NaN (campo vacío o inválido) no
  // filtra nada en ese extremo, mismo criterio real que ya usa el
  // input HTML de precio (sin mínimo/máximo si no se especifica).
  const precioMinNum = precioMin ? Number(precioMin) : null;
  const precioMaxNum = precioMax ? Number(precioMax) : null;
  if (precioMinNum !== null && !Number.isNaN(precioMinNum)) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => Number(r.precioBase) >= precioMinNum);
  }
  if (precioMaxNum !== null && !Number.isNaN(precioMaxNum)) {
    resultadosAMostrar = resultadosAMostrar.filter((r) => Number(r.precioBase) <= precioMaxNum);
  }

  // "Ver horarios" agrupado por cooperativa (17-ago-2026, orden real
  // del director): se agrupan los viajes reales de esta ruta/fecha
  // por cooperativa+tipo de vehículo -- una sola tarjeta por grupo,
  // con todos los horarios reales disponibles dentro. Ordenados por
  // hora de salida ascendente dentro de cada grupo (el primero =
  // salida más próxima, el que se muestra por defecto).
  const gruposMap = new Map<string, ResultadoViaje[]>();
  for (const r of resultadosAMostrar) {
    const clave = `${r.cooperativaId}::${r.tipoVehiculoId}`;
    const grupo = gruposMap.get(clave);
    if (grupo) {
      grupo.push(r);
    } else {
      gruposMap.set(clave, [r]);
    }
  }
  const grupos = Array.from(gruposMap.values()).map((grupo) =>
    [...grupo].sort(
      (a, b) => new Date(a.horaSalidaProgramada).getTime() - new Date(b.horaSalidaProgramada).getTime(),
    ),
  );
  // El orden real elegido (precio/salida más temprano) sigue aplicando
  // a nivel de GRUPO -- se conserva el orden ya calculado arriba en
  // `resultadosAMostrar`, usando el primer viaje de cada grupo (que ya
  // venía ordenado) como representante para ordenar los grupos entre sí.
  grupos.sort(
    (a, b) => resultadosAMostrar.indexOf(a[0]) - resultadosAMostrar.indexOf(b[0]),
  );

  // Fase 5-buscador (16-ago-2026) -- "Mejor precio" real, calculado
  // una sola vez sobre TODOS los GRUPOS que se van a mostrar (el
  // precio más bajo dentro de cada grupo es el representativo), no
  // una insignia fija ni inventada por tarjeta.
  const precioMinimo =
    grupos.length > 0
      ? Math.min(...grupos.map((g) => Math.min(...g.map((r) => Number(r.precioBase)))))
      : null;

  // Orden de la directora (16-ago-2026) -- agregado al medir la
  // referencia real con precisión: "Top calificado" también es real,
  // calculado (nunca fijo) -- la calificación más alta entre los
  // resultados, con el mismo umbral mínimo de reseñas que ya usa
  // ResenasCooperativa (5) para no destacar una calificación con muy
  // pocos votos como si fuera representativa.
  const calificacionMaxima =
    resultadosAMostrar
      .filter((r) => r.cooperativaCalificacionPromedio !== null && r.cooperativaCalificacionCantidad >= 5)
      .reduce<number | null>(
        (max, r) => (max === null || r.cooperativaCalificacionPromedio! > max ? r.cooperativaCalificacionPromedio! : max),
        null,
      );

  return (
    <main className="flex-1 bg-brand-light/40">
      {/* Franja oscura de resumen de ruta -- adaptación real de la
          referencia del director (demo, 24-ago-2026): en el demo esto
          es una franja oscura con el resumen de la ruta + botón
          "Cambiar búsqueda", en vez de un link de texto simple sobre
          fondo claro. Se usa nuestro vidrio oscuro real
          (`bg-brand-dark`), no el rojo del demo -- decisión explícita
          del director: mantener la marca real, no copiar el color.

          Ajuste real (24-ago-2026, mismo día): el director señaló que
          se veía "fúnebre y sin vida" -- negro liso, sin ningún acento
          de color, comparado con el Hero (que sí resalta "sin filas ni
          papeleo" en ámbar). Corregido con el mismo criterio: menos
          padding vertical (py-6 -> py-4, franja más delgada) y la
          flecha entre ciudades en `brand-amber`, mismo acento de marca
          que ya usa el resto del sitio -- no un elemento nuevo
          inventado. */}
      <div className="bg-brand-dark px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                {mostrandoVuelta ? (
                  <>
                    {destinoCiudad ?? "Destino"} <span className="text-brand-amber">→</span> {origenCiudad ?? "Origen"}
                  </>
                ) : (
                  <>
                    {origenCiudad ?? "Origen"} <span className="text-brand-amber">→</span> {destinoCiudad ?? "Destino"}
                  </>
                )}
              </h1>
              <p className="text-sm text-white/60">
                {formatearFecha(mostrandoVuelta ? (fechaVuelta ?? fecha) : fecha)}{" "}
                · {pasajeros ?? 1} pasajero{Number(pasajeros ?? 1) > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Cambiar búsqueda
            </Link>
          </div>

          {esIdaYVuelta && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <span className={mostrandoVuelta ? "text-white/40" : "text-brand-medium"}>
                1. Ida{idaViajeId && mostrandoVuelta ? " ✓" : ""}
              </span>
              <span className="text-white/30">→</span>
              <span className={mostrandoVuelta ? "text-brand-medium" : "text-white/40"}>2. Vuelta</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">

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
                {grupos.length} cooperativa{grupos.length !== 1 ? "s" : ""} disponible
                {grupos.length !== 1 ? "s" : ""} para esta ruta
              </p>
              {grupos.length > 1 && <OrdenarPor />}
            </div>

            {!mostrandoVuelta && <FiltroCooperativaPills cooperativas={cooperativasUnicas} />}

            <div className="space-y-4">
              {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

              {!error && grupos.length === 0 && (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                  <p className="font-display text-lg font-bold text-brand-dark">
                    No encontramos viajes para esta fecha.
                  </p>
                  <p className="mt-1 text-sm text-brand-dark/70">
                    Prueba con otra fecha, o confirma que la ruta ya esté publicada por alguna cooperativa.
                  </p>
                </div>
              )}

              {grupos.map((grupo) => (
                <TarjetaCooperativaAgrupada
                  key={`${grupo[0].cooperativaId}::${grupo[0].tipoVehiculoId}`}
                  viajes={grupo}
                  hrefsPorViaje={hrefsPorViaje}
                  esMejorPrecio={
                    precioMinimo !== null && grupo.some((r) => Number(r.precioBase) === precioMinimo)
                  }
                  esTopCalificado={
                    calificacionMaxima !== null &&
                    grupo[0].cooperativaCalificacionPromedio === calificacionMaxima
                  }
                  beneficiosReferidos={beneficiosReferidos}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
