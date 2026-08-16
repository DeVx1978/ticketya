"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

/**
 * Pie de página -- hallazgo real de la Fase 3 (16-ago-2026): no
 * existía ningún componente de footer en el proyecto. Necesario para
 * que /anunciar (captación de leads de publicidad) sea descubrible,
 * no solo una URL escondida.
 *
 * Se desactiva a sí mismo en las mismas rutas que HeaderPublico
 * (/panel-empresa, /admin -- tienen su propio layout completo), y
 * también dentro del flujo de compra (/viajes/.../asientos,
 * /viajes/.../checkout) -- mismo principio ya documentado en
 * DOCUMENTO_MAESTRO.md sección 3.9: "ningún espacio publicitario vive
 * dentro del flujo de compra, solo en la landing pública". Este
 * footer no es un anuncio en sí, pero enlaza a "Anuncia con
 * nosotros" -- no pertenece ahí en medio de una compra.
 */
export function Footer() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/panel-empresa") ||
    pathname.startsWith("/admin") ||
    /^\/viajes\/[^/]+\/(asientos|checkout)/.test(pathname)
  ) {
    return null;
  }

  return (
    <footer className="border-t border-black/5 bg-brand-dark px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Image src="/img/logo-columbus.png" alt="Columbus" width={100} height={26} />
        <div className="flex items-center gap-6 text-xs text-white/60">
          <a href="/anunciar" className="hover:text-white">
            Anuncia con nosotros
          </a>
          <a href="/ingresar" className="hover:text-white">
            Iniciar sesión
          </a>
        </div>
        <span className="text-xs text-white/40">© Columbus {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
