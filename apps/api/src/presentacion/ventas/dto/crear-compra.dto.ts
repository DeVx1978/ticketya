import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class PasajeroCheckoutDto {
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
}
