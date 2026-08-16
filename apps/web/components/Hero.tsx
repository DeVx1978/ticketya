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

  useEffect(() => {
    const temporizador = setInterval(() => {
      setIndiceActivo((i) => (i + 1) % FOTOS.length);
    }, 5000);
    return () => clearInterval(temporizador);
  }, []);

  return (
    <section className="relative h-[92vh] min-h-[620px] overflow-hidden">
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
          {/* Degradado real para que el texto blanco y el logo se lean
              bien encima de cualquier parte de la foto -- más oscuro
              abajo, donde vive el buscador. */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/55 via-brand-dark/25 to-brand-dark/75" />
        </div>
      ))}

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

      <header className="absolute left-0 right-0 top-10 z-10 flex items-center justify-between px-[5%]">
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
      </header>

      <div className="relative z-10 flex h-full flex-col justify-end px-[5%] pb-16">
        <h1 className="font-display max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">
          Tu pasaje de bus, sin filas ni papeleo
        </h1>
        <p className="mt-3 max-w-md text-base text-white/85">
          Compara horarios y precios de todas las cooperativas de una ruta, elige tu asiento, y recibe
          tu boleto digital con QR al instante.
        </p>
        <div className="mt-8 max-w-3xl">
          <BuscadorForm />
        </div>
      </div>
    </section>
  );
}
