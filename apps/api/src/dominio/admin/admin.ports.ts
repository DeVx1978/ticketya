/**
 * Dominio de administracion de plataforma -- RF-ADMIN.
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
  tasaMonto?: number;
  /** Vacío real de diseño encontrado el 29-jul-2026 -- terminales no tenían logo, cooperativas sí. */
  logoUrl?: string;
}

export interface FilaVentaNacional {
  cooperativaNombre: string;
  totalVentas: number;
  totalBoletos: number;
}

/**
 * 27-jul-2026 -- controla como se muestra el IVA del pasaje al pasajero
 * en el checkout, sin afectar el valor real guardado internamente. Ver
 * comentario completo en packages/db/schema/configuracion.ts.
 */
export type ModoIvaBoleto = 'calculado' | 'cero' | 'oculto';

export interface AdminRepositorio {
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

  actualizarPuntoOperacion(
    id: string,
    datos: Partial<DatosNuevoPuntoOperacion>,
  ): Promise<void>;

  dashboardNacional(): Promise<FilaVentaNacional[]>;

  obtenerIvaNacional(): Promise<number>;

  actualizarYPropagarIvaNacional(
    nuevoPorcentaje: number,
    usuarioId: string,
  ): Promise<{ cooperativasActualizadas: number }>;

  obtenerCargoPlataforma(): Promise<number>;
  actualizarCargoPlataforma(nuevoMonto: number): Promise<void>;

  listarBannersPropios(): Promise<
    {
      id: string;
      titulo: string;
      imagenUrl: string;
      enlaceUrl: string;
      activo: boolean;
      orden: number;
    }[]
  >;
  crearBannerPropio(datos: {
    titulo: string;
    imagenUrl: string;
    enlaceUrl: string;
    orden?: number;
  }): Promise<{ id: string }>;
  actualizarBannerPropio(
    id: string,
    datos: { activo?: boolean; orden?: number },
  ): Promise<void>;
  eliminarBannerPropio(id: string): Promise<void>;

  /** 27-jul-2026 -- editable desde el Panel Admin, sin tocar codigo. */
  obtenerModoIvaBoleto(): Promise<ModoIvaBoleto>;
  actualizarModoIvaBoleto(modo: ModoIvaBoleto): Promise<void>;
}
