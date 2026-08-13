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
   * realmente ese boleto. Devuelve también la hora de salida/llegada
   * del viaje: hallazgo real del 22-jul-2026 — no tiene sentido dejar
   * calificar un viaje que todavía no ha ocurrido, así que el servicio
   * usa estos datos para rechazarlo si el viaje no ha llegado aún.
   */
  obtenerCooperativaSiBoletoPerteneceA(
    boletoId: string,
    usuarioId: string,
  ): Promise<{
    cooperativaId: string;
    horaSalidaProgramada: Date;
    horaLlegadaEstimada: Date | null;
  } | null>;

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

  /**
   * Reseñas de texto reales -- el campo `comentario` ya se guardaba
   * desde el 22-jul-2026, pero ningún endpoint lo devolvía nunca
   * (hallazgo real, 13-ago-2026). Solo trae calificaciones que sí
   * tienen comentario -- una calificación sin texto no es una "reseña"
   * que valga la pena listar. `nombreAutor` viene de
   * pasajeros_compra.nombres (primer nombre real del pasajero que
   * compró ese boleto, separado desde el ítem 31.1) -- nunca
   * apellidos, mismo criterio de privacidad que confirma Airbnb.
   */
  listarResenasPorCooperativa(
    cooperativaId: string,
    pagina: number,
    porPagina: number,
  ): Promise<{
    resenas: {
      id: string;
      puntuacion: number;
      comentario: string;
      nombreAutor: string;
      creadoEn: Date;
    }[];
    total: number;
  }>;

  /** "Mis boletos" — historial de compras del pasajero, con si ya puede calificar cada uno. */
  listarBoletosDePasajero(usuarioId: string): Promise<
    {
      boletoId: string;
      codigoQr: string;
      estado: string;
      cooperativaNombre: string;
      origenCiudad: string;
      destinoCiudad: string;
      fechaSalida: string;
      horaSalidaProgramada: Date;
      horaLlegadaEstimada: Date | null;
      yaCalificado: boolean;
    }[]
  >;

  /**
   * Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF. Mismo
   * criterio de pertenencia real que obtenerCooperativaSiBoletoPerteneceA
   * (a través de compras.compradorUsuarioId) -- null si el boleto no
   * existe o no le pertenece a quien lo pide, el service lo traduce a
   * un 403, no a un 404 (no revela si el boleto existe o no).
   */
  obtenerDatosBoletoParaPdf(
    boletoId: string,
    usuarioId: string,
  ): Promise<{
    codigoQr: string;
    estado: string;
    precioPagado: number;
    pasajeroNombre: string;
    numeroAsiento: string;
    cooperativaNombre: string;
    origenCiudad: string;
    destinoCiudad: string;
    fechaSalida: string;
    horaSalidaProgramada: Date;
  } | null>;
}
