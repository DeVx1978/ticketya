"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { obtenerMiPerfil, subirFotoPerfil, type MiPerfil } from "@/lib/api";
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
  // Fase perfil-moderno (24-ago-2026) -- botón de cámara sobre el
  // avatar del encabezado, mismo endpoint/función real que ya existía
  // (`subirFotoPerfil`, usada hasta ahora solo en la pestaña "Mis
  // datos"). Estado propio aquí porque el disparador vive en el
  // encabezado, fuera de `TabDatosPersonales`.
  const [subiendoFotoHeader, setSubiendoFotoHeader] = useState(false);
  const [errorFotoHeader, setErrorFotoHeader] = useState<string | null>(null);

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

  async function subirFotoDesdeHeader(archivo: File) {
    const token = tokenValido();
    if (!token) return;
    setErrorFotoHeader(null);
    setSubiendoFotoHeader(true);
    try {
      const url = await subirFotoPerfil(token, archivo);
      setPerfil((p) => (p ? { ...p, fotoUrl: url } : p));
      setMensajeExito("Foto de perfil actualizada.");
    } catch (err) {
      setErrorFotoHeader(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoHeader(false);
    }
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

      {/* Identidad -- rediseño real 19-ago-2026, hallazgo del director:
          la version anterior (horizontal, tipo pase de abordar solo)
          se veia poco profesional. Nuevo patron real: encabezado tipo
          Airbnb (foto grande centrada, nombre prominente, fila de
          insignias con datos reales) + el mismo talon recortable de
          siempre para el QR, ahora como elemento secundario, no
          protagonista. */}
      {/* Corrección real 19-ago-2026, hallazgo del director: el negro
          completo "se siente fúnebre" -- mismo criterio ya usado en
          la portada, reemplazado por el azul cobalto de marca. */}
      {/* Rediseño real (24-ago-2026, orden explícita del director):
          "quiero que se vea como una sección de perfil moderna" --
          referencia real compartida (plantilla de perfil tipo
          X/Twitter: foto de portada + avatar superpuesto en la
          esquina, no centrado). Adaptado con nuestros datos y marca
          reales:
          - Portada: `hero-2.jpg`, la misma foto real de la Terminal
            de Machala ya usada en el Hero -- nunca una foto de banco
            de imágenes (regla ya establecida del proyecto).
          - Avatar superpuesto en la esquina inferior izquierda de la
            portada, con anillo blanco -- mismo patrón real de
            perfiles modernos (Twitter/X, LinkedIn).
          - Bug real encontrado en el camino: el avatar SIEMPRE
            mostraba las iniciales, aunque `perfil.fotoUrl` ya
            existiera (la función de subir foto ya funcionaba desde
            la pestaña "Mis datos", pero el resultado nunca se veía
            reflejado aquí). Corregido: si hay `fotoUrl` real, se
            muestra la foto; si no, las iniciales como respaldo.
          - Botón de cámara superpuesto sobre el avatar -- mismo
            endpoint/función real ya existente (`subirFotoPerfil`),
            solo que ahora también se puede disparar desde aquí, no
            solo desde la pestaña "Mis datos" (esa sigue funcionando
            igual, sin tocar). */}
      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
        <div className="relative h-32 w-full sm:h-44">
          <Image src="/img/hero-2.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 896px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/10" />
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="relative -mt-12 inline-block sm:-mt-16">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-brand-amber ring-4 ring-white sm:h-32 sm:w-32">
              {perfil.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica (almacenamiento configurable), no un asset local -- mismo patrón real ya usado en TarjetaCooperativaAgrupada para cooperativaLogoUrl
                <img src={perfil.fotoUrl} alt={perfil.nombreCompleto} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-brand-dark sm:text-4xl">
                  {iniciales || "P"}
                </div>
              )}
            </div>

            <label
              htmlFor="perfil-foto-header"
              aria-label="Cambiar foto de perfil"
              className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-brand-dark text-white shadow-md ring-2 ring-white transition hover:bg-brand-dark/80"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </label>
            <input
              id="perfil-foto-header"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={subiendoFotoHeader}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) subirFotoDesdeHeader(archivo);
              }}
            />
          </div>

          <div className="mt-3">
            <p className="font-display text-xl font-bold text-brand-dark sm:text-2xl">{perfil.nombreCompleto}</p>
            {subiendoFotoHeader && <p className="mt-1 text-xs text-brand-dark/50">Subiendo foto…</p>}
            {errorFotoHeader && <p className="mt-1 text-xs font-medium text-red-600">{errorFotoHeader}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark/70">
                Viajero desde{" "}
                {new Date(perfil.creadoEn).toLocaleDateString("es-EC", { month: "long", year: "numeric" })}
              </span>
              <span className="rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark/70">
                {perfil.viajesCompletados ?? 0}{" "}
                {perfil.viajesCompletados === 1 ? "viaje completado" : "viajes completados"}
              </span>
              <span className="rounded-full bg-brand-amber/15 px-3 py-1.5 text-xs font-bold tracking-wide text-brand-amber">
                {perfil.codigoPasajero}
              </span>
            </div>
          </div>
        </div>

        <div className="relative border-t border-dashed border-black/10">
          <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-brand-light/40" />
          <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-brand-light/40" />
        </div>
        <div className="flex items-center gap-4 bg-brand-light/30 px-5 py-4 sm:px-8">
          {qrCodigoPasajero && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el cliente
            <img
              src={qrCodigoPasajero}
              alt={`Código de pasajero ${perfil.codigoPasajero}`}
              className="h-14 w-14 rounded-lg bg-white p-1 ring-1 ring-black/5"
            />
          )}
          <p className="text-xs text-brand-dark/50">
            Muestra este código QR en el terminal para verificar tu identidad, aunque no tengas tu boleto a
            mano.
          </p>
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
