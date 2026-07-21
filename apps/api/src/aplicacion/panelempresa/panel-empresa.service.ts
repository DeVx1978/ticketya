import { Inject, Injectable } from '@nestjs/common';
import type {
  PanelEmpresaRepositorio,
  DatosNuevoTipoVehiculo,
  DatosNuevaUnidad,
  DatosNuevaRuta,
  DatosNuevoViaje,
  DatosNuevoUsuarioStaff,
  DatosNuevoConductor,
  DatosImportacion,
} from '../../dominio/panelempresa/panel-empresa.ports';

export const PANEL_EMPRESA_REPOSITORIO = 'PANEL_EMPRESA_REPOSITORIO';

@Injectable()
export class PanelEmpresaService {
  constructor(
    @Inject(PANEL_EMPRESA_REPOSITORIO)
    private readonly panel: PanelEmpresaRepositorio,
  ) {}

  crearTipoVehiculo(cooperativaId: string, datos: DatosNuevoTipoVehiculo) {
    return this.panel.crearTipoVehiculo(cooperativaId, datos);
  }

  listarTiposVehiculo(cooperativaId: string) {
    return this.panel.listarTiposVehiculo(cooperativaId);
  }

  crearUnidad(cooperativaId: string, datos: DatosNuevaUnidad) {
    return this.panel.crearUnidad(cooperativaId, datos);
  }

  listarUnidades(cooperativaId: string) {
    return this.panel.listarUnidades(cooperativaId);
  }

  crearRuta(cooperativaId: string, datos: DatosNuevaRuta) {
    return this.panel.crearRuta(cooperativaId, datos);
  }

  listarRutas(cooperativaId: string) {
    return this.panel.listarRutas(cooperativaId);
  }

  crearViaje(cooperativaId: string, datos: DatosNuevoViaje) {
    return this.panel.crearViaje(cooperativaId, datos);
  }

  listarViajes(cooperativaId: string) {
    return this.panel.listarViajes(cooperativaId);
  }

  crearUsuarioStaff(cooperativaId: string, datos: DatosNuevoUsuarioStaff) {
    return this.panel.crearUsuarioStaff(cooperativaId, datos);
  }

  crearConductor(cooperativaId: string, datos: DatosNuevoConductor) {
    return this.panel.crearConductor(cooperativaId, datos);
  }

  importarDatos(cooperativaId: string, datos: DatosImportacion) {
    return this.panel.importarDatos(cooperativaId, datos);
  }

  dashboardVentasDelDia(cooperativaId: string) {
    return this.panel.dashboardVentasDelDia(cooperativaId);
  }

  validarBoletoPorQr(
    cooperativaId: string,
    codigoQr: string,
    validadoPorUsuarioId: string,
  ) {
    return this.panel.validarBoletoPorQr(
      cooperativaId,
      codigoQr,
      validadoPorUsuarioId,
    );
  }
}
