import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  UsuarioRepositorio,
  HasherContrasena,
  EmisorTokens,
  DatosRegistro,
  UsuarioDominio,
} from '../../dominio/auth/auth.ports';
import {
  calcularBloqueoTrasIntentoFallido,
  cuentaEstaBloqueada,
} from '../../dominio/auth/auth.ports';

export const USUARIO_REPOSITORIO = 'USUARIO_REPOSITORIO';
export const HASHER_CONTRASENA = 'HASHER_CONTRASENA';
export const EMISOR_TOKENS = 'EMISOR_TOKENS';

/**
 * Casos de uso de autenticación (RF-AUTH-001, RF-AUTH-002). Orquesta el
 * dominio y pide cosas a la infraestructura a través de las interfaces
 * inyectadas — nunca importa Drizzle, bcrypt ni JWT directamente
 * (Arquitectura Técnica, sección 2.1).
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORIO) private readonly usuarios: UsuarioRepositorio,
    @Inject(HASHER_CONTRASENA) private readonly hasher: HasherContrasena,
    @Inject(EMISOR_TOKENS) private readonly tokens: EmisorTokens,
  ) {}

  /** RF-AUTH-001 — registro de pasajero. */
  async registrar(datos: DatosRegistro) {
    const existente = await this.usuarios.buscarPorCorreo(datos.correo);
    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    const passwordHash = await this.hasher.hash(datos.password);
    const usuario = await this.usuarios.crearPasajero({
      ...datos,
      password: passwordHash,
    });

    // Nota: el envío real del correo de confirmación (RF-AUTH-001,
    // "recibe confirmación por correo") pertenece al módulo RF-NOTIF, que
    // todavía no está construido — queda pendiente conectar aquí cuando
    // exista.

    return this.emitirTokenPara(usuario);
  }

  /**
   * RF-AUTH-002 — login con protección de fuerza bruta. Ver
   * dominio/auth/auth.ports.ts para la limitación conocida respecto al
   * criterio exacto del SRS (ventana deslizante de 10 minutos).
   */
  async login(correo: string, passwordPlano: string) {
    const usuario = await this.usuarios.buscarPorCorreo(correo);

    // Mismo mensaje de error si el correo no existe o si la contraseña es
    // incorrecta — no revelar cuál de las dos cosas falló, práctica
    // estándar de seguridad (evita que un atacante confirme qué correos
    // están registrados).
    const credencialesInvalidas = () =>
      new UnauthorizedException('Correo o contraseña incorrectos.');

    if (!usuario || !usuario.activo || !usuario.passwordHash) {
      throw credencialesInvalidas();
    }

    if (cuentaEstaBloqueada(usuario.bloqueadoHasta)) {
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.',
      );
    }

    const passwordValido = await this.hasher.comparar(
      passwordPlano,
      usuario.passwordHash,
    );

    if (!passwordValido) {
      const { nuevoConteo, bloqueadoHasta } = calcularBloqueoTrasIntentoFallido(
        usuario.intentosFallidos,
      );
      await this.usuarios.registrarIntentoFallido(
        usuario.id,
        nuevoConteo,
        bloqueadoHasta,
      );
      throw credencialesInvalidas();
    }

    await this.usuarios.reiniciarIntentosFallidos(usuario.id);
    return this.emitirTokenPara(usuario);
  }

  private emitirTokenPara(usuario: UsuarioDominio) {
    const accessToken = this.tokens.firmar({
      sub: usuario.id,
      rol: usuario.rol,
      cooperativaId: usuario.cooperativaId,
    });
    return { accessToken };
  }
}
