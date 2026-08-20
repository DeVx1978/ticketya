import { Hero } from "@/components/Hero";
import { ComoFunciona } from "@/components/ComoFunciona";
import { DestinosPopulares } from "@/components/DestinosPopulares";
import { TerminalesAliadas } from "@/components/TerminalesAliadas";
import { FranjaBanners } from "@/components/FranjaBanners";
import { RutasDisponibles } from "@/components/RutasDisponibles";

export default function InicioPage() {
  return (
    <main className="flex-1">
      <Hero />

      <ComoFunciona />
      <DestinosPopulares />
      <TerminalesAliadas />

      <RutasDisponibles />

      <section className="mx-auto max-w-screen-2xl px-4 pb-16 pt-24 sm:px-8 lg:px-12">
        <FranjaBanners />
        <h2 className="font-display text-xl font-bold text-brand-dark">
          ¿Por qué Columbus?
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-brand-light p-5">
            <p className="font-display text-lg font-bold text-brand-dark">Todas las cooperativas</p>
            <p className="mt-1 text-sm text-brand-dark/70">
              Compara horarios y precios de distintas cooperativas para la misma ruta, en un solo lugar.
            </p>
          </div>
          <div className="rounded-xl bg-brand-light p-5">
            <p className="font-display text-lg font-bold text-brand-dark">Asiento elegido por ti</p>
            <p className="mt-1 text-sm text-brand-dark/70">
              Ve el mapa real del bus y elige tu puesto antes de pagar.
            </p>
          </div>
          <div className="rounded-xl bg-brand-light p-5">
            <p className="font-display text-lg font-bold text-brand-dark">Boleto digital al instante</p>
            <p className="mt-1 text-sm text-brand-dark/70">
              Tu código QR llega apenas se confirma el pago — nada que imprimir.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
