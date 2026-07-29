import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CheckoutService } from '../../aplicacion/ventas/checkout.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ReprogramarBoletoDto } from './dto/reprogramar-boleto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayloadToken } from '../../dominio/auth/auth.ports';

@Controller('compras')
export class VentasController {
  constructor(private readonly checkout: CheckoutService) {}

  /** RF-CHECK completo — requiere estar logueado (el comprador es el usuario del token). */
  @UseGuards(JwtAuthGuard)
  @Post()
  async crearCompra(
    @Body() dto: CrearCompraDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.checkout.procesarCompra(
      dto.pasajeros,
      req.user.sub,
      dto.idempotencyKey,
      dto.creditoIdAUsar,
    );
  }

  /**
   * Cancelar un boleto propio — hallazgo real, 22-jul-2026: antes no
   * existía ninguna forma de hacerlo. No procesa reembolso monetario
   * (pagos hoy son simulados); libera el asiento y marca el boleto
   * como cancelado.
   */
  @UseGuards(JwtAuthGuard)
  @Post('boletos/:boletoId/cancelar')
  async cancelarBoleto(
    @Param('boletoId') boletoId: string,
    @Request() req: { user: PayloadToken },
  ) {
    const resultado = await this.checkout.cancelarBoleto(
      boletoId,
      req.user.sub,
    );
    if (!resultado.ok) {
      throw new HttpException(resultado.motivo, HttpStatus.BAD_REQUEST);
    }
    return { ok: true };
  }

  /**
   * Saldo de créditos del pasajero (vacío real de diseño encontrado
   * 29-jul-2026) -- DEBE ir antes de GET ':compraId' en este archivo,
   * si no, esa ruta comodín se lo come a "mis-creditos" como si fuera
   * un id de compra y esta nunca se alcanza.
   */
  @UseGuards(JwtAuthGuard)
  @Get('mis-creditos')
  async listarMisCreditos(@Request() req: { user: PayloadToken }) {
    return this.checkout.listarMisCreditos(req.user.sub);
  }

  /** Recibo completo de una compra propia -- detalle de viaje, pasajeros y pago. */
  @UseGuards(JwtAuthGuard)
  @Get(':compraId')
  async obtenerRecibo(
    @Param('compraId') compraId: string,
    @Request() req: { user: PayloadToken },
  ) {
    const recibo = await this.checkout.obtenerReciboCompra(
      compraId,
      req.user.sub,
    );
    if (!recibo) {
      throw new HttpException('Compra no encontrada.', HttpStatus.NOT_FOUND);
    }
    return recibo;
  }

  /**
   * Reprogramación con crédito (Fase C, 29-jul-2026). El asiento nuevo
   * debe estar bloqueado a nombre de este usuario antes de llamar esto
   * (mismo flujo de checkout normal: bloquear-asiento primero).
   */
  @UseGuards(JwtAuthGuard)
  @Post('boletos/:boletoId/reprogramar')
  async reprogramarBoleto(
    @Param('boletoId') boletoId: string,
    @Body() dto: ReprogramarBoletoDto,
    @Request() req: { user: PayloadToken },
  ) {
    return this.checkout.reprogramarBoleto(
      boletoId,
      dto.nuevoViajeId,
      dto.nuevoNumeroAsiento,
      req.user.sub,
    );
  }
}
