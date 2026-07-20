/**
 * Dominio del Panel Empresa — RF-COOP, RF-FLOTA.
 */

export interface DatosNuevoTipoVehiculo {
  nombre: string;
  capacidadTotal: number;
  distribucionAsientos?: unknown;
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
}

export interface RutaResumen {
  id: string;
  nombre: string | null;
  origenCiudad: string;
  destinoCiudad: string;
  precioBaseReferencia: number;
}

export interface PanelEmpresaRepositorio {
  crearTipoVehiculo(
    cooperativaId: string,
    datos: DatosNuevoTipoVehiculo,
  ): Promise<{ id: string }>;
  crearUnidad(
    cooperativaId: string,
    datos: DatosNuevaUnidad,
  ): Promise<{ id: string }>;
  crearRuta(
    cooperativaId: string,
    datos: DatosNuevaRuta,
  ): Promise<{ id: string }>;
  /** Rutas de la cooperativa, para elegir al armar un viaje o solo para revisar lo que ya existe. */
  listarRutas(cooperativaId: string): Promise<RutaResumen[]>;
  crearViaje(
    cooperativaId: string,
    datos: DatosNuevoViaje,
  ): Promise<{ id: string }>;
  crearUsuarioStaff(
    cooperativaId: string,
    datos: DatosNuevoUsuarioStaff,
  ): Promise<{ usuarioId: string }>;
  crearConductor(
    cooperativaId: string,
    datos: DatosNuevoConductor,
  ): Promise<{ id: string }>;

  /** Carga masiva — ver comentario de DatosImportacion arriba. */
  importarDatos(
    cooperativaId: string,
    datos: DatosImportacion,
  ): Promise<ResultadoImportacion>;

  /** RF-COOP-004 — dashboard de ventas del día, tenant-scoped de verdad. */
  dashboardVentasDelDia(cooperativaId: string): Promise<FilaVentaDelDia[]>;

  /** RF-COOP-006 — validación de boleto por QR en abordaje. */
  validarBoletoPorQr(
    cooperativaId: string,
    codigoQr: string,
    validadoPorUsuarioId: string,
  ): Promise<ResultadoValidacionQr>;
}
