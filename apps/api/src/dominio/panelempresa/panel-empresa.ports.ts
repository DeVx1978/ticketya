/**
 * Dominio del Panel Empresa — RF-COOP, RF-FLOTA.
 */

/**
 * Métodos de pago manuales (29-jul-2026) — ver metodos-pago.ts en el
 * paquete de base de datos para el contexto completo de negocio.
 */
export type TipoMetodoPago =
  | 'transferencia_bancaria'
  | 'efectivo'
  | 'deuna'
  | 'payphone'
  | 'tarjeta_pasarela';

export interface MetodoPagoCooperativa {
  id: string;
  tipo: TipoMetodoPago;
  activo: boolean;
  datosCuenta: Record<string, string>;
}

/**
 * Vacío real de diseño encontrado el 29-jul-2026: `distribucionAsientos`
 * ya se guardaba (tipo `unknown`), pero nunca tuvo una forma definida
 * ni el frontend la usaba — el mapa de asientos siempre dibujaba una
 * simplificación de 2+2, sin importar si el bus real tenía dos pisos o
 * sección VIP. Esta es la forma real, mínima pero completa:
 *
 * - Uno o más "pisos" (buses de un piso solo declaran uno).
 * - Cada piso tiene filas; cada fila es una lista de celdas.
 * - Una celda es el número de asiento (string) o `null` — `null`
 *   representa el pasillo (hueco visual entre columnas de asientos).
 * - `categoria` en el piso es opcional, solo para mostrar una
 *   etiqueta/color distinto en el frontend (ej. "VIP", "Cama").
 */
export interface PisoDistribucionAsientos {
  nombre: string;
  categoria?: string;
  filas: Array<{ celdas: Array<string | null> }>;
}

export interface DistribucionAsientos {
  pisos: PisoDistribucionAsientos[];
}

/**
 * Valida que la distribución tenga forma correcta y que la cantidad
 * real de asientos (celdas no nulas, sin duplicados) coincida
 * exactamente con `capacidadTotal` — evita que un tipo de vehículo
 * quede con un mapa de asientos que miente sobre cuántos puestos
 * vende de verdad.
 */
export function validarDistribucionAsientos(
  distribucion: unknown,
  capacidadTotal: number,
): { ok: true } | { ok: false; motivo: string } {
  if (
    typeof distribucion !== 'object' ||
    distribucion === null ||
    !Array.isArray((distribucion as DistribucionAsientos).pisos) ||
    (distribucion as DistribucionAsientos).pisos.length === 0
  ) {
    return {
      ok: false,
      motivo: 'La distribución de asientos debe tener al menos un piso con filas.',
    };
  }

  const numeros = new Set<string>();
  for (const piso of (distribucion as DistribucionAsientos).pisos) {
    if (typeof piso.nombre !== 'string' || !piso.nombre.trim()) {
      return { ok: false, motivo: 'Cada piso necesita un nombre.' };
    }
    if (!Array.isArray(piso.filas)) {
      return { ok: false, motivo: `El piso "${piso.nombre}" no tiene filas.` };
    }
    for (const fila of piso.filas) {
      if (!Array.isArray(fila.celdas)) {
        return {
          ok: false,
          motivo: `Una fila del piso "${piso.nombre}" no tiene celdas válidas.`,
        };
      }
      for (const celda of fila.celdas) {
        if (celda === null) continue;
        if (typeof celda !== 'string' || !celda.trim()) {
          return {
            ok: false,
            motivo: `Un asiento del piso "${piso.nombre}" tiene un número inválido.`,
          };
        }
        if (numeros.has(celda)) {
          return {
            ok: false,
            motivo: `El número de asiento "${celda}" está repetido — cada asiento debe ser único en todo el vehículo.`,
          };
        }
        numeros.add(celda);
      }
    }
  }

  if (numeros.size !== capacidadTotal) {
    return {
      ok: false,
      motivo: `La distribución tiene ${numeros.size} asientos, pero la capacidad declarada es ${capacidadTotal} — deben coincidir exactamente.`,
    };
  }

  return { ok: true };
}

