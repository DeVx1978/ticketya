"use client";

import { useEffect, useRef, useState } from "react";
import { listarBannersActivos, type BannerPropio } from "@/lib/api";

/**
 * Espacio publicitario real -- rediseño 21-ago-2026, orden explícita
 * del director ("no sobrecargar la landing"): en vez de agregar un
 * espacio nuevo, se mejora el único que ya existía -- reposicionado
 * justo debajo del buscador (antes casi al final de la página, poco
 * visible), y con autoplay real cada 5 segundos (antes solo scroll
 * manual).
 *
 * Un banner ANCHO a la vez, no una fila de miniaturas -- mismo
 * criterio de "espacio publicitario de verdad" que plataformas de
 * referencia. Reutiliza la misma técnica real de scroll infinito ya
 * probada en DestinosPopulares (contenido duplicado al final +
 * corrección instantánea de posición al cruzar el punto de unión) --
 * el mismo principio que usan Embla/Swiper por dentro, sin agregar
 * ninguna dependencia nueva.
 *
 * Si no hay ningún banner activo, no se renderiza nada -- nunca deja
 * un espacio vacío feo.
 */
function FlechaCarrusel({
  direccion,
  onClick,
}: {
  direccion: "izquierda" | "derecha";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === "izquierda" ? "Anuncio anterior" : "Siguiente anuncio"}
      className="absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-dark shadow-md ring-1 ring-black/5 transition hover:bg-brand-light sm:flex"
      style={direccion === "izquierda" ? { left: "-14px" } : { right: "-14px" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        {direccion === "izquierda" ? <path d="M15 19l-7-7 7-7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

export function FranjaBanners() {
  const [banners, setBanners] = useState<BannerPropio[]>([]);
  const carruselRef = useRef<HTMLDivElement>(null);
  const inicioClonRef = useRef<HTMLAnchorElement>(null);
  const anchoVueltaRef = useRef(0);
  const [enPausa, setEnPausa] = useState(false);

  useEffect(() => {
    listarBannersActivos()
      .then(setBanners)
      .catch(() => {
        /* si falla, simplemente no se muestra la franja -- no es contenido crítico */
      });
  }, []);

  useEffect(() => {
    if (inicioClonRef.current) {
      anchoVueltaRef.current = inicioClonRef.current.offsetLeft;
    }
  }, [banners]);

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

  function avanzar() {
    const el = carruselRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
  }

  function retroceder() {
    const el = carruselRef.current;
    if (!el) return;
    el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
  }

  // Autoplay real cada 5s -- se pausa mientras el mouse está encima,
  // para no interrumpir a alguien que lo está mirando o a punto de
  // hacerle clic.
  useEffect(() => {
    if (banners.length < 2 || enPausa) return;
    const id = setInterval(avanzar, 5000);
    return () => clearInterval(id);
  }, [banners.length, enPausa]);

  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 pt-10 sm:px-8">
      <div
        className="relative"
        onMouseEnter={() => setEnPausa(true)}
        onMouseLeave={() => setEnPausa(false)}
      >
        {banners.length > 1 && (
          <>
            <FlechaCarrusel direccion="izquierda" onClick={retroceder} />
            <FlechaCarrusel direccion="derecha" onClick={avanzar} />
          </>
        )}
        <div
          ref={carruselRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {banners.map((b) => (
            <a
              key={b.id}
              href={b.enlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full shrink-0 snap-start items-center justify-center overflow-hidden rounded-2xl bg-brand-light shadow-sm ring-1 ring-black/5 transition hover:opacity-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
              <img
                src={b.imagenUrl}
                alt={b.titulo}
                className="h-20 w-full object-contain sm:h-24"
              />
            </a>
          ))}
          {banners.length > 1 &&
            banners.map((b, indice) => (
              <a
                key={`clon-${b.id}`}
                ref={indice === 0 ? inicioClonRef : undefined}
                href={b.enlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full shrink-0 snap-start items-center justify-center overflow-hidden rounded-2xl bg-brand-light shadow-sm ring-1 ring-black/5 transition hover:opacity-95"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
                <img
                  src={b.imagenUrl}
                  alt={b.titulo}
                  className="h-20 w-full object-contain sm:h-24"
                />
              </a>
            ))}
        </div>
      </div>
    </section>
  );
}
