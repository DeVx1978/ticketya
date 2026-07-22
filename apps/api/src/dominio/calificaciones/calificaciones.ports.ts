/**
 * RF nuevo, 22-jul-2026 — calificaciones de viaje. Ver comentario
 * completo en packages/db/schema/calificaciones.ts sobre por qué se
 * califica el viaje/cooperativa y no la plataforma en general.
 */
export interface CalificacionesRepositorio {
  /**
   * Confirma que el boleto existe y le pertenece de verdad al usuario
   * que intenta calificar (a través de compras.compradorUsuarioId) —
   * la única forma de que alguien califique es haber comprado
   * realmente ese boleto. Devuelve la cooperativaId del boleto si es
   * válido, o null si no existe o no le pertenece.
   */
  obtenerCooperativaSiBoletoPerteneceA(
    boletoId: string,
    usuarioId: string,
  ): Promise<{ cooperativaId: string } | null>;

  yaExisteCalificacionPara(boletoId: string): Promise<boolean>;

  crear(datos: {
    boletoId: string;
    cooperativaId: string;
    pasajeroUsuarioId: string;
    puntuacion: number;
    comentario?: string;
  }): Promise<{ id: string }>;

  /** Promedio y cantidad, por cooperativa — para el desplegar en Panel Empresa. */
  resumenPorCooperativa(
    cooperativaId: string,
  ): Promise<{ promedio: number | null; cantidad: number }>;
}
