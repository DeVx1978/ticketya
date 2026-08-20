"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { PublicidadNativa } from "./PublicidadNativa";

/**
 * Destinos turísticos populares -- fotos reales proporcionadas por el
 * director (16-ago-2026), reemplazan las 4 ilustraciones dibujadas de
 * la Fase 1/2 (Mindo y Galápagos salen -- no son parte de la
 * cobertura real de rutas de Columbus). 8 ciudades/destinos reales:
 * las 6 ciudades donde ya opera o planea operar Columbus (Ibarra,
 * Machala, Esmeraldas, Guayaquil, Quito) más 2 destinos turísticos
 * de playa (Salinas, Montañita, Baños).
 *
 * Rediseño real (20-ago-2026) -- orden explícita del director,
 * referencia real compartida (tarjetas de oferta de EaseMyTrip):
 * insignia de marca superpuesta en la foto, nombre superpuesto con
 * degradado, y una descripción corta debajo, en un CARRUSEL horizontal
 * con flechas de navegación -- igual formato que la referencia, para
 * poder agregar más destinos después sin tener que recalcular
 * columnas de un grid. Reutiliza el mismo patrón real de scroll
 * horizontal que ya existe en FranjaBanners.tsx (overflow-x-auto,
 * sin librería externa) -- se le agrega scroll-snap y botones de
 * flecha, que FranjaBanners no tenía.
 *
 * La descripción de cada ciudad es un borrador genérico investigado
 * con fuentes reales (Goraymi, Wikipedia, ministerios de turismo,
 * guías turísticas) -- pendiente de que el director confirme o
 * reemplace cada una por su propio texto; no son definitivas.
 *
 * Fase 3 (16-ago-2026) -- la publicidad nativa se mezcla aquí mismo,
 * después de la 4ª tarjeta (nunca primera, mismo criterio real de
 * cualquier feed de contenido patrocinado) -- decisión explícita del
 * director. Si no hay ninguna campaña activa, PublicidadNativa no
 * renderiza nada, así que el carrusel no queda con un hueco.
 */
const DESTINOS = [
  {
    nombre: "Quito",
    foto: "/img/destinos/quito.jpg",
    descripcion: "Capital histórica declarada Patrimonio Cultural de la Humanidad por la UNESCO.",
  },
  {
    nombre: "Guayaquil",
    foto: "/img/destinos/guayaquil.jpg",
    descripcion: "La \"Perla del Pacífico\" -- principal puerto y capital económica del país.",
  },
  {
    nombre: "Ibarra",
    foto: "/img/destinos/ibarra.jpg",
    descripcion: "La \"Ciudad Blanca\", famosa por su arquitectura colonial y su clima veraniego.",
  },
  {
    nombre: "Machala",
    foto: "/img/destinos/machala.jpg",
    descripcion: "Conocida como la Capital Bananera del Mundo, en la costa sur del país.",
  },
  {
    nombre: "Esmeraldas",
    foto: "/img/destinos/esmeraldas.jpg",
    descripcion: "La \"Provincia Verde\" -- playas, manglares y cultura afroecuatoriana.",
  },
  {
    nombre: "Baños de Agua Santa",
    foto: "/img/destinos/banos.jpg",
    descripcion: "La capital de la aventura de Ecuador, entre cascadas y el volcán Tungurahua.",
  },
  {
    nombre: "Montañita",
    foto: "/img/destinos/montanita.jpg",
    descripcion: "El destino de surf más popular del país, con un ambiente bohemio único.",
  },
  {
    nombre: "Salinas",
    foto: "/img/destinos/salinas.jpg",
    descripcion: "El balneario más importante de Ecuador, con 15 km de playa y sol todo el año.",
  },
];

/** Insignia real de Columbus para cada tarjeta -- mismo criterio ya
 * usado en el resto del sitio (SVG/PNG propio, nunca un emoji ni un
 * ícono genérico de banco de imágenes). Ícono recortado del logo real
 * (`logo-columbus.png`), sin el texto, para que quepa a escala como
 * insignia pequeña -- el wordmark completo es demasiado ancho para
 * este tamaño de chip. Posición medida con precisión de la referencia
 * real (20-ago-2026): esquina superior derecha de la foto, chip
 * blanco redondeado. */
function InsigniaColumbus() {
  return (
    <div className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-black/5">
      <Image src="/img/icono-columbus.png" alt="Columbus" width={18} height={22} className="h-4 w-auto" />
    </div>
  );
}

interface TarjetaDestinoProps {
  nombre: string;
  foto: string;
  descripcion: string;
}

/**
 * Proporciones medidas con precisión real de la referencia (captura
 * de easymytrip.com, 20-ago-2026): tarjeta 385x278px reales, foto
 * ocupa el 64% superior de la altura (178/278), contenido blanco el
 * 36% inferior (100/278) -- relación ancho:alto total ≈1.38:1. El
 * `aspect-[385/178]` en la foto mantiene esa proporción exacta.
 *
 * Ancho fijo real `w-[300px]` -- valor elegido a propósito (20-ago-2026,
 * 2º ajuste, tras verificación del director): con `w-80` (320px) las
 * 3 tarjetas + espacios coincidían EXACTO con el ancho del
 * contenedor (992px = 3×320 + 2×16), dejando cero espacio para ver
 * un pedacito de la siguiente tarjeta -- lo que sí se ve en la
 * referencia real, a ambos lados. `300px` no es divisor exacto de
 * ningún ancho de contenedor típico, así que siempre sobra espacio
 * real para el "peek" de la tarjeta siguiente, sin importar el
 * viewport.
 */
