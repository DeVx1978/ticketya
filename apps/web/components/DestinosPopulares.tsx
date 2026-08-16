import Image from "next/image";

/**
 * Destinos turísticos populares -- fotos reales proporcionadas por el
 * director (16-ago-2026), reemplazan las 4 ilustraciones dibujadas de
 * la Fase 1/2 (Mindo y Galápagos salen -- no son parte de la
 * cobertura real de rutas de Columbus). 8 ciudades/destinos reales:
 * las 6 ciudades donde ya opera o planea operar Columbus (Ibarra,
 * Machala, Esmeraldas, Guayaquil, Quito) más 2 destinos turísticos
 * de playa (Salinas, Montañita, Baños).
 */
const DESTINOS = [
  { nombre: "Quito", foto: "/img/destinos/quito.jpg" },
  { nombre: "Guayaquil", foto: "/img/destinos/guayaquil.jpg" },
  { nombre: "Ibarra", foto: "/img/destinos/ibarra.jpg" },
  { nombre: "Machala", foto: "/img/destinos/machala.jpg" },
  { nombre: "Esmeraldas", foto: "/img/destinos/esmeraldas.jpg" },
  { nombre: "Baños de Agua Santa", foto: "/img/destinos/banos.jpg" },
  { nombre: "Montañita", foto: "/img/destinos/montanita.jpg" },
  { nombre: "Salinas", foto: "/img/destinos/salinas.jpg" },
];

export function DestinosPopulares() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-cobalto">
        Destinos populares
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {DESTINOS.map(({ nombre, foto }) => (
          <div
            key={nombre}
            className="group relative overflow-hidden rounded-xl transition hover:-translate-y-0.5"
          >
            <div className="relative h-28 w-full">
              <Image
                src={foto}
                alt={nombre}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 via-brand-dark/0 to-transparent" />
            </div>
            <p className="absolute bottom-2 left-3 text-sm font-semibold text-white">{nombre}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
