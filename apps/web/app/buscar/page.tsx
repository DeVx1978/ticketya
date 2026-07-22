import Link from "next/link";
import { buscarViajes } from "@/lib/api";

function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });
}

export default async function ResultadosBusquedaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { origenId, destinoId, origenCiudad, destinoCiudad, fecha, pasajeros } = sp;

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

  let resultados: Awaited<ReturnType<typeof buscarViajes>> = [];
  let error: string | null = null;
  try {
    resultados = await buscarViajes(origenId, destinoId, fecha, Number(pasajeros ?? 1));
  } catch {
    error = "No se pudo completar la búsqueda. Intenta de nuevo en un momento.";
  }

  return (
    <main className="flex-1 bg-brand-light/40">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          ← Nueva búsqueda
        </Link>

        <h1 className="font-display mt-3 text-2xl font-bold text-brand-dark">
          {origenCiudad ?? "Origen"} → {destinoCiudad ?? "Destino"}
        </h1>
        <p className="text-sm text-brand-dark/60">
          {new Date(`${fecha}T00:00:00`).toLocaleDateString("es-EC", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {pasajeros ?? 1} pasajero{Number(pasajeros ?? 1) > 1 ? "s" : ""}
        </p>

        <div className="mt-6 space-y-4">
          {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

          {!error && resultados.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="font-display text-lg font-bold text-brand-dark">
                No encontramos viajes para esta fecha.
              </p>
              <p className="mt-1 text-sm text-brand-dark/60">
                Prueba con otra fecha, o confirma que la ruta ya esté publicada por alguna cooperativa.
              </p>
            </div>
          )}

          {resultados.map((r) => (
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
                <p className="text-sm text-brand-dark/60">{r.tipoVehiculoNombre}</p>
                <p className="mt-1 text-sm text-brand-dark/70">
                  Sale {formatearHora(r.horaSalidaProgramada)}
                  {r.horaLlegadaEstimada && <> · Llega {formatearHora(r.horaLlegadaEstimada)}</>}
                </p>
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
                  href={`/viajes/${r.viajeId}/asientos`}
                  className="shrink-0 rounded-lg bg-brand-amber px-5 py-2.5 font-semibold text-brand-dark transition hover:brightness-95"
                >
                  Elegir asiento
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
