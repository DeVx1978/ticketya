import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DatosCooperativaDto {
  @IsString()
  @MinLength(10)
  ruc!: string;

  @IsString()
  @MinLength(3)
  razonSocial!: string;

  @IsString()
  @MinLength(3)
  nombreComercial!: string;

  @IsIn(['modelo_a', 'modelo_b'])
  modeloIntegracion!: 'modelo_a' | 'modelo_b';

  @IsOptional() @IsString() contactoNombre?: string;
  @IsOptional() @IsEmail() contactoCorreo?: string;
  @IsOptional() @IsString() contactoTelefono?: string;
}

class DatosPrimerUsuarioDto {
  @IsEmail()
  correo!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  nombreCompleto!: string;
}

export class CrearCooperativaDto {
  @ValidateNested()
  @Type(() => DatosCooperativaDto)
  cooperativa!: DatosCooperativaDto;

  @ValidateNested()
  @Type(() => DatosPrimerUsuarioDto)
  usuario!: DatosPrimerUsuarioDto;
}

export class CrearPuntoOperacionDto {
  @IsIn(['terminal_terrestre', 'oficina_agencia', 'parada_intermedia'])
  tipo!: 'terminal_terrestre' | 'oficina_agencia' | 'parada_intermedia';

  @IsString()
  @MinLength(3)
  nombre!: string;

  @IsString()
  ciudad!: string;

  @IsString()
  provincia!: string;

  @IsOptional()
  @IsString()
  cooperativaPropietariaId?: string;
}
