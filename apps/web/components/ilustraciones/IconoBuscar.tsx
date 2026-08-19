import type { PropsIlustracion } from "./tipos";

/**
 * Ícono "Busca tu ruta" -- paso 1 de "Cómo funciona" (19-ago-2026).
 * Mismo patrón real que el resto de la familia de ilustraciones.
 */
export function IconoBuscar({ tamano = 48, className }: PropsIlustracion) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Buscar ruta"
    >
      <rect width="48" height="48" rx="10" className="fill-brand-cobalto-claro" />
      <circle cx="21" cy="21" r="9" className="fill-brand-cobalto" />
      <circle cx="21" cy="21" r="4.5" fill="#ffffff" />
      <rect
        x="27.5"
        y="27.5"
        width="10"
        height="4.5"
        rx="2.25"
        transform="rotate(45 27.5 27.5)"
        className="fill-brand-dark"
      />
    </svg>
  );
}
