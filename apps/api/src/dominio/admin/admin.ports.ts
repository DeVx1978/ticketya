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
  /** Tasa fija que cobra ESTE punto de operación por cada boleto que sale de él — cada terminal la define por su cuenta. */
  tasaMonto?: number;
}

export interface FilaVentaNacional {
  cooperativaNombre: string;
  totalVentas: number;
  totalBoletos: number;
}

export interface AdminRepositorio {
  /**
   * RF-ADMIN-001 — alta de cooperativa + su primer usuario
   * admin_cooperativa, atómico (todo o nada, ver comentario completo
   * más abajo).
   */

  /**
   * Igual que llamar crearCooperativa + crearPrimerUsuarioCooperativa,
   * pero atómico: si el segundo paso falla (ej. correo duplicado), el
   * primero se revierte — nunca queda una cooperativa huérfana sin
   * ningún usuario que pueda entrar a administrarla. Hallazgo real del
   * 22-jul-2026: antes de esto, un correo duplicado en el segundo paso
   * dejaba la cooperativa ya creada en la base, sin forma de recuperarla
   * desde el Panel Admin.
   */
  crearCooperativaConPrimerUsuarioAtomico(
    datosCooperativa: DatosNuevaCooperativa,
    datosUsuario: DatosPrimerUsuarioCooperativa,
  ): Promise<{ cooperativaId: string; usuarioId: string }>;

  listarCooperativas(): Promise<
    { id: string; nombreComercial: string; estado: string }[]
  >;

  listarPuntosOperacion(): Promise<
    {
      id: string;
      tipo: string;
      nombre: string;
      ciudad: string;
      provincia: string;
      tasaMonto: number | null;
      cooperativaPropietariaNombre: string | null;
    }[]
  >;

  crearPuntoOperacion(
    datos: DatosNuevoPuntoOperacion,
  ): Promise<{ puntoOperacionId: string }>;

  /** RF-ADMIN-002 — dashboard nacional agregado de todas las cooperativas. */
  dashboardNacional(): Promise<FilaVentaNacional[]>;

  /** IVA nacional vigente — el que se propaga a las cooperativas en "modo automático" (21-jul-2026). */
  obtenerIvaNacional(): Promise<number>;

  /**
   * Cambia el IVA nacional y lo propaga de inmediato a toda cooperativa
   * con ivaSigueTasaNacional = true (las que fijaron un valor propio
   * manualmente no se tocan). Devuelve cuántas cooperativas se
   * actualizaron, para que el admin vea el alcance real del cambio.
   */
  actualizarYPropagarIvaNacional(
    nuevoPorcentaje: number,
    usuarioId: string,
  ): Promise<{ cooperativasActualizadas: number }>;
}
