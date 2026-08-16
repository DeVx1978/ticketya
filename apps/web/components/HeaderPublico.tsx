"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold text-brand-dark">
          Columbus
        </Link>

        {payload ? (
          <nav aria-label="Cuenta" className="flex items-center gap-3">
            {payload.rol === "pasajero" ? (
              <Link
                href="/perfil"
                className="text-sm font-semibold text-brand-dark/70 transition hover:text-brand-dark"
              >
                Mi cuenta
              </Link>
            ) : (
              <Link
                href={RUTA_POR_ROL[payload.rol]}
                className="text-sm font-semibold text-brand-dark/70 transition hover:text-brand-dark"
              >
                Ir a mi panel
              </Link>
            )}
            <button
              onClick={salir}
              className="rounded-lg border border-brand-light px-3 py-1.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
            >
              Salir
            </button>
          </nav>
        ) : (
          <nav aria-label="Cuenta" className="flex items-center gap-3">
            <Link
              href="/ingresar"
              className="text-sm font-semibold text-brand-dark/70 transition hover:text-brand-dark"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Registrarse
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
