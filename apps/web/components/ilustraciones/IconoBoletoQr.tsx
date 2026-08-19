import type { PropsIlustracion } from "./tipos";

/**
 * Ícono "Recibe tu boleto QR" -- paso 4 de "Cómo funciona" (19-ago-2026).
 */
export function IconoBoletoQr({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Recibir boleto con código QR"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <rect x="10" y="10" width="28" height="28" rx="4" className="fill-brand-cobalto" />
      <rect x="14" y="14" width="6" height="6" fill="#ffffff" />
      <rect x="28" y="14" width="6" height="6" fill="#ffffff" />
      <rect x="14" y="28" width="6" height="6" fill="#ffffff" />
      <rect x="24" y="24" width="4" height="4" fill="#ffffff" />
      <rect x="30" y="24" width="4" height="4" fill="#ffffff" />
      <rect x="24" y="30" width="4" height="4" fill="#ffffff" />
      <rect x="30" y="30" width="4" height="4" className="fill-brand-amber" />
    </svg>
  );
}
