/**
 * Dominio del Panel Empresa — RF-COOP, RF-FLOTA.
 */

export interface DatosNuevoTipoVehiculo {
  nombre: string;
  capacidadTotal: number;
  distribucionAsientos?: unknown;
}

export interface DatosEditarTipoVehiculo {
  nombre?: string;
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
  ref: string;
  nombre: string;
  capacidadTotal: number;
  distribucionAsientos?: unknown;
}

export interface ItemImportConductor {
  ref: string;
  nombreCompleto: string;
  cedula: string;
  licenciaNumero?: string;
  licenciaCategoria?: string;
  telefono?: string;
}

export interface ItemImportUnidad {
  ref: string;
  tipoVehiculoRef: string;
  placa: string;
  identificadorOperativo: string;
}

export interface ItemImportRuta {
  ref: string;
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
