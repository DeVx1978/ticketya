import { Controller, Get, Query } from '@nestjs/common';
import { BusquedaService } from '../../aplicacion/busqueda/busqueda.service';
import { BuscarViajesDto } from './dto/buscar-viajes.dto';
import { BuscarPuntosOperacionDto } from './dto/buscar-puntos-operacion.dto';

@Controller()
export class BusquedaController {
  constructor(private readonly busqueda: BusquedaService) {}

  /** RF-BUS-002 */
  @Get('puntos-operacion/buscar')
  async buscarPuntosOperacion(@Query() query: BuscarPuntosOperacionDto) {
    return this.busqueda.buscarPuntosOperacion(query.texto);
  }

  /** RF-BUS-001, RF-BUS-003, RF-BUS-006 */
  @Get('viajes/buscar')
  async buscarViajes(@Query() query: BuscarViajesDto) {
    return this.busqueda.buscarViajes(
      query.origenId,
      query.destinoId,
      query.fecha,
      query.pasajeros ?? 1,
    );
  }
}
