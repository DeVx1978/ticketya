import { Body, Controller, Get, Post, Request, UseGuards, ForbiddenException } from '@nestjs/common';
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
    throw new ForbiddenException('Este usuario no pertenece a ninguna cooperativa.');
  }
  return user.cooperativaId;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coop')
export class PanelEmpresaController {
  constructor(private readonly panel: PanelEmpresaService) {}

  @Roles('admin_cooperativa')
  @Post('tipos-vehiculo')
  async crearTipoVehiculo(@Body() dto: CrearTipoVehiculoDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearTipoVehiculo(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Post('unidades')
  async crearUnidad(@Body() dto: CrearUnidadDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearUnidad(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Post('rutas')
  async crearRuta(@Body() dto: CrearRutaDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearRuta(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Post('viajes')
  async crearViaje(@Body() dto: CrearViajeDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearViaje(cooperativaDelToken(req.user), dto);
  }

  /** RF-COOP-007 — múltiples usuarios por cooperativa con permisos diferenciados. */
  @Roles('admin_cooperativa')
  @Post('usuarios')
  async crearUsuarioStaff(@Body() dto: CrearUsuarioStaffDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearUsuarioStaff(cooperativaDelToken(req.user), dto);
  }

  @Roles('admin_cooperativa')
  @Post('conductores')
  async crearConductor(@Body() dto: CrearConductorDto, @Request() req: { user: PayloadToken }) {
    return this.panel.crearConductor(cooperativaDelToken(req.user), dto);
  }

  /**
   * Carga masiva de rutas/horarios/flota/conductores — pensado para
   * cuando una cooperativa ya tiene toda esta información en su propio
   * sistema y necesita subirla de una sola vez, en vez de crear cada
   * recurso uno por uno a mano.
   */
  @Roles('admin_cooperativa')
  @Post('importar')
  async importarDatos(@Body() dto: ImportarDatosDto, @Request() req: { user: PayloadToken }) {
    return this.panel.importarDatos(cooperativaDelToken(req.user), dto as any);
  }

  /** RF-COOP-004 */
  @Roles('admin_cooperativa')
  @Get('dashboard')
  async dashboard(@Request() req: { user: PayloadToken }) {
    return this.panel.dashboardVentasDelDia(cooperativaDelToken(req.user));
  }

  /** RF-COOP-006 — tanto el vendedor como el admin pueden validar boletos en el andén. */
  @Roles('vendedor', 'admin_cooperativa')
  @Post('validar-qr')
  async validarQr(@Body() dto: ValidarQrDto, @Request() req: { user: PayloadToken }) {
    return this.panel.validarBoletoPorQr(cooperativaDelToken(req.user), dto.codigoQr, req.user.sub);
  }
}