function TarjetaDestino({ nombre, foto, descripcion }: TarjetaDestinoProps) {
  return (
    <div className="w-[300px] shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[385/178] w-full">
        <Image src={foto} alt={nombre} fill sizes="300px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/10 to-transparent" />
        <InsigniaColumbus />
        <p className="absolute bottom-2 left-3 right-3 text-base font-bold leading-tight text-white sm:text-lg">
          {nombre}
        </p>
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="text-xs leading-snug text-brand-dark/60 sm:text-sm">{descripcion}</p>
      </div>
    </div>
  );
}

/** Flecha de navegación del carrusel -- mismo criterio real de ícono
 * SVG propio del proyecto (nunca un ícono de librería externa nueva
 * solo para esto). Oculta en móvil (`hidden sm:flex`), donde el
 * swipe con el dedo ya es el patrón natural -- igual criterio que
 * cualquier carrusel real (Booking, Airbnb: las flechas son un
 * refuerzo para mouse/trackpad, no el único método de navegación). */
function FlechaCarrusel({ direccion, onClick }: { direccion: "izquierda" | "derecha"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === "izquierda" ? "Destinos anteriores" : "Más destinos"}
      className="absolute top-[36%] z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-dark shadow-md ring-1 ring-black/5 transition hover:bg-brand-light sm:flex"
      style={direccion === "izquierda" ? { left: "-14px" } : { right: "-14px" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        {direccion === "izquierda" ? <path d="M15 19l-7-7 7-7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

export function DestinosPopulares() {
  const carruselRef = useRef<HTMLDivElement>(null);
  const inicioClonRef = useRef<HTMLDivElement>(null);
  const anchoVueltaRef = useRef(0);
  const ANCHO_TARJETA = 300;
  const ESPACIO = 16; // gap-4
  const PASO = ANCHO_TARJETA + ESPACIO;

  /**
   * Carrusel continuo real (20-ago-2026, 3er ajuste, tras dos rondas
   * de corrección del director): el intento anterior ("saltar al
   * inicio con scrollTo" al llegar al final) se sentía como que el
   * carrusel se devolvía -- un salto visible y brusco, justo lo que
   * el director señaló como desordenado. Un carrusel infinito real no
   * "vuelve" -- sigue avanzando siempre hacia adelante.
   *
   * Técnica real (el mismo truco que usan Swiper/Embla por dentro):
   * la secuencia de destinos se duplica una vez más al final (sin
   * duplicar el anuncio, para no inflar impresiones/clics reales).
   * Cuando el scroll cruza el punto exacto donde empieza esa copia
   * (medido con `inicioClonRef.current.offsetLeft`, no un número fijo
   * -- así sigue siendo correcto si cambia la cantidad de destinos),
   * se resta ese mismo ancho al `scrollLeft` de forma INSTANTÁNEA (sin
   * `behavior: smooth`) -- como el contenido clonado es idéntico
   * pixel por pixel al original en ese punto, el ojo no percibe
   * ningún salto: se ve como si el carrusel jamás terminara.
   *
   * El desplazamiento por clic también cambió: antes movía un bloque
   * completo (85% del ancho visible, "de a 3"). Ahora mueve
   * exactamente el ancho de UNA tarjeta + el espacio entre tarjetas
   * (`PASO`) -- de a una, como pidió el director, igual que la
   * referencia real.
   */
  useEffect(() => {
    if (inicioClonRef.current) {
      anchoVueltaRef.current = inicioClonRef.current.offsetLeft;
    }
  }, []);

  useEffect(() => {
    const el = carruselRef.current;
    if (!el) return;
    function alHacerScroll() {
      const contenedor = carruselRef.current;
      const anchoVuelta = anchoVueltaRef.current;
      if (!contenedor || !anchoVuelta) return;
      if (contenedor.scrollLeft >= anchoVuelta) {
        contenedor.scrollLeft -= anchoVuelta;
      }
    }
    el.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => el.removeEventListener("scroll", alHacerScroll);
  }, []);

  function desplazar(direccion: "izquierda" | "derecha") {
    const el = carruselRef.current;
    if (!el) return;
    el.scrollBy({ left: direccion === "izquierda" ? -PASO : PASO, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-8 lg:px-12">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-cobalto">
        Destinos populares
      </h2>
      <div className="relative">
        <FlechaCarrusel direccion="izquierda" onClick={() => desplazar("izquierda")} />
        <div
          ref={carruselRef}
          className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {DESTINOS.slice(0, 4).map((destino) => (
            <TarjetaDestino key={destino.nombre} {...destino} />
          ))}

          <PublicidadNativa />

          {DESTINOS.slice(4).map((destino) => (
            <TarjetaDestino key={destino.nombre} {...destino} />
          ))}

          {/* Copia real de la secuencia completa, para el salto
             imperceptible del carrusel continuo -- ver comentario
             de `desplazar`/`alHacerScroll` arriba. `inicioClonRef`
             marca dónde empieza esta copia (primer elemento). */}
          {DESTINOS.map((destino, i) => (
            <div key={`${destino.nombre}-clon`} ref={i === 0 ? inicioClonRef : undefined}>
              <TarjetaDestino {...destino} />
            </div>
          ))}
        </div>
        <FlechaCarrusel direccion="derecha" onClick={() => desplazar("derecha")} />
      </div>
    </section>
  );
}
