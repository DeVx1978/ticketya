import { Module } from '@nestjs/common';
import {
  GeneradorViajesService,
  GENERADOR_VIAJES_REPOSITORIO,
} from '../../aplicacion/generador-viajes/generador-viajes.service';
import { GeneradorViajesRepositorioDrizzle } from '../../infraestructura/generador-viajes/generador-viajes.repositorio.drizzle';

@Module({
  providers: [
    GeneradorViajesService,
    { provide: GENERADOR_VIAJES_REPOSITORIO, useClass: GeneradorViajesRepositorioDrizzle },
  ],
})
export class GeneradorViajesModule {}
