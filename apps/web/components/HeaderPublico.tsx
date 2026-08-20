"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { obtenerToken, decodificarToken, tokenExpirado, borrarToken, type PayloadToken } from "@/lib/auth";

const RUTA_POR_ROL: Record<PayloadToken["rol"], string> = {
  admin_plataforma: "/admin",
  super_admin: "/admin",
  admin_cooperativa: "/panel-empresa",
  vendedor: "/panel-empresa",
  pasajero: "/",
};

/**
 * Header público (pasajero, sin sesión o con sesión de pasajero) —
 * pedido explícito del usuario (22-jul-2026): antes, la única forma de
 * llegar a /ingresar era escribiendo la URL a mano, no había ningún
 * enlace visible.
 *
 * Se renderiza desde el layout raíz, pero se desactiva a sí mismo en
 * /panel-empresa y /admin porque esas secciones ya tienen su propio
 * header (con su propia navegación y su botón de Salir) — evita tener
 * dos headers apilados.
 */
export function HeaderPublico() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<PayloadToken | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const datos = decodificarToken(token);
    if (datos && !tokenExpirado(datos)) setPayload(datos);
  }, [pathname]);

  // Se desactiva en el panel de cooperativa y el panel de admin
  // (tienen su propio header con su propia navegación) -- y en la
  // portada (16-ago-2026, hallazgo real del director: el Hero de la
  // Fase 2 ya trae su propio encabezado con el logo real superpuesto
  // sobre la foto, más "Iniciar sesión" -- tenerlos los dos duplicaba
  // el nombre "Columbus" y el botón de sesión en la misma pantalla).
  if (pathname.startsWith("/panel-empresa") || pathname.startsWith("/admin") || pathname === "/") {
    return null;
  }

  function salir() {
    borrarToken();
    setPayload(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-brand-dark">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center">
          <Image src="/img/logo-columbus.png" alt="Columbus" width={110} height={28} priority />
        </Link>

        {payload ? (
          <nav aria-label="Cuenta" className="flex items-center gap-3">
            {payload.rol === "pasajero" ? (
              <Link
                href="/perfil"
                className="text-sm font-semibold text-white/70 transition hover:text-white"
              >
                Mi cuenta
              </Link>
            ) : (
              <Link
                href={RUTA_POR_ROL[payload.rol]}
                className="text-sm font-semibold text-white/70 transition hover:text-white"
              >
                Ir a mi panel
              </Link>
            )}
            <button
              onClick={salir}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:bg-white/10"
            >
              Salir
            </button>
          </nav>
        ) : (
          <nav aria-label="Cuenta" className="flex items-center gap-3">
            <Link
              href="/ingresar"
              className="text-sm font-semibold text-white/70 transition hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-brand-amber px-3 py-1.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-amber/85"
            >
              Registrarse
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
