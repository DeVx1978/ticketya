"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  login,
  iniciarConfiguracion2fa,
  confirmarConfiguracion2fa,
  verificar2fa,
  recuperarCon2fa,
} from "@/lib/api";
import { guardarToken, decodificarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";
import { EntradaCodigoOtp } from "@/components/EntradaCodigoOtp";

type Paso = "login" | "configurar" | "verificar" | "recuperacion" | "codigos-generados";

function FormularioIngreso() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [paso, setPaso] = useState<Paso>("login");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Ítem 19 (06-ago-2026) -- estado del flujo de 2FA.
  const [tokenTemporal, setTokenTemporal] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [codigosGenerados, setCodigosGenerados] = useState<string[]>([]);
  const [codigosCopiados, setCodigosCopiados] = useState(false);
  const [accessTokenPendiente, setAccessTokenPendiente] = useState("");

  /**
   * Ítem 19 -- destino según rol, reutilizado en las 4 formas de
   * terminar el login (directo, tras configurar 2FA, tras verificar
   * 2FA, tras recuperación). Bug real encontrado y corregido de paso:
   * super_admin (ítem 9, 04-ago-2026) nunca se agregó aquí -- antes
   * hubiera terminado en la portada de pasajero en vez de /admin.
   */
  function navegarSegunRol(accessToken: string) {
    guardarToken(accessToken);
    const volverA = searchParams.get("volverA");
    if (volverA) {
      router.push(volverA);
    } else {
      const payload = decodificarToken(accessToken);
      if (payload?.rol === "admin_plataforma" || payload?.rol === "super_admin") {
        router.push("/admin");
      } else if (payload?.rol === "admin_cooperativa" || payload?.rol === "vendedor") {
        router.push("/panel-empresa");
      } else {
        router.push("/");
      }
    }
    router.refresh();
  }

  async function enviarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await login(correo, password);

      if ("accessToken" in respuesta) {
        navegarSegunRol(respuesta.accessToken);
        return;
      }

      setTokenTemporal(respuesta.tokenTemporal);

      if ("requiereConfigurar2fa" in respuesta) {
        const config = await iniciarConfiguracion2fa(respuesta.tokenTemporal);
        setQrDataUrl(config.qrDataUrl);
        setSecreto(config.secreto);
        setPaso("configurar");
      } else {
        setPaso("verificar");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  async function enviarConfiguracion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await confirmarConfiguracion2fa(tokenTemporal, codigo);
      setAccessTokenPendiente(resultado.accessToken);
      setCodigosGenerados(resultado.codigosRecuperacion);
      setPaso("codigos-generados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "El código no es válido.");
      setCodigo("");
    } finally {
      setCargando(false);
    }
  }

  async function enviarVerificacion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await verificar2fa(tokenTemporal, codigo);
      navegarSegunRol(resultado.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "El código no es válido.");
      setCodigo("");
    } finally {
      setCargando(false);
    }
  }

  async function enviarRecuperacion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await recuperarCon2fa(tokenTemporal, codigoRecuperacion);
      navegarSegunRol(resultado.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ese código de recuperación no es válido.");
    } finally {
      setCargando(false);
    }
  }

  function copiarCodigos() {
    navigator.clipboard.writeText(codigosGenerados.join("\n"));
    setCodigosCopiados(true);
    setTimeout(() => setCodigosCopiados(false), 2000);
  }

  // ── Pantalla: configurar 2FA por primera vez (QR + código) ──
  if (paso === "configurar") {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-brand">
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-center font-display text-xl font-bold text-brand-dark">
            Activa la verificación en dos pasos
          </h1>
          <p className="mt-2 text-center text-sm text-brand-dark/70">
            Es obligatoria para cuentas administrativas. Escanea este código con tu app
            autenticadora (Google Authenticator, Authy, etc.).
          </p>

          <div className="mt-6 flex justify-center rounded-xl bg-brand-light/30 p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagen generada como data URL, no un asset local
              <img src={qrDataUrl} alt="Código QR de configuración" className="h-44 w-44" />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center text-sm text-brand-dark/40">
                Generando...
              </div>
            )}
          </div>

          <details className="mt-3 text-center text-xs text-brand-dark/50">
            <summary className="cursor-pointer font-semibold text-brand hover:underline">
              ¿No puedes escanear el código?
            </summary>
            <p className="mt-2">Ingresa este código manualmente en tu app:</p>
            <p className="mt-1 break-all rounded-lg bg-brand-light/40 px-3 py-2 font-mono text-sm text-brand-dark">
              {secreto}
            </p>
          </details>

          <form onSubmit={enviarConfiguracion} className="mt-6 space-y-4">
            <div>
              <label id="config-2fa-codigo-label" className="mb-2 block text-center text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                Código de 6 dígitos
              </label>
              <div role="group" aria-labelledby="config-2fa-codigo-label">
                <EntradaCodigoOtp valor={codigo} onChange={setCodigo} />
              </div>
            </div>

            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={cargando || codigo.length !== 6}
              className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {cargando ? "Activando..." : "Activar 2FA"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Pantalla: códigos de recuperación (una sola vez, tras activar) ──
  if (paso === "codigos-generados") {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-600">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-center font-display text-xl font-bold text-brand-dark">
            2FA activado
          </h1>

          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">Guarda estos 10 códigos de recuperación ahora.</p>
            <p className="mt-1 text-xs">
              Solo se muestran esta vez. Si pierdes tu teléfono, son la única forma de recuperar el
              acceso a tu cuenta.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-brand-light/30 p-4 font-mono text-sm text-brand-dark">
            {codigosGenerados.map((c) => (
              <span key={c} className="text-center">
                {c}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={copiarCodigos}
            className="mt-4 w-full rounded-lg border border-brand-light px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light/40"
          >
            {codigosCopiados ? "¡Copiados!" : "Copiar todos los códigos"}
          </button>

          <button
            type="button"
            onClick={() => navegarSegunRol(accessTokenPendiente)}
            className="mt-3 w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
          >
            Ya los guardé, continuar
          </button>
        </div>
      </main>
    );
  }

  // ── Pantalla: recuperación con código de un solo uso ──
  if (paso === "recuperacion") {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          <h1 className="text-center font-display text-xl font-bold text-brand-dark">
            Código de recuperación
          </h1>
          <p className="mt-2 text-center text-sm text-brand-dark/70">
            Ingresa uno de los 10 códigos que guardaste al activar la verificación en dos pasos.
          </p>

          <form onSubmit={enviarRecuperacion} className="mt-6 space-y-4">
            <input
              type="text"
              required
              maxLength={10}
              autoFocus
              value={codigoRecuperacion}
              onChange={(e) => setCodigoRecuperacion(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXX"
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-center font-mono text-lg tracking-widest text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />

            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {cargando ? "Verificando..." : "Continuar"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setCodigo("");
              setPaso("verificar");
            }}
            className="mt-4 w-full text-center text-sm font-semibold text-brand hover:underline"
          >
            Volver a usar el código de mi app
          </button>
        </div>
      </main>
    );
  }

  // ── Pantalla: verificar 2FA en un login normal (cuenta ya configurada) ──
  if (paso === "verificar") {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-brand">
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-center font-display text-xl font-bold text-brand-dark">
            Verificación en dos pasos
          </h1>
          <p className="mt-2 text-center text-sm text-brand-dark/70">
            Ingresa el código de 6 dígitos de tu app autenticadora.
          </p>

          <form onSubmit={enviarVerificacion} className="mt-6 space-y-4">
            <EntradaCodigoOtp valor={codigo} onChange={setCodigo} />

            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={cargando || codigo.length !== 6}
              className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {cargando ? "Verificando..." : "Continuar"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setCodigo("");
              setPaso("recuperacion");
            }}
            className="mt-4 w-full text-center text-sm font-semibold text-brand hover:underline"
          >
            ¿Perdiste el acceso a tu app autenticadora?
          </button>
        </div>
      </main>
    );
  }

  // ── Pantalla: login normal (correo + contraseña) ──
  return (
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-brand-dark/70">Entra a tu cuenta de TicketYa.</p>

        <form onSubmit={enviarLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Correo
            </label>
            <input
              id="login-correo"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contraseña
            </label>
            <CampoPassword id="login-password" value={password} onChange={setPassword} />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-dark/70">
          ¿No tienes cuenta?{" "}
          <Link
            href={`/registro${searchParams.get("volverA") ? `?volverA=${encodeURIComponent(searchParams.get("volverA")!)}` : ""}`}
            className="font-semibold text-brand hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function IngresarPage() {
  return (
    <Suspense fallback={null}>
      <FormularioIngreso />
    </Suspense>
  );
}
