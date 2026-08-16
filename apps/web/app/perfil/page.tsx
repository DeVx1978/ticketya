"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { obtenerMiPerfil, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { TabDatosPersonales } from "./TabDatosPersonales";
import { TabMisBoletos } from "./TabMisBoletos";
import { TabMisCreditos } from "./TabMisCreditos";
import { TabWallet } from "./TabWallet";
import { TabReferidos } from "./TabReferidos";

/**
 * "Mi cuenta" unificada (29-jul-2026) — antes, datos personales y
 * boletos vivían en dos páginas sueltas (/perfil y /mis-boletos), sin
 * conexión visual entre sí. Ahora es una sola sección con pestañas,
 * el patrón que usan las mejores plataformas (una sola "área de
 * cuenta", no pantallas dispersas).
 *
 * Rediseño 15-ago-2026 -- hallazgo real del director en el recorrido
 * en vivo de producción: la versión anterior se veía como una lista
 * de formularios angosta (max-w-lg, ~512px, igual en celular que en
 * monitor grande), y wallet/referidos ni siquiera existían como
 * pestañas -- el backend de ambos ya funcionaba de punta a punta,
 * pero el pasajero no tenía dónde verlo. Dirección real: la
 * identidad como un pase de abordar de verdad (mismo lenguaje visual
 * que ya usa el boleto PDF), no una tarjeta de gradiente genérica.
 */
const PESTANAS = [
  { valor: "datos", etiqueta: "Mis datos" },
  { valor: "boletos", etiqueta: "Mis viajes" },
  { valor: "wallet", etiqueta: "Mi saldo" },
  { valor: "referidos", etiqueta: "Invitar y ganar" },
  { valor: "creditos", etiqueta: "Créditos" },
] as const;

type Pestana = (typeof PESTANAS)[number]["valor"];

function MiCuenta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [qrCodigoPasajero, setQrCodigoPasajero] = useState<string | null>(null);

  const pestanaParam = searchParams.get("tab");
  const valoresValidos = PESTANAS.map((p) => p.valor);
  const pestanaActiva: Pestana = (
    valoresValidos.includes(pestanaParam as Pestana) ? pestanaParam : "datos"
  ) as Pestana;

  useEffect(() => {
    const token = tokenValido();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent("/perfil")}`);
      return;
    }
    obtenerMiPerfil(token)
      .then(setPerfil)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar tu perfil."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!perfil) return;
    QRCode.toDataURL(perfil.codigoPasajero, { margin: 1, width: 160 })
      .then(setQrCodigoPasajero)
      .catch(() => setQrCodigoPasajero(null));
  }, [perfil]);

  function cambiarPestana(valor: Pestana) {
    router.push(`/perfil?tab=${valor}`);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-brand-dark/50">
        Cargando...
      </main>
    );
  }

  const iniciales = perfil.nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-10 lg:px-8">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Mi cuenta</h1>

      {/* Identidad, en forma de pase de abordar real -- mismo talón
          recortable y franja de marca que ya usa el boleto PDF, para
          que el pasaporte de viajero se sienta parte de la misma
          familia visual, no una tarjeta de gradiente genérica. Ancho
          completo real (15-ago-2026, hallazgo del director: "no debe
          verse centrado, debe adaptarse a la pantalla") -- la tarjeta
          crece con la pantalla en vez de quedar flotando en el centro
          con espacio vacío a los lados. */}
      <div className="mt-6 overflow-hidden rounded-2xl bg-brand-dark shadow-lg shadow-brand-dark/10">
        <div className="flex flex-wrap items-center gap-5 px-6 py-6 sm:px-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-amber font-display text-2xl font-bold text-brand-dark">
            {iniciales || "P"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold text-white">{perfil.nombreCompleto}</p>
            <p className="text-sm text-white/50">
              Viajero desde{" "}
              {new Date(perfil.creadoEn).toLocaleDateString("es-EC", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-brand-amber">
              {perfil.viajesCompletados ?? 0}
            </p>
            <p className="text-xs text-white/50">
              {perfil.viajesCompletados === 1 ? "viaje completado" : "viajes completados"}
            </p>
          </div>
        </div>
        <div className="relative border-t border-dashed border-white/15">
          <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white" />
          <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-white" />
        </div>
        <div className="flex items-center gap-4 bg-brand-amber/10 px-6 py-4 sm:px-8">
          {qrCodigoPasajero && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el cliente
            <img
              src={qrCodigoPasajero}
              alt={`Código de pasajero ${perfil.codigoPasajero}`}
              className="h-14 w-14 rounded-lg bg-white p-1"
            />
          )}
          <div>
            <p className="font-display text-lg font-bold tracking-wide text-brand-amber">
              {perfil.codigoPasajero}
            </p>
            <p className="text-xs text-white/40">
              Muéstralo en el terminal para verificar tu identidad, aunque no tengas tu boleto a mano.
            </p>
          </div>
        </div>
      </div>

      {/* En celular/tablet: pestañas horizontales arriba, mismo
          comportamiento de siempre. En pantalla grande (lg+): panel
          lateral fijo, mismo patrón que Stripe/Linear para páginas de
          cuenta -- usa el ancho real de la pantalla en vez de una
          columna angosta flotando en el centro. */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-black/5 lg:hidden">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            onClick={() => cambiarPestana(p.valor)}
            className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              pestanaActiva === p.valor
                ? "border-b-2 border-brand text-brand-dark"
                : "text-brand-dark/50 hover:text-brand-dark/80"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
        <nav className="hidden lg:sticky lg:top-6 lg:block lg:space-y-1">
          {PESTANAS.map((p) => (
            <button
              key={p.valor}
              onClick={() => cambiarPestana(p.valor)}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${
                pestanaActiva === p.valor
                  ? "bg-brand-dark text-white"
                  : "text-brand-dark/60 hover:bg-brand-dark/5 hover:text-brand-dark"
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {pestanaActiva === "datos" && (
            <div className="max-w-2xl">
              <TabDatosPersonales
                perfil={perfil}
                onActualizado={(cambios) => setPerfil((p) => (p ? { ...p, ...cambios } : p))}
                onExito={setMensajeExito}
              />
            </div>
          )}
          {pestanaActiva === "boletos" && (
            <div className="max-w-2xl">
              <TabMisBoletos onExito={setMensajeExito} />
            </div>
          )}
          {pestanaActiva === "wallet" && <TabWallet />}
          {pestanaActiva === "referidos" && <TabReferidos perfil={perfil} />}
          {pestanaActiva === "creditos" && (
            <div className="max-w-2xl">
              <TabMisCreditos />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={null}>
      <MiCuenta />
    </Suspense>
  );
}
