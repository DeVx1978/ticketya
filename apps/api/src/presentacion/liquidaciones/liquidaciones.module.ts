import { Module } from '@nestjs/common';
import { LiquidacionesController } from './liquidaciones.controller';
import {
  LiquidacionesService,
  LIQUIDACIONES_REPOSITORIO,
} from '../../aplicacion/liquidaciones/liquidaciones.service';
import { LiquidacionesRepositorioDrizzle } from '../../infraestructura/liquidaciones/liquidaciones.repositorio.drizzle';

@Module({
  controllers: [LiquidacionesController],
  providers: [
    LiquidacionesService,
    { provide: LIQUIDACIONES_REPOSITORIO, useClass: LiquidacionesRepositorioDrizzle },
  ],
})
export class LiquidacionesModule {}
