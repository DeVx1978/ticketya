import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  ValidateNested,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * RF-MENOR — autorización de viaje de menor de edad. Solo se exige
 * (en el servicio, no aquí) cuando el pasajero da como resultado
 * "es menor" según esMenorDeEdad() — hallazgo real 22-jul-2026: antes
 * de esto, un menor podía comprar (tarifa 'nino') sin ningún control
 * de acompañamiento real, a pesar de que las tablas ya existían.
 */
class AutorizacionMenorDto {
  @IsIn(['con_padre_madre_tutor', 'con_autorizacion'])
  tipoAcompanamiento!: 'con_padre_madre_tutor' | 'con_autorizacion';

  /** Solo si tipoAcompanamiento = 'con_padre_madre_tutor' — índice (0-based) del adulto en este mismo arreglo de pasajeros. */
  @IsOptional()
  @IsInt()
  adultoAcompananteIndice?: number;

  /** Los siguientes 4 solo aplican si tipoAcompanamiento = 'con_autorizacion'. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  adultoResponsableNombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  adultoResponsableDocumento?: string;

  @IsOptional()
  @IsString()
  adultoResponsableTelefono?: string;

  @IsOptional()
  @IsString()
  documentoAutorizacionUrl?: string;
}

export class PasajeroCheckoutDto {
  @IsUUID()
  viajeId!: string;

  @IsString()
  numeroAsiento!: string;

  @IsString()
  @MinLength(3)
  nombreCompleto!: string;

  @IsString()
  @MinLength(5)
  documento!: string;

  @IsIn(['adulto', 'nino', 'tercera_edad', 'discapacidad'])
  tipoTarifa!: 'adulto' | 'nino' | 'tercera_edad' | 'discapacidad';

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AutorizacionMenorDto)
  autorizacionMenor?: AutorizacionMenorDto;
}

export class CrearCompraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PasajeroCheckoutDto)
  pasajeros!: PasajeroCheckoutDto[];

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  /** Vacío real de diseño encontrado el 29-jul-2026: hasta ahora el crédito de reprogramación solo se generaba, nunca se podía gastar. */
  @IsOptional()
  @IsUUID()
  creditoIdAUsar?: string;

  /**
   * Item 31, Fase 7 (11-ago-2026) -- compra como invitado (sin cuenta).
   * Solo se usan cuando la peticion no trae token (comprador sin
   * cuenta) -- el servicio valida que al menos uno de los 2 este
   * presente en ese caso, porque sin ninguno no hay forma real de
   * contactar al pasajero.
   */
  @IsOptional()
  @IsString()
  telefonoContacto?: string;

  @IsOptional()
  @IsString()
  correoContacto?: string;

  /**
   * Item 31, Fase 7 (11-ago-2026) -- compra como invitado. Debe
   * coincidir con la sesionInvitadoId usada al bloquear los asientos
   * -- si no coincide, el bloqueo no se reconoce como propio.
   */
  @IsOptional()
  @IsString()
  sesionInvitadoId?: string;
}
