import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import {
  CheckoutService,
  COMPRA_REPOSITORIO,
  PASARELA_PAGO,
} from '../../aplicacion/ventas/checkout.service';
import { CompraRepositorioDrizzle } from '../../infraestructura/ventas/compra.repositorio.drizzle';
import { SimuladorPasarelaPago } from '../../infraestructura/pagos/simulador.pasarela';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VentasController],
  providers: [
    CheckoutService,
    { provide: COMPRA_REPOSITORIO, useClass: CompraRepositorioDrizzle },
    { provide: PASARELA_PAGO, useClass: SimuladorPasarelaPago },
  ],
  exports: [CheckoutService],
})
export class VentasModule {}
