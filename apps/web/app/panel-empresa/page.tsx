"use client";

import { useEffect, useState } from "react";
import {
  obtenerDashboardCoop,
  obtenerConfiguracionFiscal,
  actualizarConfiguracionFiscal,
  obtenerPerfilCoop,
  actualizarPerfilCoop,
  listarViajesCoop,
  type FilaVentaDelDia,
  type ViajeCoopResumen,
} from "@/lib/api";
import { obtenerToken, decodificarToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearDolares(monto: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(monto);
}

/* Rediseño real Fase 1 (25-ago-2026) -- tarjetas de métrica con
   ícono, mismo patrón visual ya usado en /admin (sección 5.63), pero
   con la insignia en ámbar suave en vez de cobalto -- coherente con
   el acento real de este panel. */
function IconoBoletos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M13 6v12" strokeDasharray="2 2" />
    </svg>
  );
}
function IconoVentas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function TarjetaMetrica({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: (props: { className?: string }) => React.ReactElement;
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
        <Icono className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-dark/50">{etiqueta}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-brand-dark">{valor}</p>
    </div>
  );
}

export default function PanelEmpresaDashboard() {
  // Hallazgo real del director, probando la cuenta de vendedor
  // (25-ago-2026): esta pantalla pedía las 3 secciones reales
  // exclusivas de admin_cooperativa (dashboard de ventas, logo,
  // configuración fiscal) sin revisar el rol antes -- un vendedor
  // veía "Forbidden resource" 3 veces, el error crudo del backend, en
  // vez de simplemente no ver esas secciones. Mismo patrón real ya
  // corregido antes en el menú lateral y en la pantalla de Soporte
  // del admin: decodificar el rol localmente (page.tsx no tiene
  // acceso al payload que ya decodificó layout.tsx, sin contexto
  // compartido entre ambos).
  const [rolActual, setRolActual] = useState<string | null>(null);

  // "Viajes de hoy" para el vendedor (25-ago-2026, hallazgo real del
  // director: los 4 botones que había antes duplicaban el menú de
  // arriba, sin aportar nada). Reemplazado por contenido real y
  // distinto -- lista de solo lectura, mismo endpoint real ya
  // accesible para vendedor (`GET /coop/viajes`, ya usado por la
  // sección "Viajes" del menú), filtrada por la fecha de hoy.
  // `fechaSalida` es una columna `date` real (sin componente de hora
  // ni huso horario -- a diferencia de `horaSalidaProgramada`, que sí
  // tiene el gotcha real de zona horaria documentado en
  // ENTREGA_TECNICA_EXHAUSTIVA.md sección 3), así que comparar el
  // string tal cual, sin conversión, es seguro aquí.
  const [viajesHoy, setViajesHoy] = useState<ViajeCoopResumen[] | null>(null);
  const [errorViajesHoy, setErrorViajesHoy] = useState<string | null>(null);

  const [filas, setFilas] = useState<FilaVentaDelDia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ivaPorcentaje, setIvaPorcentaje] = useState("");
  const [ivaVisible, setIvaVisible] = useState(true);
  const [ivaAutomatico, setIvaAutomatico] = useState(true);
  const [cargandoFiscal, setCargandoFiscal] = useState(true);
  const [guardandoFiscal, setGuardandoFiscal] = useState(false);
  const [mensajeFiscal, setMensajeFiscal] = useState<string | null>(null);
  const [errorFiscal, setErrorFiscal] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [cargandoLogo, setCargandoLogo] = useState(true);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return; // el layout ya se encarga de redirigir si no hay token

    const datos = decodificarToken(token);
    const rol = datos?.rol ?? null;
    setRolActual(rol);

    // Las 3 llamadas de abajo (dashboard, configuración fiscal, perfil
    // con el logo) están correctamente restringidas a admin_cooperativa
    // en el backend -- confirmado por el director que no existe ningún
    // endpoint real equivalente para el vendedor (ni de "ventas
    // propias" ni de ningún otro dato de estas 3 secciones). Se evita
    // la petición desde el inicio, en vez de dejar que falle.
    if (rol !== "admin_cooperativa") {
      setCargandoFiscal(false);
      setCargandoLogo(false);
      listarViajesCoop(token)
        .then((viajes) => {
          const hoy = new Date().toLocaleDateString("sv-SE"); // formato real YYYY-MM-DD, mismo que fechaSalida
          setViajesHoy(viajes.filter((v) => v.fechaSalida === hoy));
        })
        .catch((err) => setErrorViajesHoy(err instanceof Error ? err.message : "No se pudieron cargar los viajes de hoy."));
      return;
    }

    obtenerDashboardCoop(token)
      .then(setFilas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard."));

    obtenerConfiguracionFiscal(token)
      .then((cfg) => {
        setIvaPorcentaje(String(cfg.ivaPorcentaje));
        setIvaVisible(cfg.ivaVisibleEnBoleto);
        setIvaAutomatico(cfg.ivaSigueTasaNacional);
      })
      .catch((err) => setErrorFiscal(err instanceof Error ? err.message : "No se pudo cargar la configuración fiscal."))
      .finally(() => setCargandoFiscal(false));

    obtenerPerfilCoop(token)
      .then((perfil) => setLogoUrl(perfil.logoUrl ?? ""))
      .catch((err) => setErrorLogo(err instanceof Error ? err.message : "No se pudo cargar el logo."))
      .finally(() => setCargandoLogo(false));
  }, []);

  async function guardarLogo(e: React.FormEvent) {
    e.preventDefault();
    setErrorLogo(null);
    const token = obtenerToken();
    if (!token) return;
    setGuardandoLogo(true);
    try {
      await actualizarPerfilCoop(token, logoUrl.trim());
      setMensajeExito(logoUrl.trim() ? "Logo actualizado." : "Logo eliminado.");
    } catch (err) {
      setErrorLogo(err instanceof Error ? err.message : "No se pudo guardar el logo.");
    } finally {
      setGuardandoLogo(false);
    }
  }


  async function guardarFiscal(e: React.FormEvent) {
    e.preventDefault();
    setErrorFiscal(null);
    setMensajeFiscal(null);
    const token = obtenerToken();
    const valor = Number(ivaPorcentaje);
    if (!token || Number.isNaN(valor) || valor < 0 || valor > 100) {
      setErrorFiscal("Escribe un porcentaje válido entre 0 y 100.");
      return;
    }
    setGuardandoFiscal(true);
    try {
      await actualizarConfiguracionFiscal(token, {
        ivaPorcentaje: valor,
        ivaVisibleEnBoleto: ivaVisible,
        ivaSigueTasaNacional: ivaAutomatico,
      });
      setMensajeFiscal("Configuración guardada.");
    } catch (err) {
      setErrorFiscal(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoFiscal(false);
    }
  }

  const totalBoletos = filas?.reduce((acc, f) => acc + f.totalBoletos, 0) ?? 0;
  const totalVentas = filas?.reduce((acc, f) => acc + f.totalVentas, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      {rolActual === "admin_cooperativa" ? (
        <>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-dark">Ventas de hoy</h1>
            <p className="mt-1 text-sm text-brand-dark/70">
              Resumen de boletos vendidos hoy, en línea y en ventanilla, por ruta y por vendedor.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TarjetaMetrica icono={IconoBoletos} etiqueta="Boletos vendidos hoy" valor={filas === null ? "—" : totalBoletos} />
            <TarjetaMetrica
              icono={IconoVentas}
              etiqueta="Total vendido hoy"
              valor={filas === null ? "—" : formatearDolares(totalVentas)}
            />
          </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">Detalle por ruta y vendedor</h2>
        </div>

        {filas === null && !error && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">Cargando...</p>
        )}

        {filas !== null && filas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay ventas registradas hoy.
          </p>
        )}

        {filas !== null && filas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3 text-right">Boletos</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filas.map((fila, i) => (
                <tr key={i}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{fila.rutaNombre}</td>
                  <td className="px-6 py-3 text-brand-dark/70">
                    {fila.vendedorNombre ?? "Venta en línea"}
                  </td>
                  <td className="px-6 py-3 text-right text-brand-dark/70">{fila.totalBoletos}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                    {formatearDolares(fila.totalVentas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Logo de la cooperativa</h2>
        <p className="mt-1 text-sm text-brand-dark/70">
          Se muestra junto al nombre de tu cooperativa en los resultados de búsqueda del pasajero. Pega el enlace de
          una imagen ya subida (por ejemplo, a Cloudinary) — no se sube el archivo desde aquí todavía.
        </p>

        {cargandoLogo ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardarLogo} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local
              <img
                src={logoUrl}
                alt="Vista previa del logo"
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-black/10"
              />
            )}
            <div className="flex-1">
              <label htmlFor="panel-logo-url" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                URL de la imagen
              </label>
              <input
                id="panel-logo-url"
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/tu-cuenta/logo.png"
                className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <button
              type="submit"
              disabled={guardandoLogo}
              className="h-[42px] rounded-lg bg-brand-amber px-4 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
            >
              {guardandoLogo ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
        {errorLogo && <p className="mt-3 text-sm font-medium text-red-600">{errorLogo}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Configuración de IVA</h2>
        <p className="mt-1 text-sm text-brand-dark/70">
          El precio de cada boleto ya incluye este porcentaje — no se suma aparte al total.
        </p>

        {cargandoFiscal ? (
          <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
        ) : (
          <form onSubmit={guardarFiscal} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="panel-iva-porcentaje" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Porcentaje de IVA
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="panel-iva-porcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  className="w-28 rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                />
                <span className="text-brand-dark/70">%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input
                type="checkbox"
                checked={ivaVisible}
                onChange={(e) => setIvaVisible(e.target.checked)}
                className="h-4 w-4 rounded border-brand-light text-brand focus:ring-brand-medium"
              />
              Mostrar el desglose de IVA en el boleto del pasajero
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70">
              <input
                type="checkbox"
                checked={ivaAutomatico}
                onChange={(e) => setIvaAutomatico(e.target.checked)}
                className="h-4 w-4 rounded border-brand-light text-brand focus:ring-brand-medium"
              />
              Seguir el IVA nacional automáticamente
            </label>
            <button
              type="submit"
              disabled={guardandoFiscal}
              className="h-[42px] rounded-lg bg-brand-amber px-4 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
            >
              {guardandoFiscal ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
        {mensajeFiscal && <p className="mt-3 text-sm font-medium text-emerald-600">{mensajeFiscal}</p>}
        {errorFiscal && <p className="mt-3 text-sm font-medium text-red-600">{errorFiscal}</p>}
      </div>
        </>
      ) : (
        // Vendedor real -- hallazgo del director (25-ago-2026): la
        // primera versión de este bloque tenía 4 botones que
        // duplicaban exactamente el menú de arriba, sin aportar nada
        // nuevo. Reemplazado por contenido real y distinto: lista de
        // solo lectura de los viajes que salen hoy, mismo endpoint ya
        // accesible para vendedor -- no un dato inventado.
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <h1 className="font-display text-2xl font-bold text-brand-dark">Viajes de hoy</h1>
          <p className="mt-1 text-sm text-brand-dark/70">Salidas programadas para hoy, en un vistazo.</p>

          {errorViajesHoy && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorViajesHoy}
            </div>
          )}

          {viajesHoy === null && !errorViajesHoy && (
            <p className="mt-4 text-sm text-brand-dark/50">Cargando...</p>
          )}

          {viajesHoy !== null && viajesHoy.length === 0 && (
            <p className="mt-4 text-sm text-brand-dark/50">No hay viajes programados para hoy.</p>
          )}

          {viajesHoy !== null && viajesHoy.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-black/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Unidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {viajesHoy.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-semibold text-brand-dark">
                        {new Date(v.horaSalidaProgramada).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-brand-dark/80">{v.rutaNombre}</td>
                      <td className="px-4 py-3 text-brand-dark/60">{v.unidadPlaca}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
