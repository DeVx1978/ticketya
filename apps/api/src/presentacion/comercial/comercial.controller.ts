import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ComercialService } from '../../aplicacion/comercial/comercial.service';
import {
  CrearEspacioPublicitarioDto,
  CrearPlanComercialDto,
} from './dto/comercial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

/** RF-COMM -- gestion comercial/publicitaria, exclusiva de admin_plataforma. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_plataforma')
@Controller('admin')
export class ComercialController {
  constructor(private readonly comercial: ComercialService) {}

  @Post('espacios-publicitarios')
  async crearEspacioPublicitario(@Body() dto: CrearEspacioPublicitarioDto) {
    return this.comercial.crearEspacioPublicitario(dto);
  }

  @Get('espacios-publicitarios')
  async listarEspaciosPublicitarios() {
    return this.comercial.listarEspaciosPublicitarios();
  }

  @Post('planes-comerciales')
  async crearPlanComercial(@Body() dto: CrearPlanComercialDto) {
    return this.comercial.crearPlanComercial(dto);
  }

  @Get('planes-comerciales')
  async listarPlanesComerciales() {
    return this.comercial.listarPlanesComerciales();
  }
}
