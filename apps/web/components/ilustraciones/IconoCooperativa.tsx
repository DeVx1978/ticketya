import type { PropsIlustracion } from "./tipos";

/**
 * Ícono genérico de cooperativa -- para cuando no hay logo real
 * subido todavía. Mismo bus que ya se usa en el avatar de cooperativa
 * del perfil (PR #78, 15-ago-2026) -- portado aquí como componente
 * reutilizable en vez de repetir el SVG a mano en cada lugar nuevo.
 */
export function IconoCooperativa({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Cooperativa de transporte"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <rect x="8" y="12" width="32" height="20" rx="4" className="fill-brand-cobalto" />
      <rect x="12" y="16" width="7" height="6" rx="1" fill="#ffffff" />
      <rect x="21" y="16" width="7" height="6" rx="1" fill="#ffffff" />
      <rect x="30" y="16" width="6" height="6" rx="1" fill="#ffffff" />
      <circle cx="15" cy="34" r="3" className="fill-brand-dark" />
      <circle cx="33" cy="34" r="3" className="fill-brand-dark" />
    </svg>
  );
}
