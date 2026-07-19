/**
 * Dominio de administración de plataforma — RF-ADMIN.
 */

export interface DatosNuevaCooperativa {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  modeloIntegracion: 'modelo_a' | 'modelo_b';
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
}

export interface DatosPrimerUsuarioCooperativa {
  correo: string;
  password: string;
  nombreCompleto: string;
}

export interface DatosNuevoPuntoOperacion {
  tipo: 'terminal_terrestre' | 'oficina_agencia' | 'parada_intermedia';
  nombre: string;
  ciudad: string;
  provincia: string;
  cooperativaPropietariaId?: string;
}

export interface FilaVentaNacional {
  cooperativaNombre: string;
  totalVentas: number;
  totalBoletos: number;
}

export interface AdminRepositorio {
  /** RF-ADMIN-001 — alta de cooperativa (se crea ya aprobada, el admin_plataforma la está dando de alta él mismo). */
  crearCooperativa(datos: DatosNuevaCooperativa): Promise<{ cooperativaId: string }>;

  /** Arranque: primer usuario admin_cooperativa de una cooperativa recién creada. */
  crearPrimerUsuarioCooperativa(
    cooperativaId: string,
    datos: DatosPrimerUsuarioCooperativa,
  ): Promise<{ usuarioId: string }>;

  listarCooperativas(): Promise<{ id: string; nombreComercial: string; estado: string }[]>;

  crearPuntoOperacion(datos: DatosNuevoPuntoOperacion): Promise<{ puntoOperacionId: string }>;

  /** RF-ADMIN-002 — dashboard nacional agregado de todas las cooperativas. */
  dashboardNacional(): Promise<FilaVentaNacional[]>;
}