export interface DatosNuevoTipoVehiculo {
  nombre: string;
  categoria?: 'bus' | 'buseta' | 'van' | 'auto';
  capacidadTotal: number;
  distribucionAsientos?: unknown;
}

export interface DatosEditarTipoVehiculo {
  nombre?: string;
  categoria?: 'bus' | 'buseta' | 'van' | 'auto';
  capacidadTotal?: number;
  distribucionAsientos?: unknown;
  activo?: boolean;
}

export interface DatosEditarRuta {
  nombre?: string;
  precioBaseReferencia?: number;
  activa?: boolean;
}

export interface DatosNuevaUnidad {
  tipoVehiculoId: string;
  placa: string;
  identificadorOperativo: string;
}

export interface DatosNuevaRuta {
  origenPuntoOperacionId: string;
  destinoPuntoOperacionId: string;
  precioBaseReferencia: number;
  nombre?: string;
}

export interface DatosNuevoViaje {
  rutaId: string;
  unidadId: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
  precioBase: number;
}

export interface DatosNuevoUsuarioStaff {
  correo: string;
  password: string;
  nombreCompleto: string;
  rol: 'vendedor' | 'admin_cooperativa';
}

export interface DatosNuevoConductor {
  nombreCompleto: string;
  cedula: string;
  licenciaNumero?: string;
  licenciaCategoria?: string;
  telefono?: string;
}

/**
 * Carga masiva (RF-COOP, extensión pedida por el director tras
 * identificar que las cooperativas reales necesitan cargar rutas,
 * horarios, unidades y conductores de una sola vez, no uno por uno).
 *
 * Cada item de tiposVehiculo/conductores/unidades/rutas lleva un `ref`
 * — una etiqueta temporal elegida libremente por quien arma el JSON
 * (ej. "bus-vip-1"), que sirve para que otros items del MISMO paquete
 * lo referencien antes de que exista un ID real (ej. una unidad
 * referenciando su tipoVehiculoRef). También se puede usar directamente
 * un ID real ya existente en vez de un ref, para reutilizar recursos
 * creados en una importación anterior.
 */
export interface ItemImportTipoVehiculo {
  ref?: string;
  nombre: string;
  capacidadTotal: number;
  distribucionAsientos?: unknown;
}

export interface ItemImportConductor {
  ref?: string;
  nombreCompleto: string;
  cedula: string;
  licenciaNumero?: string;
  licenciaCategoria?: string;
  telefono?: string;
}

export interface ItemImportUnidad {
  ref?: string;
  tipoVehiculoRef: string;
  placa: string;
  identificadorOperativo: string;
}

export interface ItemImportRuta {
  ref?: string;
  origenPuntoOperacionId: string;
  destinoPuntoOperacionId: string;
  precioBaseReferencia: number;
  nombre?: string;
}

/** diasSemana: 0=domingo … 6=sábado. horaSalida formato "HH:MM" (24h, hora local Ecuador). */
export interface ItemImportHorario {
  rutaRef: string;
  unidadRef: string;
  conductorRef?: string;
  horaSalida: string;
  diasSemana: number[];
}

export interface DatosImportacion {
  tiposVehiculo?: ItemImportTipoVehiculo[];
  conductores?: ItemImportConductor[];
  unidades?: ItemImportUnidad[];
  rutas?: ItemImportRuta[];
  horarios?: ItemImportHorario[];
  /** Si se incluyen ambas fechas, además de crear los horarios_ruta, se generan las filas de viajes concretas en ese rango. */
  generarViajesDesde?: string;
  generarViajesHasta?: string;
}

export interface ResultadoImportacion {
  tiposVehiculoCreados: number;
  conductoresCreados: number;
  unidadesCreadas: number;
  rutasCreadas: number;
  horariosCreados: number;
  viajesGenerados: number;
}

