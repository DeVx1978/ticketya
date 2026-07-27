import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import type {
  UsuarioRepositorio,
  HasherContrasena,
  EmisorTokens,
  DatosRegistro,
  UsuarioDominio,
  NotificadorEmail,
} from '../../dominio/auth/auth.ports';
import {
  calcularBloqueoTrasIntentoFallido,
  cuentaEstaBloqueada,
} from '../../dominio/auth/auth.ports';

export const USUARIO_REPOSITORIO = 'USUARIO_REPOSITORIO';
export const HASHER_CONTRASENA = 'HASHER_CONTRASENA';
export const EMISOR_TOKENS = 'EMISOR_TOKENS';
export const NOTIFICADOR_EMAIL = 'NOTIFICADOR_EMAIL';

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
    @Inject(NOTIFICADOR_EMAIL) private readonly email: NotificadorEmail,
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

  /** Perfil real (22-jul-2026) — antes GET /auth/perfil solo devolvía el payload del token, no los datos reales del usuario. */
  async obtenerMiPerfil(usuarioId: string) {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const viajesCompletados =
      usuario.rol === 'pasajero'
        ? await this.usuarios.contarViajesCompletados(usuarioId)
        : undefined;

    return {
      id: usuario.id,
      rol: usuario.rol,
      correo: usuario.correo,
      nombreCompleto: usuario.nombreCompleto,
      telefono: usuario.telefono,
      fotoUrl: usuario.fotoUrl,
      creadoEn: usuario.creadoEn,
      viajesCompletados,
    };
  }

  async actualizarMiPerfil(
    usuarioId: string,
    datos: { nombreCompleto?: string; telefono?: string; fotoUrl?: string },
  ) {
    await this.usuarios.actualizarPerfil(usuarioId, datos);
  }

  async cambiarPassword(
    usuarioId: string,
    passwordActual: string,
    passwordNueva: string,
  ) {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario || !usuario.passwordHash) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    const valido = await this.hasher.comparar(
      passwordActual,
      usuario.passwordHash,
    );
    if (!valido) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (passwordNueva.length < 8) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 8 caracteres.',
      );
    }
    const nuevoHash = await this.hasher.hash(passwordNueva);
    await this.usuarios.actualizarPasswordHash(usuarioId, nuevoHash);
  }

  async solicitarResetPassword(correo: string) {
    const usuario = await this.usuarios.buscarPorCorreo(correo);

    if (usuario) {
      const tokenPlano = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(tokenPlano).digest('hex');
      const expiraEn = new Date(Date.now() + 30 * 60 * 1000);

      await this.usuarios.guardarTokenReset(usuario.id, tokenHash, expiraEn);
      await this.email.enviarResetPassword(usuario.correo, tokenPlano);
    }

    return { ok: true };
  }

  async restablecerPassword(tokenPlano: string, passwordNueva: string) {
    if (passwordNueva.length < 8) {
      throw new BadRequestException(
        'La nueva contrasena debe tener al menos 8 caracteres.',
      );
    }

    const tokenHash = createHash('sha256').update(tokenPlano).digest('hex');
    const token = await this.usuarios.buscarTokenResetVigente(tokenHash);

    if (!token) {
      throw new BadRequestException(
        'Este enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo.',
      );
    }

    const nuevoHash = await this.hasher.hash(passwordNueva);
    await this.usuarios.actualizarPasswordHash(token.usuarioId, nuevoHash);
    await this.usuarios.marcarTokenResetUsado(token.id);

    return { ok: true };
  }
}
