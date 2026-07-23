import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PanelEmpresaService } from '../../aplicacion/panelempresa/panel-empresa.service';
import {
  CrearTipoVehiculoDto,
  CrearUnidadDto,
  CrearRutaDto,
  CrearViajeDto,
  CrearUsuarioStaffDto,
  CrearConductorDto,
  ImportarDatosDto,
  ValidarQrDto,
  CambiarUnidadViajeDto,
  EditarViajeDto,
  ActualizarEstadoUnidadDto,
  VerificarMenorDto,
  ActualizarConfiguracionFiscalDto,
  ActualizarPerfilDto,
} from './dto/panel-empresa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

/**
 * La cooperativa del usuario sale SIEMPRE de su propio token firmado
 * (nunca de un parámetro que el cliente podría manipular) — así un
 * admin_cooperativa físicamente no puede operar sobre otra cooperativa
 * aunque lo intente, sin necesidad de validarlo caso por caso.
 */
function cooperativaDelToken(user: PayloadToken): string {
  if (!user.cooperativaId) {
    throw new ForbiddenException(
      'Este usuario no pertenece a ninguna cooperativa.',
    );
  }
  return user.cooperativaId;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coop')
export class PanelEmpresaController {
  constructor(private readonly panel: PanelEmpresaService) {}

  @Roles('admin_cooperativa')
  @Post('tipos-vehiculo')
  async crearTipoVehiculo(
    @Body() dto: CrearTipoVehiculoDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearTipoVehiculo(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa', 'vendedor')
  @Get('tipos-vehiculo')
  async listarTiposVehiculo(@Request() req: { user: PayloadToken }) {
    return this.panel.listarTiposVehiculo(cooperativaDelToken(req.user));
  }

  @Roles('admin_cooperativa')
  @Post('unidades')
  async crearUnidad(
    @Body() dto: CrearUnidadDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearUnidad(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa', 'vendedor')
  @Get('unidades')
  async listarUnidades(@Request() req: { user: PayloadToken }) {
    return this.panel.listarUnidades(cooperativaDelToken(req.user));
  }

  /** Activar/desactivar una unidad — hallazgo cerrado 22-jul-2026. */
  @Roles('admin_cooperativa')
  @Patch('unidades/:unidadId/estado')
  async actualizarEstadoUnidad(
    @Param('unidadId') unidadId: string,
    @Body() dto: ActualizarEstadoUnidadDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.panel.actualizarEstadoUnidad(
      cooperativaDelToken(req.user),
      unidadId,
      dto.activo,
    );
    return { ok: true };
  }

  @Roles('admin_cooperativa')
  @Post('rutas')
  async crearRuta(
    @Body() dto: CrearRutaDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearRuta(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa', 'vendedor')
  @Get('rutas')
  async listarRutas(@Request() req: { user: PayloadToken }) {
    return this.panel.listarRutas(cooperativaDelToken(req.user));
  }

  @Roles('admin_cooperativa')
  @Post('viajes')
  async crearViaje(
    @Body() dto: CrearViajeDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearViaje(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa', 'vendedor')
  @Get('viajes')
  async listarViajes(@Request() req: { user: PayloadToken }) {
    return this.panel.listarViajes(cooperativaDelToken(req.user));
  }

  /** Cancelar un viaje completo (cascada a sus boletos) — hallazgo cerrado 22-jul-2026. Solo el admin, no el vendedor. */
  @Roles('admin_cooperativa')
  @Post('viajes/:viajeId/cancelar')
  async cancelarViaje(
    @Param('viajeId') viajeId: string,
    @Request() req: { user: PayloadToken },
  ) {
    const resultado = await this.panel.cancelarViaje(
      cooperativaDelToken(req.user),
      viajeId,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return resultado;
  }

  /**
   * Cambiar la unidad de un viaje ya programado — "vehículo de
   * reemplazo" (investigado y confirmado 22-jul-2026, ver comentario
   * completo en panel-empresa.ports.ts). No toca boletos ni asientos.
   */
  @Roles('admin_cooperativa')
  @Patch('viajes/:viajeId/unidad')
  async cambiarUnidadViaje(
    @Param('viajeId') viajeId: string,
    @Body() dto: CambiarUnidadViajeDto,
    @Request() req: { user: PayloadToken },
  ) {
    const resultado = await this.panel.cambiarUnidadViaje(
      cooperativaDelToken(req.user),
      viajeId,
      dto.nuevaUnidadId,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return resultado;
  }

  /** Editar hora/precio de un viaje sin boletos vendidos — hallazgo cerrado 22-jul-2026. */
  @Roles('admin_cooperativa')
  @Patch('viajes/:viajeId')
  async editarViaje(
    @Param('viajeId') viajeId: string,
    @Body() dto: EditarViajeDto,
    @Request() req: { user: PayloadToken },
  ) {
    const resultado = await this.panel.editarViaje(
      cooperativaDelToken(req.user),
      viajeId,
      dto,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return resultado;
  }

  /** Lista de pasajeros de un viaje ("manifiesto") — hallazgo cerrado 22-jul-2026. */
  @Roles('admin_cooperativa', 'vendedor')
  @Get('viajes/:viajeId/pasajeros')
  async listarPasajerosDeViaje(
    @Param('viajeId') viajeId: string,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.listarPasajerosDeViaje(
      cooperativaDelToken(req.user),
      viajeId,
    );
  }

  /** RF-COOP-007 — múltiples usuarios por cooperativa con permisos diferenciados. */
  @Roles('admin_cooperativa')
  @Post('usuarios')
  async crearUsuarioStaff(
    @Body() dto: CrearUsuarioStaffDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearUsuarioStaff(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Get('usuarios')
  async listarUsuariosStaff(@Request() req: { user: PayloadToken }) {
    return this.panel.listarUsuariosStaff(cooperativaDelToken(req.user));
  }

  @Roles('admin_cooperativa')
  @Post('conductores')
  async crearConductor(
    @Body() dto: CrearConductorDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.crearConductor(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Get('conductores')
  async listarConductores(@Request() req: { user: PayloadToken }) {
    return this.panel.listarConductores(cooperativaDelToken(req.user));
  }

  /**
   * Carga masiva de rutas/horarios/flota/conductores — pensado para
   * cuando una cooperativa ya tiene toda esta información en su propio
   * sistema y necesita subirla de una sola vez, en vez de crear cada
   * recurso uno por uno a mano.
   */
  @Roles('admin_cooperativa')
  @Post('importar')
  async importarDatos(
    @Body() dto: ImportarDatosDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.importarDatos(cooperativaDelToken(req.user), dto as any);
  }

  /** RF-COOP-004 */
  @Roles('admin_cooperativa')
  @Get('dashboard')
  async dashboard(@Request() req: { user: PayloadToken }) {
    return this.panel.dashboardVentasDelDia(cooperativaDelToken(req.user));
  }

  /** Perfil visual de la cooperativa — hoy solo el logo (22-jul-2026). */
  @Roles('admin_cooperativa')
  @Get('perfil')
  async obtenerPerfil(@Request() req: { user: PayloadToken }) {
    return this.panel.obtenerPerfil(cooperativaDelToken(req.user));
  }

  @Roles('admin_cooperativa')
  @Patch('perfil')
  async actualizarPerfil(
    @Body() dto: ActualizarPerfilDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.panel.actualizarPerfil(cooperativaDelToken(req.user), {
      logoUrl: dto.logoUrl && dto.logoUrl.trim() !== '' ? dto.logoUrl : null,
    });
    return { ok: true };
  }

  /** IVA de la cooperativa — solo el admin puede verla/cambiarla (21-jul-2026). */
  @Roles('admin_cooperativa')
  @Get('configuracion-fiscal')
  async obtenerConfiguracionFiscal(@Request() req: { user: PayloadToken }) {
    return this.panel.obtenerConfiguracionFiscal(cooperativaDelToken(req.user));
  }

  @Roles('admin_cooperativa')
  @Patch('configuracion-fiscal')
  async actualizarConfiguracionFiscal(
    @Body() dto: ActualizarConfiguracionFiscalDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.panel.actualizarConfiguracionFiscal(
      cooperativaDelToken(req.user),
      dto,
    );
    return { ok: true };
  }

  /** RF-COOP-006 — tanto el vendedor como el admin pueden validar boletos en el andén. */
  @Roles('vendedor', 'admin_cooperativa')
  @Post('validar-qr')
  async validarQr(
    @Body() dto: ValidarQrDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.panel.validarBoletoPorQr(
      cooperativaDelToken(req.user),
      dto.codigoQr,
      req.user.sub,
    );
  }

  /** RF-MENOR-004 — verificación de documentos del menor en abordaje (22-jul-2026). */
  @Roles('vendedor', 'admin_cooperativa')
  @Post('verificar-menor')
  async verificarMenor(
    @Body() dto: VerificarMenorDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.panel.verificarMenor(
      cooperativaDelToken(req.user),
      dto.boletoId,
      req.user.sub,
      dto.documentoIdentidadVerificado,
      dto.documentoAutorizacionVerificado,
    );
    return { ok: true };
  }
}
