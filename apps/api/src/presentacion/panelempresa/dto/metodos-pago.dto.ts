import { IsIn, IsBoolean, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Métodos de pago manuales (29-jul-2026) — mientras no hay pasarela
 * real conectada, cada cooperativa configura los que ya usa hoy en
 * Ecuador con sus propios datos para recibir el pago.
 */
export class GuardarMetodoPagoDto {
  @IsIn(['transferencia_bancaria', 'efectivo', 'deuna', 'payphone', 'tarjeta_pasarela'])
  tipo!: 'transferencia_bancaria' | 'efectivo' | 'deuna' | 'payphone' | 'tarjeta_pasarela';

  @IsObject()
  datosCuenta!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class SubirComprobanteDto {
  @IsUUID()
  compraId!: string;
}

export class ConfirmarPagoManualDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
