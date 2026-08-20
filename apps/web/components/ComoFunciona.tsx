import { IconoBuscar, IconoAsiento, IconoPago, IconoBoletoQr } from "./ilustraciones";

/**
 * "Cómo funciona" -- 19-ago-2026, hallazgo real de la investigación
 * comparativa de portadas (redBus/FlixBus/plataformas de reserva):
 * un resumen visual corto de pasos reduce la duda de un pasajero que
 * nunca ha usado la plataforma.
 *
 * El director compartió un HTML de referencia con este mismo patrón
 * de 4 pasos, pero con datos de una demo genérica ("8 métodos de
 * pago", "Kushki", entrega por WhatsApp). Verificado contra el código
 * real antes de construir: el sistema tiene 5 métodos de pago reales
 * (no 8, Kushki no existe), y WhatsApp sigue simulado (bloqueado por
 * la cuenta gratuita de Twilio) -- corregido para reflejar solo lo
 * que la plataforma hace de verdad hoy.
 */
const PASOS = [
  {
    Icono: IconoBuscar,
    titulo: "Busca tu ruta",
    descripcion: "Escribe tu destino y ve solo las cooperativas que realmente van allí.",
  },
  {
    Icono: IconoAsiento,
    titulo: "Elige horario y asiento",
    descripcion: "Selecciona la hora y tu asiento en el mapa visual del bus.",
  },
  {
    Icono: IconoPago,
    titulo: "Paga seguro",
    descripcion: "De Una, PayPhone, transferencia bancaria o tarjeta -- tú eliges.",
  },
  {
    Icono: IconoBoletoQr,
    titulo: "Recibe tu boleto QR",
    descripcion: "Código QR único vinculado a tu cédula, al instante en tu correo.",
  },
];

export function ComoFunciona() {
  return (
    <section className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-8 lg:px-12">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-cobalto">
        Simple y rápido
      </h2>
      <p className="mb-8 font-display text-2xl font-bold text-brand-dark">
        Tu pasaje en 4 pasos
      </p>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {PASOS.map(({ Icono, titulo, descripcion }, indice) => (
          <div key={titulo} className="relative">
            <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-brand-dark">
              {indice + 1}
            </span>
            <Icono tamano={48} className="mb-3" />
            <p className="mb-1 text-sm font-bold text-brand-dark">{titulo}</p>
            <p className="text-xs text-brand-dark/60">{descripcion}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
