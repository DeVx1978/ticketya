"use client";

import { Suspense, useState, useEffect, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { crearCompra, listarMisCreditos, obtenerMapaAsientos, iniciarPagoManual, subirComprobantePago, listarMetodosPagoPorViaje, type ResultadoCompra, type MiCredito, type MapaAsientos, type MetodoPagoDisponible, type TipoMetodoPago, type PasajeroCompraInput } from "@/lib/api";
import { tokenValido, obtenerOCrearSesionInvitado } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";

const TARIFAS = [
  { valor: "adulto", etiqueta: "Adulto (tarifa completa)" },
  { valor: "nino", etiqueta: "Niño 3-11 años (50% descuento)" },
  { valor: "tercera_edad", etiqueta: "Tercera edad (50% descuento)" },
  { valor: "discapacidad", etiqueta: "Discapacidad (descuento según carnet CONADIS)" },
] as const;

/**
 * Fase 7-item29 (07-ago-2026) -- datos de UN pasajero dentro de la
 * compra. Antes esto vivia como 6 useState sueltos a nivel de toda la
 * pantalla (un solo pasajero por compra) -- ahora es un arreglo, uno
 * por cada asiento elegido, para soportar varios pasajeros en una sola
 * transaccion.
 *
 * Item 31.1 (13-ago-2026) -- nombreCompleto se separo en nombres y
 * apellidos reales, se agrego tipoDocumento (selector explicito
 * cedula/pasaporte, el backend valida cada uno distinto) y
 * esEmbarazada (atencion preferente, LOTTTSV Art. 48 -- no es un
 * descuento, va aparte de tipoTarifa).
 */
interface DatosPasajero {
  viajeId: string;
  numeroAsiento: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "cedula" | "pasaporte";
  documento: string;
  tipoTarifa: (typeof TARIFAS)[number]["valor"];
  fechaNacimiento: string;
  esEmbarazada: boolean;
  adultoResponsableNombre: string;
  adultoResponsableDocumento: string;
  adultoResponsableTelefono: string;
}

function datosPasajeroVacio(viajeId: string, numeroAsiento: string): DatosPasajero {
  return {
    viajeId,
    numeroAsiento,
    nombres: "",
    apellidos: "",
    tipoDocumento: "cedula",
    documento: "",
    tipoTarifa: "adulto",
    fechaNacimiento: "",
    esEmbarazada: false,
    adultoResponsableNombre: "",
    adultoResponsableDocumento: "",
    adultoResponsableTelefono: "",
  };
}

function FormularioCheckout({ viajeId }: { viajeId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fase 7-item29 (07-ago-2026) -- "asientos" (plural, separados por
  // coma) es el formato nuevo, generado por la pantalla de seleccion.
  // "asiento" (singular) se mantiene como respaldo por si queda algun
  // enlace viejo guardado -- se envuelve en un arreglo de 1.
  const asientosParam = searchParams.get("asientos");
  const asientoSingularParam = searchParams.get("asiento");
  const numerosAsiento = asientosParam
    ? asientosParam.split(",").filter(Boolean)
    : asientoSingularParam
      ? [asientoSingularParam]
      : [];

  // Fase 7-idayvuelta (11-ago-2026) -- si vienen idaViajeId +
  // idaAsientos en la URL, esta compra combina 2 viajes distintos (ida
  // y vuelta) -- cada pasajero de la lista lleva su propio viajeId, no
  // se asume que todos son del mismo viaje de la ruta actual.
  const idaViajeIdParam = searchParams.get("idaViajeId");
  const idaAsientosParam = searchParams.get("idaAsientos");
  const esIdaYVuelta = !!idaViajeIdParam && !!idaAsientosParam;

  const paresAsiento: { viajeId: string; numeroAsiento: string; tramo: "ida" | "vuelta" | null }[] = esIdaYVuelta
    ? [
        ...idaAsientosParam!.split(",").filter(Boolean).map((n) => ({
          viajeId: idaViajeIdParam!,
          numeroAsiento: n,
          tramo: "ida" as const,
        })),
        ...numerosAsiento.map((n) => ({ viajeId, numeroAsiento: n, tramo: "vuelta" as const })),
      ]
    : numerosAsiento.map((n) => ({ viajeId, numeroAsiento: n, tramo: null }));

  const [pasajerosData, setPasajerosData] = useState<DatosPasajero[]>(() =>
    paresAsiento.map((p) => datosPasajeroVacio(p.viajeId, p.numeroAsiento)),
  );
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);
  const [creditos, setCreditos] = useState<MiCredito[]>([]);
  const [creditoElegidoId, setCreditoElegidoId] = useState("");
  const [mapa, setMapa] = useState<MapaAsientos | null>(null);
  const [metodosDisponibles, setMetodosDisponibles] = useState<MetodoPagoDisponible[]>([]);
  const [metodoElegido, setMetodoElegido] = useState<TipoMetodoPago | "tarjeta">("tarjeta");
  const [pagoManual, setPagoManual] = useState<{ compraId: string } | null>(null);
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  // Item 31, Fase 7 (11-ago-2026) -- compra como invitado (sin cuenta).
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMetodosPagoPorViaje(token, viajeId)
      .then(setMetodosDisponibles)
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se ofrecen métodos manuales, solo tarjeta */
      });
  }, [viajeId]);

  useEffect(() => {
    obtenerMapaAsientos(viajeId)
      .then(setMapa)
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se muestra la alerta de política */
      });
  }, [viajeId]);

  useEffect(() => {
    const token = tokenValido();
    if (!token) return;
    listarMisCreditos(token)
      .then((lista) => setCreditos(lista.filter((c) => !c.usadoEn)))
      .catch(() => {
        /* silencioso a propósito: si falla, simplemente no se ofrece la opción de usar crédito */
      });
  }, []);

  function actualizarPasajero(indice: number, cambios: Partial<DatosPasajero>) {
    setPasajerosData((actual) =>
      actual.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
    );
  }

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    // Item 31, Fase 7 (11-ago-2026) -- compra como invitado: ya NO se
    // exige iniciar sesion para pagar. Sin token, hace falta al menos
    // un telefono o correo de contacto (el backend tambien lo valida,
    // esto solo evita el viaje redondo al servidor para avisarlo antes).
    const token = tokenValido();
    if (!token && !telefonoContacto.trim() && !correoContacto.trim()) {
      setError("Ingresa un telefono o correo de contacto para recibir tu boleto.");
      return;
    }
    const sesionInvitadoId = token ? undefined : obtenerOCrearSesionInvitado();
    if (!token && metodoElegido !== "tarjeta") {
      setError("Los metodos de pago manuales todavia requieren una cuenta -- crea una gratis o paga con tarjeta.");
      return;
    }
    // Fase 7-item29 (07-ago-2026) -- validacion de menor de edad, ahora
    // por cada pasajero del arreglo, no solo uno.
    for (const p of pasajerosData) {
      if (p.tipoTarifa === "nino" && (!p.adultoResponsableNombre.trim() || !p.adultoResponsableDocumento.trim())) {
        setError(
          `Para el pasajero del asiento ${p.numeroAsiento} (niño), indica el nombre y documento del adulto responsable.`,
        );
        return;
      }
    }
    setProcesando(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const pasajeros: PasajeroCompraInput[] = pasajerosData.map((p) => ({
        viajeId: p.viajeId,
        numeroAsiento: p.numeroAsiento,
        nombres: p.nombres.trim(),
        apellidos: p.apellidos.trim(),
        tipoDocumento: p.tipoDocumento,
        documento: p.documento.trim(),
        tipoTarifa: p.tipoTarifa,
        fechaNacimiento: p.fechaNacimiento || undefined,
        esEmbarazada: p.esEmbarazada || undefined,
        autorizacionMenor:
          p.tipoTarifa === "nino"
            ? {
                tipoAcompanamiento: "con_autorizacion" as const,
                adultoResponsableNombre: p.adultoResponsableNombre.trim(),
                adultoResponsableDocumento: p.adultoResponsableDocumento.trim(),
                adultoResponsableTelefono: p.adultoResponsableTelefono.trim() || undefined,
              }
            : undefined,
      }));
      if (metodoElegido === "tarjeta") {
        const resp = await crearCompra(
          pasajeros,
          token,
          idempotencyKey,
          creditoElegidoId || undefined,
          token ? undefined : telefonoContacto.trim() || undefined,
          token ? undefined : correoContacto.trim() || undefined,
          sesionInvitadoId,
        );
        setResultado(resp);
        if (resp.estado === "rechazado") {
          setError(resp.motivo ?? "El pago fue rechazado.");
        }
      } else {
        // Métodos de pago manuales (29-jul-2026) -- el asiento queda
        // reservado esperando el comprobante y la confirmación de la
        // cooperativa, no se emite el boleto todavía.
        // El "!" es seguro: la guardia de arriba ya garantiza que si
        // llegamos a esta rama (metodo distinto de tarjeta), token no
        // puede ser null -- ese caso ya se rechazo antes con setError.
        const resp = await iniciarPagoManual(token!, pasajeros, metodoElegido, idempotencyKey);
        setPagoManual({ compraId: resp.compraId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la compra.");
    } finally {
      setProcesando(false);
    }
  }

  async function subirComprobante() {
    const token = tokenValido();
    if (!token || !pagoManual || !comprobanteArchivo) return;
    setSubiendoComprobante(true);
    setError(null);
    try {
      await subirComprobantePago(token, pagoManual.compraId, comprobanteArchivo);
      setComprobanteSubido(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setSubiendoComprobante(false);
    }
  }

  // Pago manual iniciado -- esperando que el pasajero suba su
  // comprobante (transferencia, efectivo, DeUna, PayPhone).
  if (pagoManual) {
    const metodo = metodosDisponibles.find((m) => m.tipo === metodoElegido);
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {comprobanteSubido ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-bold text-brand-dark">
                ¡Comprobante recibido!
              </h1>
              <p className="mt-2 text-sm text-brand-dark/70">
                Tu{pasajerosData.length > 1 ? "s asientos quedan" : " asiento queda"} reservado
                {pasajerosData.length > 1 ? "s" : ""} mientras la cooperativa confirma tu pago. Te
                avisaremos cuando esté listo — revisa tu cuenta en "Mis boletos".
              </p>
              <Link
                href="/perfil?tab=boletos"
                className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
              >
                Ir a mis boletos
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold text-brand-dark">
                Ahora, paga y sube tu comprobante
              </h1>
              {metodo && (
                <div className="mt-3 rounded-xl bg-brand-light/30 p-4 text-sm text-brand-dark">
                  {Object.entries(metodo.datosCuenta).map(([clave, valor]) => (
                    <p key={clave}>
                      <span className="text-brand-dark/50 capitalize">{clave}: </span>
                      <span className="font-semibold">{valor}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <label htmlFor="checkout-comprobante" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Foto o captura del comprobante
                </label>
                <input
                  id="checkout-comprobante"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setComprobanteArchivo(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                />
              </div>
              {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
              <button
                onClick={subirComprobante}
                disabled={!comprobanteArchivo || subiendoComprobante}
                className="mt-4 w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {subiendoComprobante ? "Subiendo..." : "Subir comprobante"}
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // Boletos emitidos con éxito -- pantalla de confirmación. Fase
  // 7-item29 (07-ago-2026) -- ahora recorre TODOS los boletos
  // devueltos, no solo el primero.
  if (resultado?.estado === "aprobado" && resultado.boletos && resultado.boletos.length > 0) {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5">
          <p className="font-display text-lg font-bold text-brand-dark">
            {resultado.boletos.length > 1 ? "¡Boletos confirmados!" : "¡Boleto confirmado!"}
          </p>
          {/* Hallazgo real del director (15-ago-2026, recorrido en vivo
              de producción): faltaba cooperativa, ruta, hora, unidad y
              a nombre de quién queda el boleto -- se toma del primer
              boleto porque todos los boletos de una misma compra son
              del mismo viaje. */}
          <div className="mt-2 space-y-0.5 text-sm text-brand-dark/70">
            <p className="font-semibold text-brand-dark">{resultado.boletos[0].cooperativaNombre}</p>
            <p>{resultado.boletos[0].rutaOrigenCiudad} → {resultado.boletos[0].rutaDestinoCiudad}</p>
            <p>
              {new Date(resultado.boletos[0].horaSalidaProgramada).toLocaleDateString("es-EC", {
                weekday: "long", day: "numeric", month: "long",
              })}{" "}
              ·{" "}
              {new Date(resultado.boletos[0].horaSalidaProgramada).toLocaleTimeString("es-EC", {
                hour: "numeric", minute: "2-digit",
              })}
            </p>
            {resultado.boletos[0].unidadIdentificador && (
              <p>Unidad {resultado.boletos[0].unidadIdentificador}</p>
            )}
          </div>
          <div className="mt-4 space-y-6">
            {resultado.boletos.map((boleto) => (
              <div key={boleto.codigoQr} className="border-t border-brand-dark/10 pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm text-brand-dark/70">Asiento {boleto.numeroAsiento}</p>
                <p className="text-xs text-brand-dark/50">
                  A nombre de {boleto.compradorNombre}
                  {boleto.compradorDocumento ? ` — ${boleto.compradorDocumento}` : ""}
                </p>
                <div className="mt-2 space-y-1 rounded-lg bg-brand-light/30 px-4 py-3 text-left text-sm">
                  <div className="flex justify-between text-brand-dark/70">
                    <span>Tarifa</span>
                    <span>${boleto.precioPagado.toFixed(2)}</span>
                  </div>
                  {boleto.tasaTerminal > 0 && (
                    <div className="flex justify-between text-brand-dark/70">
                      <span>Tasa de terminal</span>
                      <span>${boleto.tasaTerminal.toFixed(2)}</span>
                    </div>
                  )}
                  {boleto.cargoPlataforma > 0 && (
                    <div className="flex justify-between text-brand-dark/70">
                      <span>Cargo de plataforma</span>
                      <span>${boleto.cargoPlataforma.toFixed(2)}</span>
                    </div>
                  )}
                  {resultado.ivaVisible && boleto.ivaMonto > 0 && (
                    <div className="flex justify-between text-xs text-brand-dark/40">
                      <span>IVA incluido en la tarifa</span>
                      <span>${boleto.ivaMonto.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <CodigoQr valor={boleto.codigoQr} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 rounded-lg bg-brand-light/30 px-4 py-3 text-left text-sm">
            {!!resultado.creditoAplicado && resultado.creditoAplicado > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Crédito aplicado</span>
                <span>-${resultado.creditoAplicado.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-brand-dark">
              <span>{resultado.creditoAplicado ? "Pagaste" : "Total"}</span>
              <span>${(resultado.montoPagado ?? resultado.montoTotal)?.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-brand-dark/50">
            Muestra estos códigos al abordar. También puedes tomarles una captura de pantalla.
          </p>
          <p className="mt-3 text-center text-sm font-semibold text-brand-dark">
            Gracias por preferirnos 🚌
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/perfil?tab=boletos"
              className="rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
            >
              Ver mis boletos
            </Link>
            <Link href="/" className="font-semibold text-brand hover:underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (paresAsiento.length === 0) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="text-brand-dark">Falta elegir un asiento primero.</p>
        <Link href={`/viajes/${viajeId}/asientos`} className="mt-4 inline-block font-semibold text-brand hover:underline">
          Elegir asiento
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-brand-light/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-bold text-brand-dark">Datos del pasajero</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          {esIdaYVuelta
            ? `Ida y vuelta -- ${paresAsiento.length} asientos en total`
            : numerosAsiento.length === 1
              ? `Asiento ${numerosAsiento[0]}`
              : `${numerosAsiento.length} asientos: ${numerosAsiento.join(", ")}`}
        </p>
        <form onSubmit={pagar} className="mt-6 space-y-6">
          {pasajerosData.map((p, indice) => (
            <div
              key={p.numeroAsiento}
              className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              {pasajerosData.length > 1 && (
                <p className="font-display text-sm font-bold text-brand-dark">
                  Pasajero {indice + 1} — Asiento {p.numeroAsiento}
                  {esIdaYVuelta && (
                    <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                      {paresAsiento[indice]?.tramo === "ida" ? "Ida" : "Vuelta"}
                    </span>
                  )}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`checkout-nombres-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Nombres
                  </label>
                  <input
                    id={`checkout-nombres-${indice}`}
                    type="text"
                    required
                    minLength={2}
                    value={p.nombres}
                    onChange={(e) => actualizarPasajero(indice, { nombres: e.target.value })}
                    className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
                <div>
                  <label htmlFor={`checkout-apellidos-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Apellidos
                  </label>
                  <input
                    id={`checkout-apellidos-${indice}`}
                    type="text"
                    required
                    minLength={2}
                    value={p.apellidos}
                    onChange={(e) => actualizarPasajero(indice, { apellidos: e.target.value })}
                    className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`checkout-tipo-documento-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Tipo de documento
                </label>
                <select
                  id={`checkout-tipo-documento-${indice}`}
                  value={p.tipoDocumento}
                  onChange={(e) => actualizarPasajero(indice, { tipoDocumento: e.target.value as DatosPasajero["tipoDocumento"] })}
                  className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                >
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label htmlFor={`checkout-documento-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  {p.tipoDocumento === "cedula" ? "Número de cédula" : "Número de pasaporte"}
                </label>
                <input
                  id={`checkout-documento-${indice}`}
                  type="text"
                  required
                  minLength={5}
                  value={p.documento}
                  onChange={(e) => actualizarPasajero(indice, { documento: e.target.value })}
                  className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                />
              </div>
              <div>
                <label htmlFor={`checkout-tipo-tarifa-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Tipo de tarifa
                </label>
                <select
                  id={`checkout-tipo-tarifa-${indice}`}
                  value={p.tipoTarifa}
                  onChange={(e) => actualizarPasajero(indice, { tipoTarifa: e.target.value as DatosPasajero["tipoTarifa"] })}
                  className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                >
                  {TARIFAS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-brand-light/40 px-3 py-2.5">
                <input
                  id={`checkout-embarazada-${indice}`}
                  type="checkbox"
                  checked={p.esEmbarazada}
                  onChange={(e) => actualizarPasajero(indice, { esEmbarazada: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-light text-brand focus:ring-brand-medium"
                />
                <label htmlFor={`checkout-embarazada-${indice}`} className="text-sm text-brand-dark/80">
                  ¿Viaja embarazada? — atención preferente, no afecta el precio
                </label>
              </div>
              {p.tipoTarifa === "nino" && (
                <div>
                  <label htmlFor={`checkout-fecha-nacimiento-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Fecha de nacimiento
                  </label>
                  <input
                    id={`checkout-fecha-nacimiento-${indice}`}
                    type="date"
                    value={p.fechaNacimiento}
                    onChange={(e) => actualizarPasajero(indice, { fechaNacimiento: e.target.value })}
                    className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
              )}
              {p.tipoTarifa === "nino" && (
                <div className="rounded-lg bg-brand-light/30 p-4">
                  <p className="text-sm font-semibold text-brand-dark">Autorización de viaje (RF-MENOR)</p>
                  <p className="mt-1 text-xs text-brand-dark/70">
                    Por ser un pasajero menor de edad, indica el adulto responsable que autoriza el viaje.
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor={`checkout-adulto-nombre-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                        Nombre del adulto responsable
                      </label>
                      <input
                        id={`checkout-adulto-nombre-${indice}`}
                        type="text"
                        value={p.adultoResponsableNombre}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableNombre: e.target.value })}
                        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor={`checkout-adulto-documento-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                        Documento del adulto responsable
                      </label>
                      <input
                        id={`checkout-adulto-documento-${indice}`}
                        type="text"
                        value={p.adultoResponsableDocumento}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableDocumento: e.target.value })}
                        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor={`checkout-adulto-telefono-${indice}`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                        Teléfono del adulto responsable (opcional)
                      </label>
                      <input
                        id={`checkout-adulto-telefono-${indice}`}
                        type="text"
                        value={p.adultoResponsableTelefono}
                        onChange={(e) => actualizarPasajero(indice, { adultoResponsableTelefono: e.target.value })}
                        className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            {mapa && (!mapa.permiteCancelacion || !mapa.permiteReprogramacion) && (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <p className="font-semibold">Antes de confirmar el pago, lee esto:</p>
                {!mapa.permiteCancelacion && !mapa.permiteReprogramacion ? (
                  <p className="mt-1">
                    Esta cooperativa no permite cambios ni devoluciones — si no viajas, pierdes el
                    boleto completo.
                  </p>
                ) : (
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {!mapa.permiteCancelacion && <li>No podrás cancelar este boleto.</li>}
                    {!mapa.permiteReprogramacion && <li>No podrás reprogramar este boleto.</li>}
                  </ul>
                )}
              </div>
            )}
            {metodosDisponibles.length > 0 && (
              <div>
                <label htmlFor="checkout-metodo-pago" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Cómo quieres pagar
                </label>
                <select
                  id="checkout-metodo-pago"
                  value={metodoElegido}
                  onChange={(e) => setMetodoElegido(e.target.value as typeof metodoElegido)}
                  className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                >
                  <option value="tarjeta">Tarjeta</option>
                  {metodosDisponibles.map((m) => (
                    <option key={m.tipo} value={m.tipo}>
                      {
                        {
                          transferencia_bancaria: "Transferencia bancaria",
                          efectivo: "Efectivo",
                          deuna: "DeUna",
                          payphone: "PayPhone (billetera)",
                          tarjeta_pasarela: "Tarjeta",
                        }[m.tipo]
                      }
                    </option>
                  ))}
                </select>
                {metodoElegido !== "tarjeta" && (
                  <p className="mt-1 text-xs text-brand-dark/50">
                    Pagas por fuera de la plataforma y subes tu comprobante — la cooperativa confirma
                    tu{pasajerosData.length > 1 ? "s boletos" : " boleto"} después.
                  </p>
                )}
              </div>
            )}
            {creditos.length > 0 && (
              <div>
                <label htmlFor="checkout-credito" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Usar un crédito disponible (opcional)
                </label>
                <select
                  id="checkout-credito"
                  value={creditoElegidoId}
                  onChange={(e) => setCreditoElegidoId(e.target.value)}
                  className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                >
                  <option value="">No usar crédito</option>
                  {creditos.map((c) => (
                    <option key={c.id} value={c.id}>
                      ${c.monto.toFixed(2)} — {c.cooperativaNombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-brand-dark/50">
                  Solo se aplica si el crédito es de la misma cooperativa que este viaje.
                </p>
              </div>
            )}
            {!tokenValido() && (
              <div className="space-y-3 rounded-lg border border-brand-dark/10 bg-brand-light/30 p-4">
                <p className="text-sm font-semibold text-brand-dark">
                  Compras sin crear cuenta -- solo necesitamos donde enviarte tu boleto
                </p>
                <div>
                  <label htmlFor="checkout-invitado-telefono" className="block text-sm font-medium text-brand-dark/70">
                    Telefono (para WhatsApp)
                  </label>
                  <input
                    id="checkout-invitado-telefono"
                    type="tel"
                    value={telefonoContacto}
                    onChange={(e) => setTelefonoContacto(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 text-sm"
                    placeholder="0991234567"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-invitado-correo" className="block text-sm font-medium text-brand-dark/70">
                    Correo (opcional si ya diste telefono)
                  </label>
                  <input
                    id="checkout-invitado-correo"
                    type="email"
                    value={correoContacto}
                    onChange={(e) => setCorreoContacto(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 text-sm"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>
            )}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={procesando}
              className="w-full rounded-lg bg-brand-amber px-6 py-3 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
            >
              {procesando
                ? "Procesando..."
                : metodoElegido === "tarjeta"
                  ? "Pagar y confirmar"
                  : "Continuar"}
            </button>
            <p className="text-center text-xs text-brand-dark/40">
              Pago de prueba — todavía no está conectada una pasarela real.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = usePromise(params);
  return (
    <Suspense fallback={null}>
      <FormularioCheckout viajeId={viajeId} />
    </Suspense>
  );
}
