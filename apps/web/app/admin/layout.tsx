"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { obtenerToken, borrarToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";

/* Rediseño real del panel de admin (25-ago-2026), orden explícita del
   director: copiar lo más fiel posible el patrón de TailAdmin (demo
   real: https://demo.tailadmin.com/saas) -- sidebar lateral con
   ícono por enlace, tarjetas de métrica con insignia de color,
   cabecera simple. Con 2 condiciones reales del director, no
   negociables:
   1. Logo real de Columbus (`/img/logo-columbus.png`, el mismo que ya
      usa el header público) -- no un ícono genérico ni texto solo.
   2. Colores de MARCA reales, no los de TailAdmin: `brand-cobalto`
      (azul, #2451c4) como color principal en vez de negro, y
      `brand-amber` para la acción principal -- mismo patrón que ya
      usa el resto del sitio. El negro/casi-negro (`brand-dark`,
      `brand`) ya se identificó como problema en otra sesión.

   Hallazgo real en el camino: `/panel-empresa/layout.tsx` (la
   referencia de diseño que dio el director) todavía usa
   `bg-brand-dark` para el ítem activo de su propio menú lateral --
   parece ser una instancia que no se corrigió cuando se resolvió ese
   problema en otras pantallas. Este panel nuevo sigue la instrucción
   explícita (cobalto, no negro), no esa inconsistencia puntual. */

const ENLACES = [
  { href: "/admin", etiqueta: "Panel", icono: IconoPanel },
  { href: "/admin/cooperativas", etiqueta: "Cooperativas", icono: IconoCooperativas },
  { href: "/admin/puntos-operacion", etiqueta: "Puntos de operación", icono: IconoPuntos },
  { href: "/admin/banners", etiqueta: "Banners", icono: IconoBanners },
  { href: "/admin/comercial", etiqueta: "Comercial", icono: IconoComercial },
  { href: "/admin/liquidaciones", etiqueta: "Liquidaciones", icono: IconoLiquidaciones },
  { href: "/admin/administradores", etiqueta: "Administradores", icono: IconoAdministradores },
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
function IconoCooperativas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}
function IconoPuntos({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
function IconoBanners({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M3 9h18M8 21h8" />
    </svg>
  );
}
function IconoComercial({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}
function IconoLiquidaciones({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconoAdministradores({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l8 3.5v5.2c0 5-3.4 8.6-8 10.3-4.6-1.7-8-5.3-8-10.3V5.5L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/**
 * Mismo patrón que app/panel-empresa/layout.tsx — protección de
 * interfaz, no de seguridad real (esa está en el backend). Ver el
 * comentario completo allá.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [verificando, setVerificando] = useState(true);
  const [payload, setPayload] = useState<PayloadToken | null>(null);
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
    // 04-ago-2026, ítem 9 -- hallazgo real: este guardia solo dejaba
    // pasar admin_plataforma, bloqueando a super_admin por completo
    // (aunque el backend sí lo permite). Corregido.
    if (datos.rol !== "admin_plataforma" && datos.rol !== "super_admin") {
      router.replace("/");
      return;
    }
    // Guardia de autenticación al montar — mismo patrón que
    // panel-empresa/layout.tsx, ver el comentario completo allá.
    setPayload(datos);
    setVerificando(false);
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

  const paginaActual = ENLACES.find((e) => e.href === pathname)?.etiqueta ?? "Panel";

  return (
    <div className="flex min-h-full flex-1 bg-brand-light/20">
      {/* Sidebar -- escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-white lg:flex">
        {/* Bug real encontrado al verificar con captura (25-ago-2026):
            `logo-columbus.png` tiene el texto "Columbus" en blanco --
            diseñado para fondos oscuros (así se usa en todo el resto
            del sitio: Hero, header público, etc.). Sobre el fondo
            blanco del sidebar, el texto quedaba invisible, solo se
            veía el ícono. No se crea un logo nuevo (sería inventar un
            asset de marca) -- se le da al área del logo un fondo
            cobalto, coherente con la instrucción real del director de
            usar cobalto como color principal del panel. */}
        <div className="flex h-16 items-center gap-2 bg-brand-cobalto px-6">
          <Image src="/img/logo-columbus.png" alt="Columbus" width={110} height={28} priority />
        </div>
        <div className="px-4 pt-4">
          <span className="rounded-full bg-brand-cobalto-claro px-2.5 py-1 text-xs font-bold text-brand-cobalto">
            Panel Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {ENLACES.map((enlace) => {
            const activo = pathname === enlace.href;
            const Icono = enlace.icono;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  activo
                    ? "bg-brand-cobalto text-white"
                    : "text-brand-dark/60 hover:bg-brand-cobalto-claro hover:text-brand-cobalto"
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
            {payload?.rol === "super_admin" ? "Super admin" : "Administrador"}
          </p>
          <button
            onClick={salir}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark/60 transition hover:bg-brand-light hover:text-brand-dark"
          >
            Salir
          </button>
        </div>
      </aside>

      {/* Menú móvil -- se despliega desde el encabezado */}
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuMovilAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between bg-brand-cobalto px-4 py-4">
              <Image src="/img/logo-columbus.png" alt="Columbus" width={100} height={26} />
              <button
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1 p-4">
              {ENLACES.map((enlace) => {
                const activo = pathname === enlace.href;
                const Icono = enlace.icono;
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      activo ? "bg-brand-cobalto text-white" : "text-brand-dark/60"
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
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
