import type { PropsIlustracion } from "./tipos";

/**
 * Ícono genérico de anunciante -- para cuando la campaña publicitaria
 * no tiene un logo propio subido. Mismo edificio que ya se usó en el
 * documento de referencia HTML del 15-ago-2026, portado aquí como
 * componente reutilizable.
 */
export function IconoPublicidad({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Anunciante"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <rect x="10" y="8" width="28" height="34" rx="3" className="fill-brand-cobalto" />
      <rect x="15" y="14" width="5" height="5" rx="1" fill="#ffffff" />
      <rect x="24" y="14" width="5" height="5" rx="1" fill="#ffffff" />
      <rect x="15" y="23" width="5" height="5" rx="1" fill="#ffffff" />
      <rect x="24" y="23" width="5" height="5" rx="1" fill="#ffffff" />
      <rect x="19" y="33" width="6" height="9" rx="1" className="fill-brand-amber" />
    </svg>
  );
}
