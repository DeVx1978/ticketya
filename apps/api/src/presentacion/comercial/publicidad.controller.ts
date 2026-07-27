import { Body, Controller, Post } from '@nestjs/common';
import { ComercialService } from '../../aplicacion/comercial/comercial.service';
import { CrearLeadDto } from './dto/comercial.dto';

/** Endpoint publico, sin login -- captacion de leads de anunciantes (RF-COMM-003). */
@Controller('publicidad')
export class PublicidadController {
  constructor(private readonly comercial: ComercialService) {}

  @Post('leads')
  async crearLead(@Body() dto: CrearLeadDto) {
    return this.comercial.crearLead(dto);
  }
}
