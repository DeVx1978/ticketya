import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegistroDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  correo!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @IsString()
  @MinLength(3, { message: 'El nombre completo es demasiado corto.' })
  nombreCompleto!: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
