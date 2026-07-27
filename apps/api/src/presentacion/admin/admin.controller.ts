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
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

/** Todo este controller es exclusivo del admin_plataforma -- RF-ADMIN. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_plataforma')
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

  @Patch('cargo-plataforma')
  async actualizarCargoPlataforma(@Body() dto: ActualizarCargoPlataformaDto) {
    await this.admin.actualizarCargoPlataforma(dto.monto);
    return { ok: true };
  }

  /** 27-jul-2026 -- editable desde el Panel Admin, sin tocar codigo. */
  @Get('modo-iva-boleto')
  async obtenerModoIvaBoleto() {
    return { modo: await this.admin.obtenerModoIvaBoleto() };
  }

  @Patch('modo-iva-boleto')
  async actualizarModoIvaBoleto(@Body() dto: ActualizarModoIvaBoletoDto) {
    await this.admin.actualizarModoIvaBoleto(dto.modo);
    return { ok: true };
  }
}
