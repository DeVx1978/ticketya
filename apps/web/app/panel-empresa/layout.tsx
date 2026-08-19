"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";
import { obtenerEstadoDatosCoop, type EstadoDatosCooperativa } from "@/lib/api";

const ENLACES = [
  { href: "/panel-empresa", etiqueta: "Panel" },
  { href: "/panel-empresa/rutas", etiqueta: "Rutas" },
  { href: "/panel-empresa/unidades", etiqueta: "Unidades" },
  { href: "/panel-empresa/personal", etiqueta: "Personal" },
  { href: "/panel-empresa/viajes", etiqueta: "Viajes" },
  { href: "/panel-empresa/validar-qr", etiqueta: "Validar boleto" },
  { href: "/panel-empresa/pagos-pendientes", etiqueta: "Pagos pendientes" },
  { href: "/panel-empresa/solicitudes-factura", etiqueta: "Facturas" },
  { href: "/panel-empresa/configuracion", etiqueta: "Configuración" },
  { href: "/panel-empresa/carga-masiva", etiqueta: "Carga masiva" },
];

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
      // Sesión válida, pero de un rol que no pertenece a este panel
      // (ej. un pasajero o un admin de plataforma) — no lo dejamos
      // entrar, pero tampoco lo mandamos a "iniciar sesión" de nuevo
      // porque sí tiene una sesión válida.
      router.replace("/");
      return;
    }
    // Guardia de autenticación al montar: se verifica una vez contra
    // localStorage (un sistema externo a React) y recién ahí se habilita
    // el render. Es el patrón estándar para esto — no hay una alternativa
    // más simple que siga siendo correcta.
    setPayload(datos);
    setVerificando(false);

    // Ítem 10 (04-ago-2026) -- el endpoint es exclusivo de
    // admin_cooperativa (backend), así que solo se consulta para ese
    // rol -- un vendedor recibiría 403 y no necesita ver este banner,
    // no es su responsabilidad confirmar los datos legales.
    if (datos.rol === "admin_cooperativa") {
      obtenerEstadoDatosCoop(token)
        .then(setEstadoDatos)
        .catch(() => {
          // silencioso a propósito -- un fallo al cargar el banner no
          // debe impedir que el resto del panel funcione.
        });
    }
  }, [router, pathname]);

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-light/20">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <span className="font-display text-lg font-extrabold text-brand">
              Columbus
              <span className="ml-2 rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-bold text-brand">
                Panel Empresa
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-brand-dark/50 sm:inline">
              {payload?.rol === "admin_cooperativa" ? "Administrador" : "Vendedor"}
            </span>
            <button
              onClick={salir}
              className="rounded-lg border border-brand-light px-3 py-1.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light"
            >
              Salir
            </button>
          </div>
        </div>
        {/* Menú de navegación en móvil/tablet, debajo de la barra superior --
            hallazgo real del director (18-ago-2026): en pantalla grande esto
            se ve amontonado; ahora vive en un panel lateral fijo (ver abajo),
            mismo patrón real ya usado en /perfil (Stripe/Linear). */}
        <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-4 py-2 lg:hidden">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                pathname === enlace.href ? "bg-brand text-white" : "text-brand-dark/70"
              }`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>
      </header>
      {estadoDatos && estadoDatos.estado !== "al_dia" && (
        <div
          className={`px-4 py-2.5 text-center text-sm font-medium ${
            estadoDatos.estado === "bloqueado"
              ? "bg-red-50 text-red-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {estadoDatos.estado === "bloqueado" ? (
            <>
              Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse —
              crear horarios recurrentes y la carga masiva están bloqueados hasta que los
              confirmes.{" "}
            </>
          ) : (
            <>
              Tus datos legales llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse.{" "}
            </>
          )}
          <Link href="/panel-empresa/configuracion" className="font-bold underline">
            Confirmar mis datos
          </Link>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
          <nav className="hidden lg:sticky lg:top-24 lg:block lg:space-y-1">
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${
                  pathname === enlace.href
                    ? "bg-brand-dark text-white"
                    : "text-brand-dark/60 hover:bg-brand-dark/5 hover:text-brand-dark"
                }`}
              >
                {enlace.etiqueta}
              </Link>
            ))}
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