export interface FilaVentaDelDia {
  rutaNombre: string;
  vendedorNombre: string | null;
  totalBoletos: number;
  totalVentas: number;
}

export interface ResultadoValidacionQr {
  valido: boolean;
  mensaje: string;
  pasajeroNombre?: string;
  /** RF-MENOR — presente solo si el pasajero de este boleto es menor de edad. */
  menor?: {
    boletoId: string;
    tipoAcompanamiento: 'con_padre_madre_tutor' | 'con_autorizacion';
    adultoAcompananteNombre: string | null;
    adultoResponsableNombre: string | null;
    adultoResponsableDocumento: string | null;
    adultoResponsableTelefono: string | null;
    documentoAutorizacionUrl: string | null;
    yaVerificado: boolean;
  };
}

export interface RutaResumen {
  id: string;
  nombre: string | null;
  origenCiudad: string;
  destinoCiudad: string;
  precioBaseReferencia: number;
}

export interface TipoVehiculoResumen {
  id: string;
  nombre: string;
  categoria: string | null;
  capacidadTotal: number;
}

export interface UnidadResumen {
  id: string;
  placa: string;
  identificadorOperativo: string;
  tipoVehiculoId: string;
  tipoVehiculoNombre: string;
  activo: boolean;
}

export interface ViajeResumen {
  id: string;
  rutaNombre: string;
  origenCiudad: string;
  destinoCiudad: string;
  fechaSalida: string;
  horaSalidaProgramada: string;
  precioBase: number;
  estado: string;
  unidadPlaca: string;
  tipoVehiculoNombre: string;
}

export interface UsuarioStaffResumen {
  id: string;
  correo: string;
  nombreCompleto: string;
  rol: 'vendedor' | 'admin_cooperativa';
  activo: boolean;
}

export interface ConductorResumen {
  id: string;
  nombreCompleto: string;
  cedula: string;
  licenciaNumero: string | null;
  licenciaCategoria: string | null;
  telefono: string | null;
}

export interface PasajeroDeViaje {
  numeroAsiento: string;
  nombreCompleto: string;
  documento: string;
  tipoTarifa: string;
  esMenorEdad: boolean;
  estadoBoleto: string;
}

export interface PanelEmpresaRepositorio {
  crearTipoVehiculo(
    cooperativaId: string,
    datos: DatosNuevoTipoVehiculo,
  ): Promise<{ id: string }>;
  /** Tipos de vehículo de la cooperativa — se necesita antes de poder crear una unidad. */
  listarTiposVehiculo(cooperativaId: string): Promise<TipoVehiculoResumen[]>;
  editarTipoVehiculo(
    cooperativaId: string,
    tipoVehiculoId: string,
    datos: DatosEditarTipoVehiculo,
  ): Promise<{ ok: true } | { ok: false; motivo: string }>;
  crearUnidad(
    cooperativaId: string,
    datos: DatosNuevaUnidad,
  ): Promise<{ id: string }>;
  /** Unidades (buses) de la cooperativa, con el nombre de su tipo ya resuelto. */
  listarUnidades(cooperativaId: string): Promise<UnidadResumen[]>;

  /**
   * Activar/desactivar una unidad — hallazgo real 22-jul-2026: la
   * columna `activo` existía desde el esquema original, pero no había
   * forma de cambiarla ni de verla, así que una unidad en
   * mantenimiento/retirada seguía apareciendo como opción normal al
   * crear un viaje o cambiar la unidad de uno. No borra nada — los
   * viajes históricos con esa unidad no se ven afectados.
   */
  actualizarEstadoUnidad(
    cooperativaId: string,
    unidadId: string,
    activo: boolean,
  ): Promise<void>;
  crearRuta(
    cooperativaId: string,
    datos: DatosNuevaRuta,
  ): Promise<{ id: string }>;
  /** Rutas de la cooperativa, para elegir al armar un viaje o solo para revisar lo que ya existe. */
  listarRutas(cooperativaId: string): Promise<RutaResumen[]>;
  editarRuta(
    cooperativaId: string,
    rutaId: string,
    datos: DatosEditarRuta,
  ): Promise<{ ok: true } | { ok: false; motivo: string }>;
  crearViaje(
    cooperativaId: string,
    datos: DatosNuevoViaje,
  ): Promise<{ id: string }>;
  /** Viajes programados de la cooperativa — el mismo listado que RF-BUS termina mostrando al pasajero, pero visto desde adentro. */
  listarViajes(cooperativaId: string): Promise<ViajeResumen[]>;

