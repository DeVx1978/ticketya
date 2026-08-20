"use client";

import { Fragment, useEffect, useState } from "react";
import {
  crearRutaCoop,
  listarRutasCoop,
  listarTiposVehiculoCoop,
  listarHorariosRutaCoop,
  crearHorarioRutaCoop,
  actualizarEstadoHorarioRutaCoop,
  cancelarViajesMasivoCoop,
  listarParadasCoop,
  agregarParadaCoop,
  eliminarParadaCoop,
  type PuntoOperacion,
  type RutaResumen,
  type TipoVehiculoResumen,
  type HorarioRutaResumen,
  type ResultadoCancelacionMasiva,
  type ParadaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { SelectorCiudad } from "@/components/SelectorCiudad";
import { Toast } from "@/components/Toast";

/** 0=domingo..6=sábado (mismo orden que la base de datos), mostrados Lun-Dom por costumbre visual. */
const DIAS_SEMANA = [
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sáb" },
  { valor: 0, etiqueta: "Dom" },
];

export default function RutasPage() {
  const [rutas, setRutas] = useState<RutaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [origen, setOrigen] = useState<PuntoOperacion | null>(null);
  const [destino, setDestino] = useState<PuntoOperacion | null>(null);
  const [precio, setPrecio] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Ítem 7, Fase 2 (03-ago-2026) -- horarios recurrentes y cancelación
  // masiva, ambos por ruta. Se gestionan en un panel expandible por fila.
  const [rutaExpandida, setRutaExpandida] = useState<string | null>(null);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculoResumen[] | null>(null);
  const [horariosPorRuta, setHorariosPorRuta] = useState<Record<string, HorarioRutaResumen[]>>({});

  const [horaSalida, setHoraSalida] = useState("08:00");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [tipoVehiculoId, setTipoVehiculoId] = useState("");
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [errorHorario, setErrorHorario] = useState<string | null>(null);

  const [fechaInicioMasivo, setFechaInicioMasivo] = useState("");
  const [fechaFinMasivo, setFechaFinMasivo] = useState("");
  const [confirmandoMasivo, setConfirmandoMasivo] = useState(false);
  const [ejecutandoMasivo, setEjecutandoMasivo] = useState(false);
  const [resultadoMasivo, setResultadoMasivo] = useState<ResultadoCancelacionMasiva | null>(null);
  const [errorMasivo, setErrorMasivo] = useState<string | null>(null);

  const [paradasPorRuta, setParadasPorRuta] = useState<Record<string, ParadaResumen[]>>({});
  const [puntoParada, setPuntoParada] = useState<PuntoOperacion | null>(null);
  const [tarifaParada, setTarifaParada] = useState("");
  const [tiempoParada, setTiempoParada] = useState("");
  const [guardandoParada, setGuardandoParada] = useState(false);
  const [errorParada, setErrorParada] = useState<string | null>(null);

  function cargarParadas(rutaId: string) {
    const token = obtenerToken();
    if (!token) return;
    listarParadasCoop(token, rutaId)
      .then((lista) => setParadasPorRuta((p) => ({ ...p, [rutaId]: lista })))
      .catch(() => setParadasPorRuta((p) => ({ ...p, [rutaId]: [] })));
  }

  function agregarParada(rutaId: string, e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !puntoParada || !tarifaParada) {
      setErrorParada("Elige la parada y su tarifa desde el origen para continuar.");
      return;
    }
    setGuardandoParada(true);
    setErrorParada(null);
    const siguienteOrden = (paradasPorRuta[rutaId]?.length ?? 0) + 1;
    agregarParadaCoop(token, {
      rutaId,
      puntoOperacionId: puntoParada.id,
      orden: siguienteOrden,
      tarifaDesdeOrigen: Number(tarifaParada),
      tiempoEstimadoDesdeOrigenMinutos: tiempoParada ? Number(tiempoParada) : undefined,
    })
      .then(() => {
        setPuntoParada(null);
        setTarifaParada("");
        setTiempoParada("");
        cargarParadas(rutaId);
      })
      .catch((err) => setErrorParada(err instanceof Error ? err.message : "No se pudo agregar la parada."))
      .finally(() => setGuardandoParada(false));
  }

  function quitarParada(rutaId: string, paradaId: string) {
    const token = obtenerToken();
    if (!token) return;
    eliminarParadaCoop(token, paradaId)
      .then(() => cargarParadas(rutaId))
      .catch((err) => setErrorParada(err instanceof Error ? err.message : "No se pudo eliminar la parada."));
  }

  function cargarRutas() {
    const token = obtenerToken();
    if (!token) return;
    listarRutasCoop(token)
      .then(setRutas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las rutas."));
  }

  useEffect(cargarRutas, []);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    listarTiposVehiculoCoop(token).then(setTiposVehiculo).catch(() => setTiposVehiculo([]));
  }, []);

  function toggleExpandir(rutaId: string) {
    if (rutaExpandida === rutaId) {
      setRutaExpandida(null);
      return;
    }
    setRutaExpandida(rutaId);
    setResultadoMasivo(null);
    setConfirmandoMasivo(false);
    if (!horariosPorRuta[rutaId]) {
      const token = obtenerToken();
      if (!token) return;
      listarHorariosRutaCoop(token, rutaId)
        .then((lista) => setHorariosPorRuta((h) => ({ ...h, [rutaId]: lista })))
        .catch(() => setHorariosPorRuta((h) => ({ ...h, [rutaId]: [] })));
    }
    if (!paradasPorRuta[rutaId]) {
      cargarParadas(rutaId);
    }
  }

  function alternarDia(dia: number) {
    setDiasSeleccionados((dias) =>
      dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia],
    );
  }

  async function crearHorario(rutaId: string, e: React.FormEvent) {
    e.preventDefault();
    setErrorHorario(null);
    const token = obtenerToken();
    if (!token || diasSeleccionados.length === 0 || !tipoVehiculoId) {
      setErrorHorario("Elige al menos un día de la semana y un tipo de vehículo.");
      return;
    }
    setGuardandoHorario(true);
    try {
      await crearHorarioRutaCoop(token, {
        rutaId,
        horaSalida,
        diasSemana: diasSeleccionados,
        tipoVehiculoPredeterminadoId: tipoVehiculoId,
      });
      const lista = await listarHorariosRutaCoop(token, rutaId);
      setHorariosPorRuta((h) => ({ ...h, [rutaId]: lista }));
      setDiasSeleccionados([]);
      setMensajeExito("Horario recurrente creado. Los viajes se generan automáticamente cada noche.");
    } catch (err) {
      setErrorHorario(err instanceof Error ? err.message : "No se pudo crear el horario.");
    } finally {
      setGuardandoHorario(false);
    }
  }

  async function alternarActivoHorario(rutaId: string, horario: HorarioRutaResumen) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await actualizarEstadoHorarioRutaCoop(token, horario.id, !horario.activo);
      const lista = await listarHorariosRutaCoop(token, rutaId);
      setHorariosPorRuta((h) => ({ ...h, [rutaId]: lista }));
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo actualizar el horario.");
    }
  }

  /**
   * Cancelación/suspensión masiva -- ítem 7 (03-ago-2026). Los viajes
   * con boletos vendidos SÍ se cancelan (crédito automático + aviso por
   * WhatsApp) -- por eso pide confirmación explícita en dos pasos antes
   * de ejecutar, no es una acción reversible.
   */
  async function ejecutarCancelacionMasiva(rutaId: string) {
    setErrorMasivo(null);
    const token = obtenerToken();
    if (!token || !fechaInicioMasivo || !fechaFinMasivo) {
      setErrorMasivo("Elige una fecha de inicio y una de fin.");
      return;
    }
    setEjecutandoMasivo(true);
    try {
      const resultado = await cancelarViajesMasivoCoop(token, rutaId, fechaInicioMasivo, fechaFinMasivo);
      setResultadoMasivo(resultado);
      setConfirmandoMasivo(false);
    } catch (err) {
      setErrorMasivo(err instanceof Error ? err.message : "No se pudo ejecutar la cancelación masiva.");
    } finally {
      setEjecutandoMasivo(false);
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !origen || !destino || !precio) {
      setErrorForm("Elige origen, destino y un precio base para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearRutaCoop(token, {
        origenPuntoOperacionId: origen.id,
        destinoPuntoOperacionId: destino.id,
        precioBaseReferencia: Number(precio),
        nombre: nombre.trim() || undefined,
      });
      const descripcion = nombre.trim() || `${origen.ciudad} → ${destino.ciudad}`;
      setOrigen(null);
      setDestino(null);
      setPrecio("");
      setNombre("");
      setMensajeExito(`Ruta "${descripcion}" creada correctamente.`);
      cargarRutas();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la ruta.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Rutas</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Las rutas que operas hoy — el precio base es el punto de partida; cada viaje puede ajustarlo.
        </p>
      </div>

      <form
        onSubmit={crear}
        className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <SelectorCiudad etiqueta="Origen" placeholder="¿Desde dónde?" valor={origen} onCambio={setOrigen} />
        <SelectorCiudad etiqueta="Destino" placeholder="¿Hacia dónde?" valor={destino} onCambio={setDestino} />
        <div>
          <label htmlFor="ruta-precio-base" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Precio base (USD)
          </label>
          <input
            id="ruta-precio-base"
            type="number"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="8.50"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="h-[42px] rounded-lg bg-brand px-4 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Crear ruta"}
        </button>
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="ruta-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Nombre de la ruta (opcional)
          </label>
          <input
            id="ruta-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Machala - Guayaquil directo"
            className="w-full max-w-md rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        {errorForm && (
          <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{errorForm}</p>
        )}
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {rutas === null ? "Cargando..." : `${rutas.length} ruta${rutas.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {rutas !== null && rutas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no has creado ninguna ruta — usa el formulario de arriba.
          </p>
        )}

        {rutas !== null && rutas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              <tr>
                <th className="px-6 py-3">Ruta</th>
                <th className="px-6 py-3">Trayecto</th>
                <th className="px-6 py-3 text-right">Precio base</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rutas.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td className="px-6 py-3 font-medium text-brand-dark">
                      {r.nombre ?? `${r.origenCiudad} → ${r.destinoCiudad}`}
                    </td>
                    <td className="px-6 py-3 text-brand-dark/70">
                      {r.origenCiudad} → {r.destinoCiudad}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-brand-dark">
                      {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                        r.precioBaseReferencia,
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleExpandir(r.id)}
                        className="rounded-lg bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-light/70"
                      >
                        {rutaExpandida === r.id ? "Ocultar" : "Gestionar"}
                      </button>
                    </td>
                  </tr>

                  {rutaExpandida === r.id && (
                    <tr key={`${r.id}-panel`}>
                      <td colSpan={4} className="bg-brand-light/20 px-6 py-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          {/* Horarios recurrentes (plantilla) -- ítem 7, RF-COOP-002 */}
                          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                            <h3 className="font-display text-sm font-bold text-brand-dark">
                              Horarios recurrentes
                            </h3>
                            <p className="mt-1 text-xs text-brand-dark/50">
                              Los viajes se generan solos cada noche para los próximos 21 días. Si editas
                              un viaje ya generado a mano, esa edición nunca se sobrescribe.
                            </p>

                            <div className="mt-3 space-y-2">
                              {(horariosPorRuta[r.id] ?? []).map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center justify-between rounded-lg bg-brand-light/30 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-brand-dark">{h.horaSalida}</span>{" "}
                                    <span className="text-brand-dark/70">
                                      ·{" "}
                                      {DIAS_SEMANA.filter((d) => h.diasSemana.includes(d.valor))
                                        .map((d) => d.etiqueta)
                                        .join(", ")}
                                    </span>{" "}
                                    <span className="text-brand-dark/40">· {h.tipoVehiculoNombre}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => alternarActivoHorario(r.id, h)}
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      h.activo
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {h.activo ? "Activo" : "Inactivo"}
                                  </button>
                                </div>
                              ))}
                              {horariosPorRuta[r.id]?.length === 0 && (
                                <p className="text-xs text-brand-dark/40">
                                  Todavía no tienes ningún horario recurrente en esta ruta.
                                </p>
                              )}
                            </div>

                            <form
                              onSubmit={(e) => crearHorario(r.id, e)}
                              className="mt-4 space-y-3 border-t border-black/5 pt-4"
                            >
                              <div className="flex gap-3">
                                <div>
                                  <label htmlFor={`ruta-${r.id}-hora`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                    Hora
                                  </label>
                                  <input
                                    id={`ruta-${r.id}-hora`}
                                    type="time"
                                    value={horaSalida}
                                    onChange={(e) => setHoraSalida(e.target.value)}
                                    className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label htmlFor={`ruta-${r.id}-tipo-vehiculo`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                    Tipo de vehículo
                                  </label>
                                  <select
                                    id={`ruta-${r.id}-tipo-vehiculo`}
                                    value={tipoVehiculoId}
                                    onChange={(e) => setTipoVehiculoId(e.target.value)}
                                    className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                  >
                                    <option value="">Elige uno...</option>
                                    {(tiposVehiculo ?? []).map((tv) => (
                                      <option key={tv.id} value={tv.id}>
                                        {tv.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label id={`ruta-${r.id}-dias-label`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                  Días de la semana
                                </label>
                                <div role="group" aria-labelledby={`ruta-${r.id}-dias-label`} className="flex flex-wrap gap-1.5">
                                  {DIAS_SEMANA.map((d) => (
                                    <button
                                      key={d.valor}
                                      type="button"
                                      onClick={() => alternarDia(d.valor)}
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                        diasSeleccionados.includes(d.valor)
                                          ? "bg-brand text-white"
                                          : "bg-brand-light/40 text-brand-dark/70"
                                      }`}
                                    >
                                      {d.etiqueta}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {errorHorario && (
                                <p className="text-xs font-medium text-red-600">{errorHorario}</p>
                              )}
                              <button
                                type="submit"
                                disabled={guardandoHorario}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                              >
                                {guardandoHorario ? "Guardando..." : "Agregar horario"}
                              </button>
                            </form>
                          </div>

                          {/* Cancelación/suspensión masiva -- ítem 7 */}
                          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                            <h3 className="font-display text-sm font-bold text-brand-dark">
                              Cancelación masiva
                            </h3>
                            <p className="mt-1 text-xs text-brand-dark/50">
                              Para contratiempos (cierre de vía, feriado, paro). Cancela todos los viajes
                              programados de esta ruta en el rango de fechas -- incluyendo los que ya
                              tienen boletos vendidos, generando crédito automático y avisando por
                              WhatsApp a cada pasajero afectado.
                            </p>

                            <div className="mt-4 flex gap-3">
                              <div>
                                <label htmlFor={`ruta-${r.id}-desde`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                  Desde
                                </label>
                                <input
                                  id={`ruta-${r.id}-desde`}
                                  type="date"
                                  value={fechaInicioMasivo}
                                  onChange={(e) => setFechaInicioMasivo(e.target.value)}
                                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                />
                              </div>
                              <div>
                                <label htmlFor={`ruta-${r.id}-hasta`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                  Hasta
                                </label>
                                <input
                                  id={`ruta-${r.id}-hasta`}
                                  type="date"
                                  value={fechaFinMasivo}
                                  onChange={(e) => setFechaFinMasivo(e.target.value)}
                                  className="rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                />
                              </div>
                            </div>

                            {errorMasivo && (
                              <p className="mt-3 text-xs font-medium text-red-600">{errorMasivo}</p>
                            )}

                            {resultadoMasivo && (
                              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
                                {resultadoMasivo.viajesCancelados} viaje(s) cancelado(s),{" "}
                                {resultadoMasivo.boletosCancelados} boleto(s) compensado(s) con crédito y
                                notificado(s) por WhatsApp.
                              </div>
                            )}

                            <div className="mt-4">
                              {!confirmandoMasivo ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmandoMasivo(true)}
                                  disabled={!fechaInicioMasivo || !fechaFinMasivo}
                                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
                                >
                                  Cancelar viajes en este rango
                                </button>
                              ) : (
                                <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                                  <p className="text-xs font-semibold text-amber-900">
                                    Esto no se puede deshacer. ¿Confirmas la cancelación masiva?
                                  </p>
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => ejecutarCancelacionMasiva(r.id)}
                                      disabled={ejecutandoMasivo}
                                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {ejecutandoMasivo ? "Cancelando..." : "Sí, cancelar todo"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmandoMasivo(false)}
                                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-dark/70"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Paradas intermedias -- RF-COOP-002 (20-ago-2026, Fase 1). El precio de
                              cada parada lo fija la cooperativa a mano, nunca una formula automatica. */}
                          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:col-span-2">
                            <h3 className="font-display text-sm font-bold text-brand-dark">
                              Paradas intermedias
                            </h3>
                            <p className="mt-1 text-xs text-brand-dark/50">
                              Puntos por los que pasa el bus entre el origen y el destino. Cada parada
                              tiene su propio precio real, fijado por ustedes -- no un descuento
                              automatico. Puede haber varias paradas dentro de la misma ciudad de
                              destino (ej. una terminal general y luego la terminal propia).
                            </p>

                            <div className="mt-3 space-y-2">
                              {(paradasPorRuta[r.id] ?? []).map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between rounded-lg bg-brand-light/30 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <span className="font-semibold text-brand-dark">
                                      {p.orden}. {p.puntoOperacionCiudad}
                                    </span>{" "}
                                    <span className="text-brand-dark/70">— {p.puntoOperacionNombre}</span>{" "}
                                    <span className="text-brand-dark/40">
                                      ·{" "}
                                      {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                                        p.tarifaDesdeOrigen,
                                      )}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => quitarParada(r.id, p.id)}
                                    className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))}
                              {paradasPorRuta[r.id]?.length === 0 && (
                                <p className="text-xs text-brand-dark/40">
                                  Todavía no has agregado ninguna parada intermedia en esta ruta.
                                </p>
                              )}
                            </div>

                            <form
                              onSubmit={(e) => agregarParada(r.id, e)}
                              className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/5 pt-4"
                            >
                              <div className="min-w-[180px] flex-1">
                                <SelectorCiudad
                                  etiqueta="Parada"
                                  placeholder="¿Dónde para?"
                                  valor={puntoParada}
                                  onCambio={setPuntoParada}
                                />
                              </div>
                              <div>
                                <label htmlFor={`ruta-${r.id}-tarifa-parada`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                  Tarifa desde origen
                                </label>
                                <input
                                  id={`ruta-${r.id}-tarifa-parada`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={tarifaParada}
                                  onChange={(e) => setTarifaParada(e.target.value)}
                                  className="w-28 rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                />
                              </div>
                              <div>
                                <label htmlFor={`ruta-${r.id}-tiempo-parada`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                                  Minutos desde origen (opcional)
                                </label>
                                <input
                                  id={`ruta-${r.id}-tiempo-parada`}
                                  type="number"
                                  min={0}
                                  value={tiempoParada}
                                  onChange={(e) => setTiempoParada(e.target.value)}
                                  className="w-28 rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={guardandoParada}
                                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                              >
                                {guardandoParada ? "Guardando..." : "Agregar parada"}
                              </button>
                            </form>
                            {errorParada && (
                              <p className="mt-2 text-xs font-medium text-red-600">{errorParada}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
