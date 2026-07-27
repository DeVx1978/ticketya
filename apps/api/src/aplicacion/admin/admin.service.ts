import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminRepositorio,
  DatosNuevaCooperativa,
  DatosPrimerUsuarioCooperativa,
  DatosNuevoPuntoOperacion,
  ModoIvaBoleto,
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
    return this.admin.crearCooperativaConPrimerUsuarioAtomico(
      datosCooperativa,
      datosUsuario,
    );
  }

  async listarCooperativas() {
    return this.admin.listarCooperativas();
  }

  async listarPuntosOperacion() {
    return this.admin.listarPuntosOperacion();
  }

  async crearPuntoOperacion(datos: DatosNuevoPuntoOperacion) {
    return this.admin.crearPuntoOperacion(datos);
  }

  async actualizarPuntoOperacion(
    id: string,
    datos: Partial<DatosNuevoPuntoOperacion>,
  ) {
    return this.admin.actualizarPuntoOperacion(id, datos);
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

  async obtenerCargoPlataforma() {
    return this.admin.obtenerCargoPlataforma();
  }

  async actualizarCargoPlataforma(nuevoMonto: number) {
    return this.admin.actualizarCargoPlataforma(nuevoMonto);
  }

  async listarBannersPropios() {
    return this.admin.listarBannersPropios();
  }

  async crearBannerPropio(datos: {
    titulo: string;
    imagenUrl: string;
    enlaceUrl: string;
    orden?: number;
  }) {
    return this.admin.crearBannerPropio(datos);
  }

  async actualizarBannerPropio(
    id: string,
    datos: { activo?: boolean; orden?: number },
  ) {
    return this.admin.actualizarBannerPropio(id, datos);
  }

  async eliminarBannerPropio(id: string) {
    return this.admin.eliminarBannerPropio(id);
  }

  async obtenerModoIvaBoleto() {
    return this.admin.obtenerModoIvaBoleto();
  }

  async actualizarModoIvaBoleto(modo: ModoIvaBoleto) {
    return this.admin.actualizarModoIvaBoleto(modo);
  }
}
