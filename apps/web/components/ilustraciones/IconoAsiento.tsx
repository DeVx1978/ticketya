import type { PropsIlustracion } from "./tipos";

/**
 * Ícono "Elige horario y asiento" -- paso 2 de "Cómo funciona" (19-ago-2026).
 */
export function IconoAsiento({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Elegir asiento"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <rect x="11" y="11" width="9" height="9" rx="2" className="fill-brand-cobalto" />
      <rect x="24" y="11" width="9" height="9" rx="2" className="fill-brand-cobalto" />
      <rect x="11" y="24" width="9" height="9" rx="2" className="fill-brand-amber" />
      <rect x="24" y="24" width="9" height="9" rx="2" className="fill-brand-cobalto" />
    </svg>
  );
}
