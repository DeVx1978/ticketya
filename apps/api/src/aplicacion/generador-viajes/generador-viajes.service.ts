import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { GeneradorViajesRepositorio } from '../../dominio/generador-viajes/generador-viajes.ports';

export const GENERADOR_VIAJES_REPOSITORIO = 'GENERADOR_VIAJES_REPOSITORIO';

/** Genera viajes para los próximos N días -- suficiente margen para que la cooperativa vea y ajuste antes de que se vendan boletos. */
const DIAS_HACIA_ADELANTE = 21;

@Injectable()
export class GeneradorViajesService {
  private readonly logger = new Logger(GeneradorViajesService.name);

  constructor(
    @Inject(GENERADOR_VIAJES_REPOSITORIO)
    private readonly repo: GeneradorViajesRepositorio,
  ) {}

  /**
   * Corre una vez al día. Por cada plantilla activa, revisa los
   * próximos 21 días y crea el viaje SOLO si todavía no existe uno para
   * esa combinación (horario, fecha) -- nunca hace UPDATE, así que una
   * edición manual de un viaje ya generado queda intacta para siempre.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generarViajesPendientes(): Promise<void> {
    const horarios = await this.repo.listarHorariosActivos();
    let generados = 0;
    let saltadosSinUnidad = 0;

    for (const horario of horarios) {
      const unidad = await this.repo.buscarUnidadDisponible(
        horario.cooperativaId,
        horario.tipoVehiculoPredeterminadoId,
      );
      if (!unidad) {
        saltadosSinUnidad++;
        this.logger.warn(
          `Horario ${horario.id}: no hay ninguna unidad activa del tipo ${horario.tipoVehiculoPredeterminadoId} -- se salta hasta que la cooperativa active una.`,
        );
        continue;
      }

      for (let i = 0; i < DIAS_HACIA_ADELANTE; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + i);
        const diaSemana = fecha.getDay(); // 0=domingo..6=sábado
        if (!horario.diasSemana.includes(diaSemana)) continue;

        const fechaStr = fecha.toISOString().slice(0, 10);
        const yaExiste = await this.repo.existeViajeParaHorarioYFecha(horario.id, fechaStr);
        if (yaExiste) continue; // ya generado antes, o editado/creado a mano -- nunca se toca

        // Ecuador no tiene horario de verano -- desfase fijo -05:00, mismo criterio que la carga masiva.
        const horaSalidaCompleta = `${fechaStr}T${horario.horaSalida}:00-05:00`;

        await this.repo.crearViajeDesdeHorario({
          cooperativaId: horario.cooperativaId,
          rutaId: horario.rutaId,
          unidadId: unidad.unidadId,
          horarioRutaOrigenId: horario.id,
          fechaSalida: fechaStr,
          horaSalidaProgramada: horaSalidaCompleta,
          precioBase: horario.precioBaseReferencia,
        });
        generados++;
      }
    }

    if (generados > 0 || saltadosSinUnidad > 0) {
      this.logger.log(
        `Generación de viajes: ${generados} creados, ${saltadosSinUnidad} plantilla(s) sin unidad disponible.`,
      );
    }
  }
}
