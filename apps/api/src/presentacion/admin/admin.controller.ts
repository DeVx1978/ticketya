import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../../aplicacion/admin/admin.service';
import {
  CrearCooperativaDto,
  CrearPuntoOperacionDto,
  ActualizarPuntoOperacionDto,
  ActualizarIvaNacionalDto,
  CrearBannerPropioDto,
  ActualizarBannerPropioDto,
  ActualizarCargoPlataformaDto,
  ActualizarModoIvaBoletoDto,
  CrearAdministradorDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

/**
 * Todo este controller es exclusivo del admin_plataforma/super_admin --
 * RF-ADMIN. Ítem 9, Fase 2 (04-ago-2026): el rol de clase es el nivel
 * COMPARTIDO por defecto (matriz de permisos, sección 3.8 del documento
 * maestro) -- los métodos exclusivos de super_admin lo sobreescriben
 * individualmente con @Roles('super_admin'). RolesGuard hace
 * coincidencia exacta, sin jerarquía -- super_admin no hereda
 * automáticamente lo de admin_plataforma, hay que declarar ambos donde
 * corresponda.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_plataforma', 'super_admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('cooperativas')
  async crearCooperativa(@Body() dto: CrearCooperativaDto) {
    return this.admin.crearCooperativaConPrimerUsuario(
      dto.cooperativa,
      dto.usuario,
    );
  }

  @Get('cooperativas')
  async listarCooperativas() {
    return this.admin.listarCooperativas();
  }

  @Post('puntos-operacion')
  async crearPuntoOperacion(@Body() dto: CrearPuntoOperacionDto) {
    return this.admin.crearPuntoOperacion(dto);
  }

  @Get('puntos-operacion')
  async listarPuntosOperacion() {
    return this.admin.listarPuntosOperacion();
  }

  @Patch('puntos-operacion/:id')
  async actualizarPuntoOperacion(
    @Param('id') id: string,
    @Body() dto: ActualizarPuntoOperacionDto,
  ) {
    await this.admin.actualizarPuntoOperacion(id, dto);
    return { ok: true };
  }

  @Get('dashboard')
  async dashboardNacional() {
    return this.admin.dashboardNacional();
  }

  @Get('iva-nacional')
  async obtenerIvaNacional() {
    return { ivaPorcentaje: await this.admin.obtenerIvaNacional() };
  }

  @Patch('iva-nacional')
  async actualizarIvaNacional(
    @Body() dto: ActualizarIvaNacionalDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.admin.actualizarYPropagarIvaNacional(
      dto.ivaPorcentaje,
      req.user.sub,
    );
  }

  @Get('banners-propios')
  async listarBannersPropios() {
    return this.admin.listarBannersPropios();
  }

  @Post('banners-propios')
  async crearBannerPropio(@Body() dto: CrearBannerPropioDto) {
    return this.admin.crearBannerPropio(dto);
  }

  @Patch('banners-propios/:id')
  async actualizarBannerPropio(
    @Param('id') id: string,
    @Body() dto: ActualizarBannerPropioDto,
  ) {
    await this.admin.actualizarBannerPropio(id, dto);
    return { ok: true };
  }

  @Delete('banners-propios/:id')
  async eliminarBannerPropio(@Param('id') id: string) {
    await this.admin.eliminarBannerPropio(id);
    return { ok: true };
  }

  @Get('cargo-plataforma')
  async obtenerCargoPlataforma() {
    return { monto: await this.admin.obtenerCargoPlataforma() };
  }

  /** Ítem 9 (04-ago-2026) -- exclusivo de super_admin, matriz sección 3.8. */
  @Roles('super_admin')
  @Patch('cargo-plataforma')
  async actualizarCargoPlataforma(
    @Body() dto: ActualizarCargoPlataformaDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.admin.actualizarCargoPlataforma(dto.monto, req.user.sub);
    return { ok: true };
  }

  /** 27-jul-2026 -- editable desde el Panel Admin, sin tocar codigo. */
  @Get('modo-iva-boleto')
  async obtenerModoIvaBoleto() {
    return { modo: await this.admin.obtenerModoIvaBoleto() };
  }

  /** Ítem 9 (04-ago-2026) -- exclusivo de super_admin, matriz sección 3.8. */
  @Roles('super_admin')
  @Patch('modo-iva-boleto')
  async actualizarModoIvaBoleto(
    @Body() dto: ActualizarModoIvaBoletoDto,
    @Request() req: { user: PayloadToken },
  ) {
    await this.admin.actualizarModoIvaBoleto(dto.modo, req.user.sub);
    return { ok: true };
  }

  /** 02-ago-2026 -- RF-ADMIN sección 3.13, contador de usuarios por rol. */
  @Get('usuarios/contador')
  async contarUsuariosPorRol() {
    return this.admin.contarUsuariosPorRol();
  }

  /**
   * Ítem 9, Fase 2 (04-ago-2026) -- exclusivo de super_admin, matriz de
   * permisos sección 3.8 del documento maestro.
   */
  @Roles('super_admin')
  @Post('administradores')
  async crearAdministrador(
    @Body() dto: CrearAdministradorDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.admin.crearAdministrador(dto, req.user.sub);
  }

  /** Compartido -- ver un admin de menor rango no es tan sensible como crearlo o eliminarlo. */
  @Get('administradores')
  async listarAdministradores() {
    return this.admin.listarAdministradores();
  }

  @Roles('super_admin')
  @Delete('administradores/:id')
  async eliminarAdministrador(
    @Param('id') id: string,
    @Request() req: { user: PayloadToken },
  ) {
    await this.admin.eliminarAdministrador(id, req.user.sub);
    return { ok: true };
  }

  /**
   * Baja lógica, NO eliminación física -- ver comentario completo en
   * admin.ports.ts. Exclusivo de super_admin.
   */
  @Roles('super_admin')
  @Delete('cooperativas/:id')
  async eliminarCooperativa(
    @Param('id') id: string,
    @Request() req: { user: PayloadToken },
  ) {
    await this.admin.eliminarCooperativa(id, req.user.sub);
    return { ok: true };
  }
}
