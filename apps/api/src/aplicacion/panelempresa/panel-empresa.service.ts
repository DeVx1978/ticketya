import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import type { AlmacenamientoArchivos } from '../../dominio/auth/auth.ports';
import { ALMACENAMIENTO_ARCHIVOS } from '../auth/auth.service';
import { NotificacionesProgramadasService } from '../notificaciones-programadas/notificaciones-programadas.service';
import { GeneradorViajesService } from '../generador-viajes/generador-viajes.service';
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
  DatosNuevoHorarioRuta,
  DatosLegalesCooperativa,
} from '../../dominio/panelempresa/panel-empresa.ports';
import {
  validarDistribucionAsientos,
  calcularEstadoActualizacionDatos,
  type TipoMetodoPago,
} from '../../dominio/panelempresa/panel-empresa.ports';

export const PANEL_EMPRESA_REPOSITORIO = 'PANEL_EMPRESA_REPOSITORIO';

@Injectable()
export class PanelEmpresaService {
  constructor(
    @Inject(PANEL_EMPRESA_REPOSITORIO)
    private readonly panel: PanelEmpresaRepositorio,
    @Inject(ALMACENAMIENTO_ARCHIVOS)
    private readonly almacenamiento: AlmacenamientoArchivos,
    private readonly notificaciones: NotificacionesProgramadasService,
    private readonly generadorViajes: GeneradorViajesService,
  ) {}

