"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";

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
              Ticket<span className="text-brand-amber">Ya</span>
              <span className="ml-2 rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-bold text-brand">
                Panel Empresa
              </span>
            </span>
            <nav className="hidden gap-1 md:flex">
              {ENLACES.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    pathname === enlace.href
                      ? "bg-brand text-white"
                      : "text-brand-dark/70 hover:bg-brand-light"
                  }`}
                >
                  {enlace.etiqueta}
                </Link>
              ))}
            </nav>
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
        {/* Menú de navegación en móvil, debajo de la barra superior */}
        <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-4 py-2 md:hidden">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
