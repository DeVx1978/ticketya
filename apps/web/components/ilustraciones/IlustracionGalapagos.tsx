import type { PropsIlustracion } from "./tipos";

/**
 * Islas Galápagos -- tortuga y naturaleza. Arte ya verificado
 * visualmente en el documento de referencia HTML del 15-ago-2026
 * (aprobado por el director).
 */
export function IlustracionGalapagos({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Islas Galápagos"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <ellipse cx="24" cy="26" rx="12" ry="9" className="fill-brand-cobalto" />
      <circle cx="24" cy="26" r="6.5" className="fill-brand-amber" />
      <path
        d="M12 22l-5-2M12 30l-5 2M36 22l5-2M36 30l5 2M24 17l-2-5M24 35l3 5"
        className="stroke-brand-cobalto"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
