"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { obtenerContactoSoporte, type ContactoSoporte } from "@/lib/api";

/**
 * Pie de página -- rediseño real (20-ago-2026), investigación
 * comparativa (Expedia, HubSpot, guía de confianza turismo 2026):
 * faltaba contacto de soporte visible (el dato ya existía, solo en
 * el PDF del boleto) y páginas legales. 3 columnas simples, sin
 * sobrecargar -- decisión explícita del director de mantenerlo
 * "completo pero profesional", no un mapa de sitio gigante.
 *
 * Se desactiva a sí mismo en las mismas rutas que HeaderPublico
 * (/panel-empresa, /admin), y dentro del flujo de compra -- mismo
 * criterio real ya documentado (sección 3.9).
 */
export function Footer() {
  const pathname = usePathname();
  const [contacto, setContacto] = useState<ContactoSoporte>({ correo: null, telefono: null });

  useEffect(() => {
    obtenerContactoSoporte().then(setContacto);
  }, []);

  if (
    pathname.startsWith("/panel-empresa") ||
    pathname.startsWith("/admin") ||
    /^\/viajes\/[^/]+\/(asientos|checkout)/.test(pathname)
  ) {
    return null;
  }

  return (
    <footer className="border-t border-black/5 bg-brand-dark px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Image src="/img/logo-columbus.png" alt="Columbus" width={100} height={26} />
          <p className="mt-3 text-xs text-white/50">
            Compara y compra tu boleto de bus en Ecuador, de forma simple y segura.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Compañía</h3>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li>
              <a href="/anunciar" className="hover:text-white">
                Anuncia con nosotros
              </a>
            </li>
            <li>
              <a href="/ingresar" className="hover:text-white">
                Iniciar sesión
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Legal</h3>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li>
              <a href="/terminos" className="hover:text-white">
                Términos de Servicio
              </a>
            </li>
            <li>
              <a href="/privacidad" className="hover:text-white">
                Política de Privacidad
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Ayuda</h3>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            {contacto.correo && (
              <li>
                <a href={`mailto:${contacto.correo}`} className="hover:text-white">
                  {contacto.correo}
                </a>
              </li>
            )}
            {contacto.telefono && (
              <li>
                <a href={`tel:${contacto.telefono}`} className="hover:text-white">
                  {contacto.telefono}
                </a>
              </li>
            )}
            {!contacto.correo && !contacto.telefono && (
              <li className="text-white/30">Próximamente</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-screen-2xl border-t border-white/10 pt-6 text-center text-xs text-white/40">
        © Columbus {new Date().getFullYear()}
      </div>
    </footer>
  );
}
