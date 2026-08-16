import type { PropsIlustracion } from "./tipos";

/**
 * Baños de Agua Santa (Tungurahua) -- montaña y cascada, aventura.
 * Arte ya verificado visualmente en el documento de referencia HTML
 * del 15-ago-2026 (aprobado por el director).
 */
export function IlustracionBanos({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Baños de Agua Santa"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <path d="M6 34L18 16L26 27L32 19L42 34H6Z" className="fill-brand-cobalto" />
      <path
        d="M27 34V22M27 22L24 26M27 22L30 26"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
