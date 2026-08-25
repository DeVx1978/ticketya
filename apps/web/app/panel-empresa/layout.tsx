"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";
import { obtenerEstadoDatosCoop, type EstadoDatosCooperativa } from "@/lib/api";

/* Rediseño real del panel de cooperativa (25-ago-2026), Fase 1 --
   orden explícita del director: mismo nivel de calidad visual que
   ya se aplicó a /admin (sección 5.63, TailAdmin SaaS), pero con un
   acento de color DISTINTO -- para que cada panel se distinga a
   simple vista, sin tener que leer texto.

   Admin usa cobalto (azul, infraestructura de toda la plataforma).
   Este panel usa ÁMBAR (#f5a800) -- el color real de la marca
   Columbus (el bus, el logo) -- decisión real aprobada por el
   director tras verificar que coincide exacto con el real, en vez
   de inventar un color nuevo sin aprobación. Estado activo del menú
   en ámbar SUAVE (`bg-brand-amber/15`), no sólido -- para no
   confundirse con los botones de acción reales (ej. "Buscar
   pasajes"), que sí son ámbar sólido en todo el sitio. */

const ENLACES = [
  { href: "/panel-empresa", etiqueta: "Panel", icono: IconoPanel },
  { href: "/panel-empresa/rutas", etiqueta: "Rutas", icono: IconoRutas },
  { href: "/panel-empresa/unidades", etiqueta: "Unidades", icono: IconoUnidades },
  { href: "/panel-empresa/personal", etiqueta: "Personal", icono: IconoPersonal, soloAdmin: true },
  { href: "/panel-empresa/viajes", etiqueta: "Viajes", icono: IconoViajes },
  { href: "/panel-empresa/validar-qr", etiqueta: "Validar boleto", icono: IconoValidar },
  { href: "/panel-empresa/pagos-pendientes", etiqueta: "Pagos pendientes", icono: IconoPagos, soloAdmin: true },
  { href: "/panel-empresa/solicitudes-factura", etiqueta: "Facturas", icono: IconoFacturas, soloAdmin: true },
  { href: "/panel-empresa/configuracion", etiqueta: "Configuración", icono: IconoConfiguracion, soloAdmin: true },
  { href: "/panel-empresa/carga-masiva", etiqueta: "Carga masiva", icono: IconoCargaMasiva, soloAdmin: true },
];

function IconoPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function IconoRutas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 7.5C10 10 14 14 15.8 16.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}
function IconoUnidades({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="10" rx="2" />
      <path d="M3 11h18" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </svg>
  );
}
function IconoPersonal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <path d="M16 5.5c1.7.4 3 2 3 3.9 0 1.7-1 3.1-2.5 3.7" />
      <path d="M18 14.5c2.4.6 4 2.7 4 5.5" />
    </svg>
  );
}
function IconoViajes({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function IconoValidar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 15l2.5 2.5L21 13" />
    </svg>
  );
}
function IconoPagos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconoFacturas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2h9l3 3v17H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}
function IconoConfiguracion({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconoCargaMasiva({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

/**
 * Protección de acceso a nivel de interfaz — SOLO para experiencia de
 * usuario (evitar que alguien vea un panel vacío o roto por no tener
 * sesión). No es la barrera de seguridad real: esa vive en el backend
 * (JwtAuthGuard + RolesGuard en cada endpoint de /coop/*), que rechaza
 * la petición sin importar lo que haga esta pantalla.
 */
export default function PanelEmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [payload, setPayload] = useState<PayloadToken | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosCooperativa | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) {
      router.replace(`/ingresar?volverA=${encodeURIComponent(pathname)}`);
      return;
    }
    const datos = decodificarToken(token);
    if (!datos || tokenExpirado(datos)) {
      borrarToken();
      router.replace(`/ingresar?volverA=${encodeURIComponent(pathname)}`);
      return;
    }
    if (datos.rol !== "admin_cooperativa" && datos.rol !== "vendedor") {
      router.replace("/");
      return;
    }
    setPayload(datos);
    setVerificando(false);

    if (datos.rol === "admin_cooperativa") {
      obtenerEstadoDatosCoop(token)
        .then(setEstadoDatos)
        .catch(() => {
          // silencioso a propósito -- un fallo al cargar el banner no
          // debe impedir que el resto del panel funcione.
        });
    }
  }, [router, pathname]);

  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [pathname]);

  function salir() {
    borrarToken();
    router.replace("/ingresar");
  }

  if (verificando) {
    return (
      <div className="flex flex-1 items-center justify-center bg-brand-light/30">
        <p className="text-sm text-brand-dark/50">Verificando sesión...</p>
      </div>
    );
  }

  const enlacesVisibles = ENLACES.filter((enlace) => !enlace.soloAdmin || payload?.rol === "admin_cooperativa");
  const paginaActual = enlacesVisibles.find((e) => e.href === pathname)?.etiqueta ?? "Panel";

  return (
    <div className="flex min-h-full flex-1 bg-brand-light/20">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 bg-brand-amber px-6">
          <Image src="/img/logo-columbus.png" alt="Columbus" width={110} height={28} priority />
        </div>
        <div className="px-4 pt-4">
          <span className="rounded-full bg-brand-amber/15 px-2.5 py-1 text-xs font-bold text-brand-amber">
            Panel Empresa
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {enlacesVisibles.map((enlace) => {
            const activo = pathname === enlace.href;
            const Icono = enlace.icono;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  activo
                    ? "bg-brand-amber/15 text-brand-amber"
                    : "text-brand-dark/60 hover:bg-brand-amber/10 hover:text-brand-amber"
                }`}
              >
                <Icono className="h-5 w-5 shrink-0" />
                {enlace.etiqueta}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-black/5 p-4">
          <p className="px-2 text-xs font-medium text-brand-dark/40">
            {payload?.rol === "admin_cooperativa" ? "Administrador" : "Vendedor"}
          </p>
          <button
            onClick={salir}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark/60 transition hover:bg-brand-light hover:text-brand-dark"
          >
            Salir
          </button>
        </div>
      </aside>

      {menuMovilAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuMovilAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between bg-brand-amber px-4 py-4">
              <Image src="/img/logo-columbus.png" alt="Columbus" width={100} height={26} />
              <button
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-brand-dark/70 hover:bg-black/5"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1 p-4">
              {enlacesVisibles.map((enlace) => {
                const activo = pathname === enlace.href;
                const Icono = enlace.icono;
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      activo ? "bg-brand-amber/15 text-brand-amber" : "text-brand-dark/60"
                    }`}
                  >
                    <Icono className="h-5 w-5 shrink-0" />
                    {enlace.etiqueta}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/5 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuMovilAbierto(true)}
              aria-label="Abrir menú"
              className="rounded-lg p-2 text-brand-dark/60 hover:bg-brand-light lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-display text-lg font-bold text-brand-dark">{paginaActual}</h1>
          </div>
          <button
            onClick={salir}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light lg:hidden"
          >
            Salir
          </button>
        </header>
        {estadoDatos && estadoDatos.estado !== "al_dia" && (
          <div
            className={`px-4 py-2.5 text-center text-sm font-medium lg:px-8 ${
              estadoDatos.estado === "bloqueado" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
            }`}
          >
            {estadoDatos.estado === "bloqueado" ? (
              <>
                Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse — crear
                horarios recurrentes y la carga masiva están bloqueados hasta que los confirmes.{" "}
              </>
            ) : (
              <>Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse. </>
            )}
            <Link href="/panel-empresa/configuracion" className="font-bold underline">
              Confirmar mis datos
            </Link>
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
