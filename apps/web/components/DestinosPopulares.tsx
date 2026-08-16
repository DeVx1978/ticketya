import {
  IlustracionMontanita,
  IlustracionBanos,
  IlustracionGalapagos,
  IlustracionMindo,
} from "./ilustraciones";

/**
 * Destinos turísticos populares -- Fase 2 de la sesión de frontend
 * (16-ago-2026). Decisión real del director (sesión de exploración de
 * diseño, DOCUMENTO_MAESTRO.md sección 5.8): sitios turísticos reales
 * de Ecuador, no solo nombres de ciudades. Usa las 4 ilustraciones
 * construidas en la Fase 1.
 */
const DESTINOS = [
  { nombre: "Montañita", region: "Santa Elena", Ilustracion: IlustracionMontanita },
  { nombre: "Baños de Agua Santa", region: "Tungurahua", Ilustracion: IlustracionBanos },
  { nombre: "Galápagos", region: "Islas Galápagos", Ilustracion: IlustracionGalapagos },
  { nombre: "Mindo", region: "Pichincha", Ilustracion: IlustracionMindo },
];

export function DestinosPopulares() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-cobalto">
        Destinos turísticos populares
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {DESTINOS.map(({ nombre, region, Ilustracion }) => (
          <div
            key={nombre}
            className="rounded-xl border border-black/5 bg-white p-5 text-center transition hover:-translate-y-0.5"
          >
            <Ilustracion tamano={48} className="mx-auto mb-2" />
            <p className="text-sm font-semibold text-brand-dark">{nombre}</p>
            <p className="text-xs text-brand-dark/50">{region}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
