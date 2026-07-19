import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CheckoutService } from '../../aplicacion/ventas/checkout.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

@Controller('compras')
export class VentasController {
  constructor(private readonly checkout: CheckoutService) {}

  /** RF-CHECK completo — requiere estar logueado (el comprador es el usuario del token). */
  @UseGuards(JwtAuthGuard)
  @Post()
  async crearCompra(@Body() dto: CrearCompraDto, @Request() req: { user: PayloadToken }) {
    return this.checkout.procesarCompra(dto.pasajeros, req.user.sub, dto.idempotencyKey);
  }
}
