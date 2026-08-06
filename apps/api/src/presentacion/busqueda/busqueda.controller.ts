import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { BusquedaService } from '../../aplicacion/busqueda/busqueda.service';
import { BuscarViajesDto } from './dto/buscar-viajes.dto';
import { BuscarPuntosOperacionDto } from './dto/buscar-puntos-operacion.dto';

/** Ítem 11 (04-ago-2026) -- catálogo cerrado, mismo que enums.ts amenidadEnum. */
const AMENIDADES_VALIDAS = [
  'wifi',
  'aire_acondicionado',
  'bano_a_bordo',
  'cargadores',
  'asientos_reclinables',
  'tv',
];

@Controller()
export class BusquedaController {
  constructor(private readonly busqueda: BusquedaService) {}

  /** RF-BUS-002 */
  @Get('puntos-operacion/buscar')
  async buscarPuntosOperacion(@Query() query: BuscarPuntosOperacionDto) {
    return this.busqueda.buscarPuntosOperacion(query.texto);
  }

  /** RF-BUS-001, RF-BUS-003, RF-BUS-006 -- ítem 11 agrega filtros de hora, tipo de vehículo y amenidades. */
  @Get('viajes/buscar')
  async buscarViajes(@Query() query: BuscarViajesDto) {
    const amenidades = query.amenidades
      ? query.amenidades.split(',').map((a) => a.trim())
      : undefined;

    if (amenidades) {
      const invalida = amenidades.find((a) => !AMENIDADES_VALIDAS.includes(a));
      if (invalida) {
        throw new BadRequestException(
          `"${invalida}" no es una amenidad válida. Valores permitidos: ${AMENIDADES_VALIDAS.join(', ')}.`,
        );
      }
    }

    return this.busqueda.buscarViajes({
      origenId: query.origenId,
      destinoId: query.destinoId,
      fecha: query.fecha,
      pasajerosMinimos: query.pasajeros ?? 1,
      horaDesde: query.horaDesde,
      horaHasta: query.horaHasta,
      tipoVehiculoId: query.tipoVehiculoId,
      amenidades,
    });
  }

  /** Banners propios activos, para la portada — sin autenticación (22-jul-2026). */
  @Get('banners-propios')
  async listarBannersActivos() {
    return this.busqueda.listarBannersActivos();
  }

  /**
   * Ítem 16, Fase 2 (05-ago-2026) -- seguimiento GPS en vivo, consulta
   * pública sin autenticación. null si el viaje no tiene GPS conectado
   * todavía (bloqueo externo de hardware, no de código).
   */
  @Get('viajes/:id/ubicacion')
  async obtenerUbicacionViaje(@Param('id') viajeId: string) {
    return this.busqueda.obtenerUbicacionViaje(viajeId);
  }
}
