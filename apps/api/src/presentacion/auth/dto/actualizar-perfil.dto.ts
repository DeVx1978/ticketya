import { IsOptional, IsString, MinLength } from 'class-validator';

/** Perfil de usuario (22-jul-2026). Todos opcionales — solo se actualiza lo que se envía. */
export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre completo es demasiado corto.' })
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;
}