  crearTipoVehiculo(cooperativaId: string, datos: DatosNuevoTipoVehiculo) {
    // Vacío real de diseño encontrado el 29-jul-2026 — se valida solo
    // cuando de verdad se está configurando una distribución real. El
    // DTO manda `{}` por defecto cuando el cliente no envía nada
    // (la columna es NOT NULL) — eso NO es un intento de configurar
    // pisos, es el valor de reserva, y no debe rechazarse.
    if (
      datos.distribucionAsientos !== undefined &&
      Object.keys(datos.distribucionAsientos as object).length > 0
    ) {
      const resultado = validarDistribucionAsientos(
        datos.distribucionAsientos,
        datos.capacidadTotal,
      );
      if (!resultado.ok) throw new BadRequestException(resultado.motivo);
    }
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
    // Solo se puede validar la coherencia con la capacidad si ambos
    // valores llegan juntos en la misma edición — si solo se manda
    // distribucionAsientos sin capacidadTotal, no hay con qué
    // comparar sin una consulta extra (fuera del alcance de esta
    // entrega, ver LEEME del mapa de asientos).
    if (
      datos.distribucionAsientos !== undefined &&
      Object.keys(datos.distribucionAsientos as object).length > 0 &&
      datos.capacidadTotal !== undefined
    ) {
      const resultado = validarDistribucionAsientos(
        datos.distribucionAsientos,
        datos.capacidadTotal,
      );
      if (!resultado.ok) throw new BadRequestException(resultado.motivo);
    }
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

  /**
   * 03-ago-2026 -- notifica ANTES de cancelar a propósito: la
   * notificación necesita ver los boletos todavía 'vigente' para saber
   * a quién avisar; después de cancelar ya no los encontraría.
   */
  async cancelarViaje(cooperativaId: string, viajeId: string) {
    await this.notificaciones.notificarCambioOperativo(
      cooperativaId,
      viajeId,
      'Tu viaje fue cancelado. Se generó un crédito por el monto pagado, disponible en tu cuenta.',
    );
    return this.panel.cancelarViaje(cooperativaId, viajeId);
  }

  /**
   * Horarios recurrentes (plantilla) — ítem 7, RF-COOP-002.
   */
  /**
   * Ítem 10, Fase 2 (04-ago-2026) -- bloqueado si la cooperativa lleva
   * 12 meses sin confirmar sus datos legales. Nunca bloquea venta,
   * validación de boletos, ni pagos -- solo esta función y la carga
   * masiva (decisión del director).
   */
  async crearHorarioRuta(cooperativaId: string, datos: DatosNuevoHorarioRuta) {
    await this.verificarNoBloqueadoPorDatos(cooperativaId);
    return this.panel.crearHorarioRuta(cooperativaId, datos);
  }

  listarHorariosRuta(cooperativaId: string, rutaId?: string) {
    return this.panel.listarHorariosRuta(cooperativaId, rutaId);
  }

  actualizarEstadoHorarioRuta(cooperativaId: string, horarioId: string, activo: boolean) {
    return this.panel.actualizarEstadoHorarioRuta(cooperativaId, horarioId, activo);
  }

  /**
   * Cancelación/suspensión masiva — ítem 7. Reutiliza cancelarViaje()
   * de arriba por cada viaje afectado (misma lógica de crédito +
   * notificación + cascada de boletos, sin duplicarla).
   */
  async cancelarViajesMasivo(
    cooperativaId: string,
    rutaId: string,
    fechaInicio: string,
    fechaFin: string,
  ) {
    const viajeIds = await this.panel.listarViajesProgramadosEnRango(
      cooperativaId,
      rutaId,
      fechaInicio,
      fechaFin,
    );

    let viajesCancelados = 0;
    let boletosCancelados = 0;
    for (const viajeId of viajeIds) {
      const resultado = await this.cancelarViaje(cooperativaId, viajeId);
      if (resultado.ok) {
        viajesCancelados++;
        boletosCancelados += resultado.boletosCancelados;
      }
    }

    return { viajesCancelados, boletosCancelados, viajesEncontrados: viajeIds.length };
  }

  async cambiarUnidadViaje(
    cooperativaId: string,
    viajeId: string,
    nuevaUnidadId: string,
  ) {
    const resultado = await this.panel.cambiarUnidadViaje(
      cooperativaId,
      viajeId,
      nuevaUnidadId,
    );
    // RF-NOTIF-003 (03-ago-2026) -- solo se avisa si el cambio se aplicó
    // de verdad, nunca si fue rechazado por regla de negocio (capacidad
    // insuficiente, viaje no programado, etc).
    if (resultado.ok) {
      await this.notificaciones.notificarCambioOperativo(
        cooperativaId,
        viajeId,
        'Se cambió la unidad asignada a tu viaje.',
      );
    }
    return resultado;
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

  /**
   * 04-ago-2026 -- ítem 8: la generación de viajes ya no ocurre dentro
   * del repositorio (ver comentario en panel-empresa.repositorio.drizzle.ts)
   * -- se dispara aquí, después, con el mismo mecanismo que el cron del
   * ítem 7 (GeneradorViajesService), en vez de un camino paralelo más
   * débil que existía antes.
   */
  async importarDatos(cooperativaId: string, datos: DatosImportacion) {
    // Ítem 10, Fase 2 (04-ago-2026) -- mismo bloqueo que crearHorarioRuta.
    await this.verificarNoBloqueadoPorDatos(cooperativaId);

    const resultado = await this.panel.importarDatos(cooperativaId, datos);

    let viajesGenerados = 0;
    if (
      datos.generarViajesDesde &&
      datos.generarViajesHasta &&
      resultado.horarioIds.length > 0
    ) {
      const generado = await this.generadorViajes.generarViajesParaHorarios(
        resultado.horarioIds,
        new Date(`${datos.generarViajesDesde}T00:00:00`),
        new Date(`${datos.generarViajesHasta}T00:00:00`),
      );
      viajesGenerados = generado.generados;
    }

    const { horarioIds: _horarioIds, ...resto } = resultado;
    return { ...resto, viajesGenerados };
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

  obtenerPoliticaCancelacionReprogramacion(cooperativaId: string) {
    return this.panel.obtenerPoliticaCancelacionReprogramacion(cooperativaId);
  }

  actualizarPoliticaCancelacionReprogramacion(
    cooperativaId: string,
    datos: {
      permiteCancelacion?: boolean;
      horasLimiteCancelacion?: number;
      permiteReprogramacion?: boolean;
      horasLimiteReprogramacion?: number;
    },
  ) {
    return this.panel.actualizarPoliticaCancelacionReprogramacion(cooperativaId, datos);
  }

  listarMetodosPago(cooperativaId: string) {
    return this.panel.listarMetodosPago(cooperativaId);
  }

  guardarMetodoPago(
    cooperativaId: string,
    tipo: TipoMetodoPago,
    datosCuenta: Record<string, string>,
    activo: boolean,
  ) {
    return this.panel.guardarMetodoPago(cooperativaId, tipo, datosCuenta, activo);
  }

  eliminarMetodoPago(cooperativaId: string, metodoPagoId: string) {
    return this.panel.eliminarMetodoPago(cooperativaId, metodoPagoId);
  }

  listarCredencialesApi(cooperativaId: string) {
    return this.panel.listarCredencialesApi(cooperativaId);
  }

  crearCredencialApi(cooperativaId: string, webhookUrl: string | null) {
    return this.panel.crearCredencialApi(cooperativaId, webhookUrl);
  }

  rotarCredencialApi(cooperativaId: string, credencialId: string) {
    return this.panel.rotarCredencialApi(cooperativaId, credencialId);
  }

  revocarCredencialApi(cooperativaId: string, credencialId: string) {
    return this.panel.revocarCredencialApi(cooperativaId, credencialId);
  }

  actualizarWebhookCredencialApi(
    cooperativaId: string,
    credencialId: string,
    webhookUrl: string | null,
  ) {
    return this.panel.actualizarWebhookCredencialApi(cooperativaId, credencialId, webhookUrl);
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

  /**
   * Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica
   * obligatoria de datos de cooperativa (sección 3.7 del documento
   * maestro). 6 meses sin confirmar = advertencia (banner en el
   * panel, no bloqueante). 12 meses de silencio total = se bloquea
   * SOLO creación de horarios recurrentes y carga masiva.
   */
  async obtenerEstadoDatosCooperativa(cooperativaId: string) {
    const { ultimaConfirmacion, fechaAfiliacion, datosActuales } =
      await this.panel.obtenerEstadoActualizacionDatos(cooperativaId);
    const estado = calcularEstadoActualizacionDatos(ultimaConfirmacion, fechaAfiliacion);
    return { ...estado, datosActuales };
  }

  async confirmarDatosCooperativa(
    cooperativaId: string,
    datos: Partial<DatosLegalesCooperativa>,
  ) {
    await this.panel.confirmarDatosCooperativa(cooperativaId, datos);
    return { ok: true };
  }

  /**
   * No lanza si no hay suficiente información para evaluar (mismo
   * criterio conservador que calcularEstadoActualizacionDatos): un
   * hueco de datos no debe convertirse en un bloqueo injusto.
   */
  private async verificarNoBloqueadoPorDatos(cooperativaId: string): Promise<void> {
    const { ultimaConfirmacion, fechaAfiliacion } =
      await this.panel.obtenerEstadoActualizacionDatos(cooperativaId);
    const estado = calcularEstadoActualizacionDatos(ultimaConfirmacion, fechaAfiliacion);
    if (estado.estado === 'bloqueado') {
      throw new BadRequestException(
        `Tus datos de cooperativa llevan ${estado.mesesSinConfirmar} meses sin confirmarse. Confirma tus datos legales en la sección de configuración para poder crear horarios recurrentes o usar la carga masiva.`,
      );
    }
  }
}