  /**
   * Cancelar un viaje completo — hallazgo real 22-jul-2026: antes no
   * existía ninguna forma de hacerlo (ej. si el bus se daña). Cancela
   * el viaje Y cascada automáticamente a cancelar todos los boletos ya
   * vendidos de ese viaje — un pasajero no debería tener que darse
   * cuenta solo de que su viaje ya no existe.
   */
  cancelarViaje(
    cooperativaId: string,
    viajeId: string,
  ): Promise<
    { ok: true; boletosCancelados: number } | { ok: false; motivo: string }
  >;

  /**
   * Cambiar la unidad asignada a un viaje ya programado — investigado y
   * confirmado el 22-jul-2026: es el patrón real que usan las
   * plataformas más grandes del sector cuando un bus se daña
   * ("vehículo de reemplazo" — FlixBus), y en Ecuador tiene además
   * respaldo legal real: la ANT sanciona la INTERRUPCIÓN del servicio
   * (infracción administrativa muy grave, LOTTTSV) — reemplazar la
   * unidad en vez de cancelar el viaje evita esa sanción. No toca
   * boletos ni asientos para nada — el viaje sigue siendo el mismo
   * viaje. Solo se permite si la unidad nueva tiene capacidad igual o
   * mayor a la actual, para no invalidar ningún asiento ya vendido.
   */
  cambiarUnidadViaje(
    cooperativaId: string,
    viajeId: string,
    nuevaUnidadId: string,
  ): Promise<{ ok: true } | { ok: false; motivo: string }>;

  /**
   * Editar hora y/o precio de un viaje — hallazgo real 22-jul-2026:
   * antes no existía ninguna forma de corregir un error de captura
   * (hora mal puesta, precio equivocado) sin cancelar y volver a
   * crear el viaje entero. Solo se permite si TODAVÍA no se ha
   * vendido ningún boleto — sin sistema de notificaciones, cambiar la
   * hora/precio de un viaje que un pasajero ya compró lo dejaría sin
   * enterarse del cambio, lo cual es peor que no permitirlo.
   */
  editarViaje(
    cooperativaId: string,
    viajeId: string,
    datos: { horaSalidaProgramada?: string; precioBase?: number },
  ): Promise<{ ok: true } | { ok: false; motivo: string }>;

  /**
   * Lista de pasajeros de un viaje concreto ("manifiesto") — hallazgo
   * real 22-jul-2026: hoy la cooperativa puede ver cuántos boletos se
   * vendieron en total (dashboard), pero no QUIÉN va a abordar un viaje
   * específico, con qué asiento, ni si ya se validó su boleto. Sin esto,
   * el personal en el terminal no tiene ninguna lista real de a quién
   * esperar.
   */
  listarPasajerosDeViaje(
    cooperativaId: string,
    viajeId: string,
  ): Promise<PasajeroDeViaje[]>;
  crearUsuarioStaff(
    cooperativaId: string,
    datos: DatosNuevoUsuarioStaff,
  ): Promise<{ usuarioId: string }>;
  /** "Personal" (22-jul-2026) — antes se podía crear staff, pero no había forma de VER quién ya estaba registrado. */
  listarUsuariosStaff(cooperativaId: string): Promise<UsuarioStaffResumen[]>;
  crearConductor(
    cooperativaId: string,
    datos: DatosNuevoConductor,
  ): Promise<{ id: string }>;
  listarConductores(cooperativaId: string): Promise<ConductorResumen[]>;

