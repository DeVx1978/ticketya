import type { PropsIlustracion } from "./tipos";

/**
 * Montañita (Santa Elena) -- playa y surf. Arte ya verificado
 * visualmente en el documento de referencia HTML del 15-ago-2026
 * (aprobado por el director), portado aquí tal cual como componente
 * real reutilizable.
 */
export function IlustracionMontanita({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Montañita"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <path
        d="M8 32c3-2 6-2 9 0s6 2 9 0 6-2 9 0 6 2 9 0"
        className="stroke-brand-cobalto"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 26c3-2 6-2 9 0s6 2 9 0 6-2 9 0 6 2 9 0"
        className="stroke-brand-cobalto"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="34" cy="14" r="5" className="fill-brand-amber" />
    </svg>
  );
}
