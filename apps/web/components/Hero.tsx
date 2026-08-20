"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BuscadorForm } from "./BuscadorForm";
import { obtenerToken, decodificarToken, tokenExpirado, type PayloadToken } from "@/lib/auth";

// Mismo mapeo real que ya usa HeaderPublico -- corrige un bug real
// del director (18-ago-2026): el arreglo anterior mandaba a "Mi
// cuenta" siempre a /perfil, sin importar el rol, y eso enviaba a un
// super_admin al perfil de pasajero en vez de a /admin.
const RUTA_POR_ROL: Record<PayloadToken["rol"], string> = {
  admin_plataforma: "/admin",
  super_admin: "/admin",
  admin_cooperativa: "/panel-empresa",
  vendedor: "/panel-empresa",
  pasajero: "/perfil",
};

/**
 * Hero real de la portada -- Fase 2 de la sesión de frontend
 * (16-ago-2026). Reemplaza el gradiente negro/amarillo original --
 * hallazgo real del director: "no me gusta ese fondo negro es como
 * fúnebre".
 *
 * Rediseño real (17-ago-2026) -- orden explícita del director: ajuste
 * de tamaño (foto casi de pantalla completa, evita el recorte
 * agresivo de un contenedor bajo), la barra de búsqueda con un diseño
 * compacto en una sola fila, y los textos bien ubicados -- todo
 * superpuesto sobre la foto, en cualquier tamaño de pantalla, incluido
 * celular.
 */
const FOTOS = ["/img/hero-1.jpg", "/img/hero-2.jpg"];

export function Hero() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Bug real encontrado por el director (17-ago-2026): el Hero nunca
  // revisaba la sesion -- mostraba "Iniciar sesion" fijo incluso ya
  // conectado. Mismo patron real que ya usa HeaderPublico.
  const [payload, setPayload] = useState<PayloadToken | null>(null);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    const datos = decodificarToken(token);
    if (datos && !tokenExpirado(datos)) setPayload(datos);
  }, []);

  useEffect(() => {
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 5000);
    return () => clearInterval(temporizador);
  }, []);

  return (
    <section className="relative h-[100svh] min-h-[560px] max-h-[900px] overflow-hidden">
      {FOTOS.map((foto, i) => (
        <div
          key={foto}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === indiceActivo ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== indiceActivo}
        >
          <Image
            src={foto}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          {/* Degradado real, para que el texto blanco y la barra de
              búsqueda se lean bien sobre la foto -- más oscuro abajo
              (donde vive el contenido) y arriba (donde vive el
              encabezado), más claro en el medio para que la foto
              respire. */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/10 to-brand-dark/80" />
        </div>
      ))}

      {/* Indicadores del slider -- confirman que hay más de una foto,
          sin depender de flechas de navegación manual. */}
      <div className="absolute right-[5%] top-8 z-10 flex gap-1.5">
        {FOTOS.map((foto, i) => (
          <span
            key={foto}
            className={`h-[3px] w-6 rounded-full transition-colors ${
              i === indiceActivo ? "bg-brand-amber" : "bg-white/35"
            }`}
          />
        ))}
      </div>

      <header className="absolute left-0 right-0 top-6 z-20 flex items-center justify-between px-[5%]">
        <Image src="/img/logo-columbus.png" alt="Columbus" width={120} height={31} priority />
        <nav className="hidden items-center gap-8 sm:flex">
          <a href="#" className="text-sm text-white/85 hover:text-white">
            Rutas
          </a>
          <a href="#" className="text-sm text-white/85 hover:text-white">
            Cooperativas
          </a>
          <a href="#" className="text-sm text-white/85 hover:text-white">
            Ayuda
          </a>
          <a
            href={payload ? RUTA_POR_ROL[payload.rol] : "/ingresar"}
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark"
          >
            {payload ? "Mi cuenta" : "Iniciar sesión"}
          </a>
        </nav>

        {/* Hallazgo real del director (17-ago-2026): en celular el
            menú completo estaba oculto SIN ningún reemplazo -- no
            existía ninguna forma de llegar a "Iniciar sesión" desde
            la portada en un teléfono real. Botón de hamburguesa,
            visible solo en celular. */}
        <button
          type="button"
          onClick={() => setMenuAbierto((a) => !a)}
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white sm:hidden"
        >
          {menuAbierto ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>

      {menuAbierto && (
        <nav className="absolute left-0 right-0 top-[76px] z-20 mx-[5%] flex flex-col gap-1 rounded-xl bg-brand-dark/95 p-4 backdrop-blur-sm sm:hidden">
          <a href="#" className="rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            Rutas
          </a>
          <a href="#" className="rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            Cooperativas
          </a>
          <a href="#" className="rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            Ayuda
          </a>
          <a
            href={payload ? RUTA_POR_ROL[payload.rol] : "/ingresar"}
            className="mt-1 rounded-lg bg-brand-amber px-3 py-2 text-center text-sm font-semibold text-brand-dark"
          >
            {payload ? "Mi cuenta" : "Iniciar sesión"}
          </a>
        </nav>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-[5%] pb-6 md:pb-10">
        <h1 className="font-display max-w-xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
          Tu pasaje de bus, <span className="text-brand-amber">sin filas ni papeleo</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/80 md:text-base">
          Compara horarios y precios de todas las cooperativas de una ruta, elige tu asiento, y recibe
          tu boleto digital con QR al instante.
        </p>

        <div className="mt-5 max-w-screen-2xl md:mt-7">
          <BuscadorForm />
        </div>
      </div>
    </section>
  );
}