  /** Carga masiva — ver comentario de DatosImportacion arriba. */
  importarDatos(
    cooperativaId: string,
    datos: DatosImportacion,
  ): Promise<ResultadoImportacion>;

  /** RF-COOP-004 — dashboard de ventas del día, tenant-scoped de verdad. */
  dashboardVentasDelDia(cooperativaId: string): Promise<FilaVentaDelDia[]>;

  /** Perfil visual de la cooperativa — hoy solo el logo (22-jul-2026). */
  obtenerPerfil(cooperativaId: string): Promise<{ logoUrl: string | null }>;
  actualizarPerfil(
    cooperativaId: string,
    datos: { logoUrl: string | null },
  ): Promise<void>;

  /** IVA de la cooperativa — ya incluido en el precio del boleto por defecto (15%), configurable. */
  obtenerConfiguracionFiscal(cooperativaId: string): Promise<{
    ivaPorcentaje: number;
    ivaVisibleEnBoleto: boolean;
    ivaSigueTasaNacional: boolean;
  }>;
  actualizarConfiguracionFiscal(
    cooperativaId: string,
    datos: {
      ivaPorcentaje: number;
      ivaVisibleEnBoleto: boolean;
      ivaSigueTasaNacional: boolean;
    },
  ): Promise<void>;

  /**
   * Reprogramación con crédito (Fase C, 28-jul-2026) — horas mínimas
   * antes de la salida para poder reprogramar. Cada cooperativa
   * configura la suya; null = usa el valor de reserva conservador de
   * la capa de aplicación.
   */
  obtenerHorasLimiteReprogramacion(cooperativaId: string): Promise<number | null>;
  actualizarHorasLimiteReprogramacion(
    cooperativaId: string,
    horas: number,
  ): Promise<void>;

  /**
   * Política de cancelación/reprogramación por cooperativa (29-jul-2026,
   * hallazgo real de negocio): Transportes Occidental (Machala) no
   * permite cambios ni devoluciones. Se configuran por separado --
   * cancelar es una venta perdida para la cooperativa, reprogramar no.
   */
  obtenerPoliticaCancelacionReprogramacion(cooperativaId: string): Promise<{
    permiteCancelacion: boolean;
    horasLimiteCancelacion: number | null;
    permiteReprogramacion: boolean;
    horasLimiteReprogramacion: number | null;
  }>;
  actualizarPoliticaCancelacionReprogramacion(
    cooperativaId: string,
    datos: {
      permiteCancelacion?: boolean;
      horasLimiteCancelacion?: number;
      permiteReprogramacion?: boolean;
      horasLimiteReprogramacion?: number;
    },
  ): Promise<void>;

  /**
   * Métodos de pago manuales (29-jul-2026) -- mientras no hay pasarela
   * real conectada, cada cooperativa configura los que ya usa hoy en
   * Ecuador (transferencia, efectivo, DeUna, PayPhone) con sus propios
   * datos para recibir el pago.
   */
  listarMetodosPago(cooperativaId: string): Promise<MetodoPagoCooperativa[]>;
  guardarMetodoPago(
    cooperativaId: string,
    tipo: TipoMetodoPago,
    datosCuenta: Record<string, string>,
    activo: boolean,
  ): Promise<{ id: string }>;
  eliminarMetodoPago(cooperativaId: string, metodoPagoId: string): Promise<void>;

  /** RF-COOP-006 — validación de boleto por QR en abordaje. */
  validarBoletoPorQr(
    cooperativaId: string,
    codigoQr: string,
    validadoPorUsuarioId: string,
  ): Promise<ResultadoValidacionQr>;

  /** RF-MENOR-004 — verificación de documentos del menor, en ventanilla/abordaje. */
  verificarMenor(
    cooperativaId: string,
    boletoId: string,
    verificadoPorUsuarioId: string,
    documentoIdentidadVerificado: boolean,
    documentoAutorizacionVerificado: boolean,
  ): Promise<void>;
}
