"use client";

import { Suspense, useState, use as usePromise } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { crearCompra, type ResultadoCompra } from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
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
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent(`/viajes/${viajeId}/checkout?asiento=${numeroAsiento}`)}`);
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const resp = await crearCompra(
        [
          {
            viajeId,
            numeroAsiento,
            nombreCompleto,
            documento,
            tipoTarifa,
            fechaNacimiento: fechaNacimiento || undefined,
          },
        ],
        token,
        idempotencyKey,
      );
      setResultado(resp);
      if (resp.estado === "rechazado") {
        setError(resp.motivo ?? "El pago fue rechazado.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la compra.");
    } finally {
      setProcesando(false);
    }
  }

  // Boleto emitido con éxito — pantalla de confirmación.
  if (resultado?.estado === "aprobado" && resultado.boletos?.[0]) {
    const boleto = resultado.boletos[0];
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5">
          <p className="font-display text-lg font-bold text-brand-dark">¡Boleto confirmado!</p>
          <p className="mt-1 text-sm text-brand-dark/60">Asiento {numeroAsiento}</p>

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
            <div className="mt-1 flex justify-between border-t border-brand-dark/10 pt-1 font-semibold text-brand-dark">
              <span>Total</span>
              <span>${resultado.montoTotal?.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5">
            <CodigoQr valor={boleto.codigoQr} />
          </div>
          <p className="mt-4 text-xs text-brand-dark/50">
            Muestra este código al abordar. También puedes tomarle una captura de pantalla.
          </p>
          <Link href="/" className="mt-6 inline-block font-semibold text-brand hover:underline">
            Volver al inicio
          </Link>
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
        <p className="mt-1 text-sm text-brand-dark/60">Asiento {numeroAsiento}</p>

        <form onSubmit={pagar} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Nombre completo
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Cédula / documento
            </label>
            <input
              type="text"
              required
              minLength={5}
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Tipo de tarifa
            </label>
            <select
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={procesando}
            className="w-full rounded-lg bg-brand-amber px-6 py-3 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {procesando ? "Procesando pago..." : "Pagar y confirmar"}
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
