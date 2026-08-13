import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  IsBoolean,
  Matches,
  ValidateNested,
  MinLength,
  ArrayMinSize,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { esDocumentoValido } from '../../../dominio/ventas/validadores-documento';

/**
 * Item 31.1, Fase 7 (13-ago-2026) -- el numero de documento se valida
 * distinto segun el tipo declarado (cedula: algoritmo real Modulo 10;
 * pasaporte: formato mas ligero) -- necesita leer el campo hermano
 * tipoDocumento, por eso es un validador de clase, no un decorador
 * simple como @Matches.
 */
@ValidatorConstraint({ name: 'esDocumentoValidoSegunTipo', async: false })
class EsDocumentoValidoSegunTipoConstraint implements ValidatorConstraintInterface {
  validate(documento: string, args: ValidationArguments): boolean {
    const objeto = args.object as { tipoDocumento?: 'cedula' | 'pasaporte' };
    if (!objeto.tipoDocumento) return false;
    return esDocumentoValido(documento, objeto.tipoDocumento);
  }

  defaultMessage(args: ValidationArguments): string {
    const objeto = args.object as { tipoDocumento?: 'cedula' | 'pasaporte' };
    return objeto.tipoDocumento === 'cedula'
      ? 'El numero de cedula no es valido (verifica los digitos).'
      : 'El numero de pasaporte no tiene un formato valido.';
  }
}

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

  /** Item 31.1 -- formato movil ecuatoriano real (10 digitos, empieza con 09). */
  @IsOptional()
  @IsString()
  @Matches(/^09\d{8}$/, { message: 'El telefono debe ser un numero movil ecuatoriano valido (10 digitos, empieza con 09).' })
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

  /** Item 31.1, Fase 7 (13-ago-2026) -- separado en 2 campos reales (antes nombreCompleto). */
  @IsString()
  @MinLength(2)
  nombres!: string;

  @IsString()
  @MinLength(2)
  apellidos!: string;

  /** Selector explicito -- confirmado con FlixBus que ambos son documentos validos reales. */
  @IsIn(['cedula', 'pasaporte'])
  tipoDocumento!: 'cedula' | 'pasaporte';

  @IsString()
  @Validate(EsDocumentoValidoSegunTipoConstraint)
  documento!: string;

  @IsIn(['adulto', 'nino', 'tercera_edad', 'discapacidad'])
  tipoTarifa!: 'adulto' | 'nino' | 'tercera_edad' | 'discapacidad';

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  /** LOTTTSV Art. 48 -- atencion preferente, NO es un descuento (no toca tipoTarifa ni el precio). */
  @IsOptional()
  @IsBoolean()
  esEmbarazada?: boolean;

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
  /** Item 31.1 -- formato movil ecuatoriano real (10 digitos, empieza con 09). */
  @IsOptional()
  @IsString()
  @Matches(/^09\d{8}$/, { message: 'El telefono debe ser un numero movil ecuatoriano valido (10 digitos, empieza con 09).' })
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
