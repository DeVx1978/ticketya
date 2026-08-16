/**
 * Sistema de ilustraciones propias de Columbus (16-ago-2026, Fase 1 de
 * la sesión de frontend) -- SVG originales, dibujados a mano, nunca
 * bancos de imágenes ni fotos de internet (límite real de derechos de
 * autor, documentado en DOCUMENTO_MAESTRO.md sección 5.8) y nunca
 * emojis (se ven inconsistentes entre sistemas operativos y no
 * transmiten la identidad de marca).
 *
 * Todas comparten esta misma forma de recibir tamaño/clase, para que
 * cualquier ilustración nueva que se agregue después siga el mismo
 * patrón sin pensarlo dos veces.
 */
export interface PropsIlustracion {
  /** Tamaño real en píxeles, cuadrado (ancho = alto). Por defecto 48px,
   * el tamaño real que ya se usa en las tarjetas de destino/cooperativa. */
  tamano?: number;
  /** Clases adicionales de Tailwind, para posicionamiento o márgenes
   * puntuales -- el color y el tamaño base ya vienen resueltos aquí. */
  className?: string;
}
