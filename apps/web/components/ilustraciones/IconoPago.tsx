import type { PropsIlustracion } from "./tipos";

/**
 * Ícono "Paga seguro" -- paso 3 de "Cómo funciona" (19-ago-2026).
 */
export function IconoPago({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Pago seguro"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <rect x="8" y="15" width="32" height="20" rx="4" className="fill-brand-cobalto" />
      <rect x="8" y="20" width="32" height="5" fill="#ffffff" />
      <rect x="12" y="28" width="10" height="3" rx="1.5" className="fill-brand-amber" />
    </svg>
  );
}
