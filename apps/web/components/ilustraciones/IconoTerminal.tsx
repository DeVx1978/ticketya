import type { PropsIlustracion } from "./tipos";

/**
 * Ícono genérico de terminal terrestre / parada -- nuevo (16-ago-2026,
 * Fase 1 de la sesión de frontend), distinto a propósito del ícono de
 * cooperativa (ese es un bus; este es el edificio/andén, para no
 * confundir visualmente "quién opera el viaje" con "dónde se aborda").
 * Techo en forma de dosel/marquesina, como los terminales reales de
 * Ecuador (Quitumbe, Guayaquil, Cuenca) -- no un edificio genérico
 * cualquiera.
 */
export function IconoTerminal({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Terminal terrestre"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      {/* Dosel/marquesina del terminal */}
      <path d="M6 20L24 12L42 20V23H6V20Z" className="fill-brand-cobalto" />
      {/* Cuerpo del edificio */}
      <rect x="10" y="23" width="28" height="15" className="fill-brand-cobalto" opacity="0.85" />
      {/* Ventanales */}
      <rect x="14" y="27" width="6" height="7" rx="1" fill="#ffffff" />
      <rect x="28" y="27" width="6" height="7" rx="1" fill="#ffffff" />
      {/* Puerta/andén central, en amarillo -- el único acento protagonista del ícono */}
      <rect x="21" y="29" width="6" height="9" rx="1" className="fill-brand-amber" />
    </svg>
  );
}
