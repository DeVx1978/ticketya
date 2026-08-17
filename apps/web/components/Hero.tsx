"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BuscadorForm } from "./BuscadorForm";

/**
 * Hero real de la portada -- Fase 2 de la sesión de frontend
 * (16-ago-2026). Reemplaza el gradiente negro/amarillo original
 * (`bg-gradient-to-br from-brand-dark via-brand to-brand-medium`) --
 * hallazgo real del director en la sesión de exploración de diseño
 * (documentada en DOCUMENTO_MAESTRO.md sección 5.8): "no me gusta ese
 * fondo negro es como fúnebre".
 *
 * Slider de 2 fotos reales del bus (proporcionadas por el director),
 * casi pantalla completa en PC, con el logo real superpuesto -- funciona
 * porque ambas fotos son oscuras (confirmado en la sesión de
 * exploración, no una suposición). Cambia sola cada 5 segundos.
 */
const FOTOS = ["/img/hero-1.jpg", "/img/hero-2.jpg"];

export function Hero() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 5000);
    return () => clearInterval(temporizador);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Orden real del director (17-ago-2026): "para qué tener
          imágenes profesionales ahí si van a ser tapadas por esa
          tarjeta" -- la superposición se quita por completo, en
          cualquier tamaño de pantalla, no solo en celular. La foto
          se ve completa arriba, el contenido (título, texto,
          buscador) va en flujo normal debajo, siempre -- más alta en
          pantalla grande, donde hay más espacio real disponible. */}
      <div className="relative h-[46vh] min-h-[320px] md:h-[62vh] md:min-h-[480px]">
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
            {/* Degradado real, solo para que el logo/menú del
                encabezado (que sí siguen superpuestos arriba de la
                foto) se lean bien -- ya no hay título/texto/buscador
                superpuesto más abajo, así que el degradado se
                concentra arriba, no en toda la foto. */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-dark/60 to-transparent" />
          </div>
        ))}
      </div>

      {/* Indicadores del slider -- confirman que hay más de una foto,
          sin depender de flechas de navegación manual. */}
      <div className="absolute right-[5%] top-10 z-10 flex gap-1.5">
        {FOTOS.map((foto, i) => (
          <span
            key={foto}
            className={`h-[3px] w-6 rounded-full transition-colors ${
              i === indiceActivo ? "bg-brand-amber" : "bg-white/35"
            }`}
          />
        ))}
      </div>

      <header className="absolute left-0 right-0 top-10 z-20 flex items-center justify-between px-[5%]">
        <Image src="/img/logo-columbus.png" alt="Columbus" width={130} height={34} priority />
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
            href="/ingresar"
            className="rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-brand-dark"
          >
            Iniciar sesión
          </a>
        </nav>

        {/* Hallazgo real del director (17-ago-2026), con evidencia
            real: en celular (menor a 640px) el menú completo estaba
            oculto (`hidden sm:flex`) SIN ningún reemplazo -- no
            existía ninguna forma de llegar a "Iniciar sesión" desde
            la portada en un teléfono real. Botón de hamburguesa,
            visible solo en celular, con el mismo menú real dentro. */}
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
        <nav className="absolute left-0 right-0 top-[88px] z-20 mx-[5%] flex flex-col gap-1 rounded-xl bg-brand-dark/95 p-4 backdrop-blur-sm sm:hidden">
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
            href="/ingresar"
            className="mt-1 rounded-lg bg-brand-amber px-3 py-2 text-center text-sm font-semibold text-brand-dark"
          >
            Iniciar sesión
          </a>
        </nav>
      )}

      <div className="relative z-10 bg-white px-[5%] py-8 md:py-10">
        <h1 className="font-display max-w-xl text-3xl font-bold leading-tight text-brand-dark md:text-4xl lg:text-5xl">
          Tu pasaje de bus, sin filas ni papeleo
        </h1>
        <p className="mt-3 max-w-md text-base text-brand-dark/70">
          Compara horarios y precios de todas las cooperativas de una ruta, elige tu asiento, y recibe
          tu boleto digital con QR al instante.
        </p>
        <div className="mt-6 max-w-4xl md:mt-8">
          <BuscadorForm />
        </div>
      </div>
    </section>
  );
}
