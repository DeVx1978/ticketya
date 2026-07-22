import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../../aplicacion/admin/admin.service';
import {
  CrearCooperativaDto,
  CrearPuntoOperacionDto,
  ActualizarIvaNacionalDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

/** Todo este controller es exclusivo del admin_plataforma — RF-ADMIN. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_plataforma')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** RF-ADMIN-001 — alta de cooperativa + su primer usuario administrador. */
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

  /** RF-ADMIN-002 — dashboard nacional agregado de todas las cooperativas. */
  @Get('dashboard')
  async dashboardNacional() {
    return this.admin.dashboardNacional();
  }

  /** IVA nacional — valor que se propaga a las cooperativas en modo automático (21-jul-2026). */
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
}
