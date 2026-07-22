import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminRepositorio,
  DatosNuevaCooperativa,
  DatosPrimerUsuarioCooperativa,
  DatosNuevoPuntoOperacion,
} from '../../dominio/admin/admin.ports';

export const ADMIN_REPOSITORIO = 'ADMIN_REPOSITORIO';

@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_REPOSITORIO) private readonly admin: AdminRepositorio,
  ) {}

  async crearCooperativaConPrimerUsuario(
    datosCooperativa: DatosNuevaCooperativa,
    datosUsuario: DatosPrimerUsuarioCooperativa,
  ) {
    const { cooperativaId } =
      await this.admin.crearCooperativa(datosCooperativa);
    const { usuarioId } = await this.admin.crearPrimerUsuarioCooperativa(
      cooperativaId,
      datosUsuario,
    );
    return { cooperativaId, usuarioId };
  }

  async listarCooperativas() {
    return this.admin.listarCooperativas();
  }

  async crearPuntoOperacion(datos: DatosNuevoPuntoOperacion) {
    return this.admin.crearPuntoOperacion(datos);
  }

  async dashboardNacional() {
    return this.admin.dashboardNacional();
  }

  async obtenerIvaNacional() {
    return this.admin.obtenerIvaNacional();
  }

  async actualizarYPropagarIvaNacional(
    nuevoPorcentaje: number,
    usuarioId: string,
  ) {
    return this.admin.actualizarYPropagarIvaNacional(
      nuevoPorcentaje,
      usuarioId,
    );
  }
}
