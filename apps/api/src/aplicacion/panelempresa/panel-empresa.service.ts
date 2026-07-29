import { Inject, Injectable } from '@nestjs/common';
import type { AlmacenamientoArchivos } from '../../dominio/auth/auth.ports';
import { ALMACENAMIENTO_ARCHIVOS } from '../auth/auth.service';
import type {
  PanelEmpresaRepositorio,
  DatosNuevoTipoVehiculo,
  DatosNuevaUnidad,
  DatosEditarTipoVehiculo,
  DatosEditarRuta,
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
    @Inject(ALMACENAMIENTO_ARCHIVOS)
    private readonly almacenamiento: AlmacenamientoArchivos,
  ) {}

  crearTipoVehiculo(cooperativaId: string, datos: DatosNuevoTipoVehiculo) {
    return this.panel.crearTipoVehiculo(cooperativaId, datos);
  }

  listarTiposVehiculo(cooperativaId: string) {
    return this.panel.listarTiposVehiculo(cooperativaId);
  }

  editarTipoVehiculo(
    cooperativaId: string,
    tipoVehiculoId: string,
    datos: DatosEditarTipoVehiculo,
  ) {
    return this.panel.editarTipoVehiculo(cooperativaId, tipoVehiculoId, datos);
  }

  crearUnidad(cooperativaId: string, datos: DatosNuevaUnidad) {
    return this.panel.crearUnidad(cooperativaId, datos);
  }

  listarUnidades(cooperativaId: string) {
    return this.panel.listarUnidades(cooperativaId);
  }

  actualizarEstadoUnidad(
    cooperativaId: string,
    unidadId: string,
    activo: boolean,
  ) {
    return this.panel.actualizarEstadoUnidad(cooperativaId, unidadId, activo);
  }

  crearRuta(cooperativaId: string, datos: DatosNuevaRuta) {
    return this.panel.crearRuta(cooperativaId, datos);
  }

  listarRutas(cooperativaId: string) {
    return this.panel.listarRutas(cooperativaId);
  }

  editarRuta(cooperativaId: string, rutaId: string, datos: DatosEditarRuta) {
    return this.panel.editarRuta(cooperativaId, rutaId, datos);
  }

  crearViaje(cooperativaId: string, datos: DatosNuevoViaje) {
    return this.panel.crearViaje(cooperativaId, datos);
  }

  listarViajes(cooperativaId: string) {
    return this.panel.listarViajes(cooperativaId);
  }

  cancelarViaje(cooperativaId: string, viajeId: string) {
    return this.panel.cancelarViaje(cooperativaId, viajeId);
  }

  cambiarUnidadViaje(
    cooperativaId: string,
    viajeId: string,
    nuevaUnidadId: string,
  ) {
    return this.panel.cambiarUnidadViaje(cooperativaId, viajeId, nuevaUnidadId);
  }

  editarViaje(
    cooperativaId: string,
    viajeId: string,
    datos: { horaSalidaProgramada?: string; precioBase?: number },
  ) {
    return this.panel.editarViaje(cooperativaId, viajeId, datos);
  }

  listarPasajerosDeViaje(cooperativaId: string, viajeId: string) {
    return this.panel.listarPasajerosDeViaje(cooperativaId, viajeId);
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

  async subirLogoCooperativa(
    cooperativaId: string,
    buffer: Buffer,
    nombreOriginal: string,
  ) {
    const resultado = await this.almacenamiento.guardarImagen(
      buffer,
      nombreOriginal,
      'logos',
    );
    await this.panel.actualizarPerfil(cooperativaId, { logoUrl: resultado.url });
    return { url: resultado.url };
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

  obtenerHorasLimiteReprogramacion(cooperativaId: string) {
    return this.panel.obtenerHorasLimiteReprogramacion(cooperativaId);
  }

  actualizarHorasLimiteReprogramacion(cooperativaId: string, horas: number) {
    return this.panel.actualizarHorasLimiteReprogramacion(cooperativaId, horas);
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
