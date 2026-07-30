"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado } from "@/lib/auth";

const ENLACES = [
  { href: "/admin", etiqueta: "Panel" },
  { href: "/admin/cooperativas", etiqueta: "Cooperativas" },
  { href: "/admin/puntos-operacion", etiqueta: "Puntos de operación" },
  { href: "/admin/banners", etiqueta: "Banners" },
  { href: "/admin/liquidaciones", etiqueta: "Liquidaciones" },
];

/**
 * Mismo patrón que app/panel-empresa/layout.tsx — protección de
 * interfaz, no de seguridad real (esa está en el backend). Ver el
 * comentario completo allá.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    if (datos.rol !== "admin_plataforma") {
      router.replace("/");
      return;
    }
    // Guardia de autenticación al montar — mismo patrón que
    // panel-empresa/layout.tsx, ver el comentario completo allá.
    setVerificando(false);
  }, [router, pathname]);

  function salir() {
    borrarToken();
    router.replace("/ingresar");
  }

  if (verificando) {
    return (
      <div className="flex flex-1 items-center justify-center bg-brand-dark/5">
        <p className="text-sm text-brand-dark/50">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-dark/[0.03]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-brand-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <span className="font-display text-lg font-extrabold text-white">
              Ticket<span className="text-brand-amber">Ya</span>
              <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
                Panel Admin
              </span>
            </span>
            <nav className="hidden gap-1 md:flex">
              {ENLACES.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    pathname === enlace.href
                      ? "bg-white text-brand-dark"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  {enlace.etiqueta}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={salir}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Salir
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                pathname === enlace.href ? "bg-white text-brand-dark" : "text-white/70"
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
