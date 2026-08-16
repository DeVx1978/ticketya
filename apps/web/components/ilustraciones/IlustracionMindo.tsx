import type { PropsIlustracion } from "./tipos";

/**
 * Mindo (Pichincha) -- bosque nublado. Arte ya verificado visualmente
 * en el documento de referencia HTML del 15-ago-2026 (aprobado por el
 * director).
 */
export function IlustracionMindo({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mindo"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <circle cx="17" cy="18" r="9" className="fill-brand-cobalto" />
      <circle cx="30" cy="15" r="7" className="fill-brand-cobalto" opacity="0.7" />
      <circle cx="24" cy="24" r="8" className="fill-brand-amber" />
      <rect x="22.5" y="30" width="3" height="10" rx="1.5" className="fill-brand-cobalto" />
    </svg>
  );
}
