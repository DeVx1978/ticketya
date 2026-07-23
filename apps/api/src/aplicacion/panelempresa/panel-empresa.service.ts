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

  listarUsuariosStaff(cooperativaId: string) {
    return this.panel.listarUsuariosStaff(cooperativaId);
  }

  crearConductor(cooperativaId: string, datos: DatosNuevoConductor) {
    return this.panel.crearConductor(cooperativaId, datos);
  }

  listarConductores(cooperativaId: string) {
    return this.panel.listarConductores(cooperativaId);
  }

  importarDatos(cooperativaId: string, datos: DatosImportacion) {
    return this.panel.importarDatos(cooperativaId, datos);
  }

  dashboardVentasDelDia(cooperativaId: string) {
    return this.panel.dashboardVentasDelDia(cooperativaId);
  }

  obtenerPerfil(cooperativaId: string) {
    return this.panel.obtenerPerfil(cooperativaId);
  }

  actualizarPerfil(cooperativaId: string, datos: { logoUrl: string | null }) {
    return this.panel.actualizarPerfil(cooperativaId, datos);
  }

  obtenerConfiguracionFiscal(cooperativaId: string) {
    return this.panel.obtenerConfiguracionFiscal(cooperativaId);
  }

  actualizarConfiguracionFiscal(
    cooperativaId: string,
    datos: {
      ivaPorcentaje: number;
      ivaVisibleEnBoleto: boolean;
      ivaSigueTasaNacional: boolean;
    },
  ) {
    return this.panel.actualizarConfiguracionFiscal(cooperativaId, datos);
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

  verificarMenor(
    cooperativaId: string,
    boletoId: string,
    verificadoPorUsuarioId: string,
    documentoIdentidadVerificado: boolean,
    documentoAutorizacionVerificado: boolean,
  ) {
    return this.panel.verificarMenor(
      cooperativaId,
      boletoId,
      verificadoPorUsuarioId,
      documentoIdentidadVerificado,
      documentoAutorizacionVerificado,
    );
  }
}
