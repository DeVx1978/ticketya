import { BuscadorForm } from "@/components/BuscadorForm";

export default function InicioPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-medium pb-24 pt-10 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 flex items-center gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight">TicketYa</span>
          </div>

          <h1 className="font-display max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Tu pasaje de bus, sin filas ni papeleo.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Compara horarios y precios de todas las cooperativas de una ruta,
            elige tu asiento, y recibe tu boleto digital con QR al instante.
          </p>
        </div>

        {/* Efecto "straddle": la tarjeta de búsqueda flota entre el hero
            morado y la sección blanca, estilo ClickBus (ya establecido
            en el prototipo original). */}
        <div className="mx-auto -mb-16 mt-10 max-w-5xl px-4">
          <BuscadorForm />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-24">
        <h2 className="font-display text-xl font-bold text-brand-dark">
          ¿Por qué TicketYa?
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
