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
 * insignia de marca superpuesta en la unión foto/contenido, más una
 * descripción corta debajo del nombre. La descripción de cada ciudad
 * es un borrador genérico investigado con fuentes reales (Goraymi,
 * Wikipedia, ministerios de turismo, guías turísticas) -- pendiente
 * de que el director confirme o reemplace cada una por su propio
 * texto; no son definitivas.
 *
 * Fase 3 (16-ago-2026) -- la publicidad nativa se mezcla aquí mismo,
 * después de la 4ª tarjeta (nunca primera, mismo criterio real de
 * cualquier feed de contenido patrocinado) -- decisión explícita del
 * director. Si no hay ninguna campaña activa, PublicidadNativa no
 * renderiza nada, así que el grid no queda con un hueco.
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
 * este tamaño de chip. */
function InsigniaColumbus() {
  return (
    <div className="absolute -top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-black/5">
      <Image src="/img/icono-columbus.png" alt="Columbus" width={20} height={24} className="h-5 w-auto" />
    </div>
  );
}

interface TarjetaDestinoProps {
  nombre: string;
  foto: string;
  descripcion: string;
}

function TarjetaDestino({ nombre, foto, descripcion }: TarjetaDestinoProps) {
  return (
    <div className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-32 w-full">
        <Image
          src={foto}
          alt={nombre}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="relative px-3 pb-3 pt-5">
        <InsigniaColumbus />
        <p className="text-sm font-bold text-brand-dark">{nombre}</p>
        <p className="mt-1 text-xs leading-snug text-brand-dark/60">{descripcion}</p>
      </div>
    </div>
  );
}

export function DestinosPopulares() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-cobalto">
        Destinos populares
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {DESTINOS.slice(0, 4).map((destino) => (
          <TarjetaDestino key={destino.nombre} {...destino} />
        ))}

        <PublicidadNativa />

        {DESTINOS.slice(4).map((destino) => (
          <TarjetaDestino key={destino.nombre} {...destino} />
        ))}
      </div>
    </section>
  );
}
