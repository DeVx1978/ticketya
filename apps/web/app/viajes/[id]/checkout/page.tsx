"use client";

import { Suspense, useState, useEffect, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { crearCompra, listarMisCreditos, obtenerMapaAsientos, iniciarPagoManual, subirComprobantePago, listarMetodosPagoPorViaje, type ResultadoCompra, type MiCredito, type MapaAsientos, type MetodoPagoDisponible, type TipoMetodoPago } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { CodigoQr } from "@/components/CodigoQr";

const TARIFAS = [
  { valor: "adulto", etiqueta: "Adulto (tarifa completa)" },
  { valor: "nino", etiqueta: "Niño 3-11 años (50% descuento)" },
  { valor: "tercera_edad", etiqueta: "Tercera edad (50% descuento)" },
  { valor: "discapacidad", etiqueta: "Discapacidad (descuento según carnet CONADIS)" },
] as const;

function FormularioCheckout({ viajeId }: { viajeId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const numeroAsiento = searchParams.get("asiento") ?? "";

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [documento, setDocumento] = useState("");
  const [tipoTarifa, setTipoTarifa] = useState<(typeof TARIFAS)[number]["valor"]>("adulto");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [adultoResponsableNombre, setAdultoResponsableNombre] = useState("");
  const [adultoResponsableDocumento, setAdultoResponsableDocumento] = useState("");
  const [adultoResponsableTelefono, setAdultoResponsableTelefono] = useState("");
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

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    const token = tokenValido();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent(`/viajes/${viajeId}/checkout?asiento=${numeroAsiento}`)}`);
      return;
    }
    if (tipoTarifa === "nino" && (!adultoResponsableNombre.trim() || !adultoResponsableDocumento.trim())) {
      setError("Para un pasajero niño, indica el nombre y documento del adulto responsable.");
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const pasajero = {
        viajeId,
        numeroAsiento,
        nombreCompleto,
        documento,
        tipoTarifa,
        fechaNacimiento: fechaNacimiento || undefined,
        autorizacionMenor:
          tipoTarifa === "nino"
            ? {
                tipoAcompanamiento: "con_autorizacion" as const,
                adultoResponsableNombre: adultoResponsableNombre.trim(),
                adultoResponsableDocumento: adultoResponsableDocumento.trim(),
                adultoResponsableTelefono: adultoResponsableTelefono.trim() || undefined,
              }
            : undefined,
      };

      if (metodoElegido === "tarjeta") {
        const resp = await crearCompra([pasajero], token, idempotencyKey, creditoElegidoId || undefined);
        setResultado(resp);
        if (resp.estado === "rechazado") {
          setError(resp.motivo ?? "El pago fue rechazado.");
        }
      } else {
        // Métodos de pago manuales (29-jul-2026) -- el asiento queda
        // reservado esperando el comprobante y la confirmación de la
        // cooperativa, no se emite el boleto todavía.
        const resp = await iniciarPagoManual(token, [pasajero], metodoElegido, idempotencyKey);
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
                Tu asiento queda reservado mientras la cooperativa confirma tu pago. Te avisaremos
                cuando esté listo — revisa tu cuenta en "Mis boletos".
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

  // Boleto emitido con éxito — pantalla de confirmación.
  if (resultado?.estado === "aprobado" && resultado.boletos?.[0]) {
    const boleto = resultado.boletos[0];
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5">
          <p className="font-display text-lg font-bold text-brand-dark">¡Boleto confirmado!</p>
          <p className="mt-1 text-sm text-brand-dark/70">Asiento {numeroAsiento}</p>

          <div className="mt-4 space-y-1 rounded-lg bg-brand-light/30 px-4 py-3 text-left text-sm">
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
            {!!resultado.creditoAplicado && resultado.creditoAplicado > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Crédito aplicado</span>
                <span>-${resultado.creditoAplicado.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-brand-dark/10 pt-1 font-semibold text-brand-dark">
              <span>{resultado.creditoAplicado ? "Pagaste" : "Total"}</span>
              <span>${(resultado.montoPagado ?? resultado.montoTotal)?.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5">
            <CodigoQr valor={boleto.codigoQr} />
          </div>
          <p className="mt-4 text-xs text-brand-dark/50">
            Muestra este código al abordar. También puedes tomarle una captura de pantalla.
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

  if (!numeroAsiento) {
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
        <p className="mt-1 text-sm text-brand-dark/70">Asiento {numeroAsiento}</p>

        <form onSubmit={pagar} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div>
            <label htmlFor="checkout-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
id="checkout-nombre"
              type="text"
              required
              minLength={3}
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="checkout-documento" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Cédula / documento
            </label>
            <input
id="checkout-documento"
              type="text"
              required
              minLength={5}
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="checkout-tipo-tarifa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Tipo de tarifa
            </label>
            <select
id="checkout-tipo-tarifa"
              value={tipoTarifa}
              onChange={(e) => setTipoTarifa(e.target.value as typeof tipoTarifa)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              {TARIFAS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
          {tipoTarifa === "nino" && (
            <div>
              <label htmlFor="checkout-fecha-nacimiento" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Fecha de nacimiento
              </label>
              <input
id="checkout-fecha-nacimiento"
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
          )}

          {tipoTarifa === "nino" && (
            <div className="rounded-lg bg-brand-light/30 p-4">
              <p className="text-sm font-semibold text-brand-dark">Autorización de viaje (RF-MENOR)</p>
              <p className="mt-1 text-xs text-brand-dark/70">
                Por ser un pasajero menor de edad, indica el adulto responsable que autoriza el viaje.
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="checkout-adulto-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Nombre del adulto responsable
                  </label>
                  <input
id="checkout-adulto-nombre"
                    type="text"
                    value={adultoResponsableNombre}
                    onChange={(e) => setAdultoResponsableNombre(e.target.value)}
                    className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-adulto-documento" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Documento del adulto responsable
                  </label>
                  <input
id="checkout-adulto-documento"
                    type="text"
                    value={adultoResponsableDocumento}
                    onChange={(e) => setAdultoResponsableDocumento(e.target.value)}
                    className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-adulto-telefono" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Teléfono del adulto responsable (opcional)
                  </label>
                  <input
id="checkout-adulto-telefono"
                    type="text"
                    value={adultoResponsableTelefono}
                    onChange={(e) => setAdultoResponsableTelefono(e.target.value)}
                    className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                </div>
              </div>
            </div>
          )}

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
                  tu boleto después.
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
