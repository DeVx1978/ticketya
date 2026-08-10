import { listarRutasDisponibles, obtenerEstadisticasPublicas } from "@/lib/api";

/**
 * Fase 7-portada (07-ago-2026) -- llena la portada con contenido real,
 * en vez de dejarla vacia. "Rutas disponibles" (no "populares" --
 * decision del director, ver DOCUMENTO_MAESTRO.md) porque hoy no
 * existen datos reales de demanda -- mostrar "populares" sin datos
 * reales seria inventar informacion. Prueba social con el conteo real
 * de cooperativas activas y rutas, sin ningun numero fabricado.
 *
 * Server component (async, sin "use client") -- se resuelve en el
 * servidor antes de enviar el HTML, mismo patron que el resto de la
 * portada.
 */
export async function RutasDisponibles() {
  const [rutas, estadisticas] = await Promise.all([
    listarRutasDisponibles(),
    obtenerEstadisticasPublicas(),
  ]);

  if (rutas.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold text-brand-dark">Rutas disponibles</h2>
        {estadisticas && (
          <p className="text-sm text-brand-dark/60">
            {estadisticas.cooperativasActivas} cooperativa{estadisticas.cooperativasActivas === 1 ? "" : "s"} ·{" "}
            {estadisticas.rutasDisponibles} ruta{estadisticas.rutasDisponibles === 1 ? "" : "s"} disponible
            {estadisticas.rutasDisponibles === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rutas.map((r) => (
          <div
            key={r.rutaId}
            className="rounded-xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <p className="font-display text-base font-bold text-brand-dark">
              {r.origenCiudad} <span className="text-brand-dark/40">&rarr;</span> {r.destinoCiudad}
            </p>
            <p className="mt-1 text-xs text-brand-dark/50">
              {r.origenNombre} a {r.destinoNombre}
            </p>
            <p className="mt-2 font-display text-lg font-extrabold text-brand-dark">
              Desde ${Number(r.precioReferencia).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
