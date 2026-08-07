"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { confirmarCambioCorreo } from "@/lib/api";

/**
 * Cambio de correo (29-jul-2026, hallazgo real del usuario) — pantalla
 * a la que llega el usuario al hacer clic en el enlace de su correo
 * nuevo. Sin esta pantalla, el backend ya funcionaba pero no había
 * ningún lugar donde el usuario pudiera de verdad confirmar el cambio.
 */
function ConfirmacionCambioCorreo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setError("Este enlace no es válido — falta el código de confirmación.");
      return;
    }
    confirmarCambioCorreo(token)
      .then(() => setEstado("exito"))
      .catch((err) => {
        setEstado("error");
        setError(err instanceof Error ? err.message : "No se pudo confirmar el cambio.");
      });
  }, [token]);

  return (
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5">
        {estado === "cargando" && (
          <p className="text-brand-dark/70">Confirmando tu correo nuevo...</p>
        )}
        {estado === "exito" && (
          <>
            <h1 className="font-display text-xl font-bold text-brand-dark">
              ¡Listo! Tu correo quedó actualizado
            </h1>
            <p className="mt-2 text-sm text-brand-dark/70">
              Desde ahora, inicia sesión con tu correo nuevo.
            </p>
            <Link
              href="/ingresar"
              className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
            >
              Iniciar sesión
            </Link>
          </>
        )}
        {estado === "error" && (
          <>
            <h1 className="font-display text-xl font-bold text-brand-dark">
              No pudimos confirmar tu correo
            </h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <p className="mt-2 text-sm text-brand-dark/70">
              El enlace puede haber expirado (dura 24 horas) o ya haberse usado antes. Vuelve a
              solicitar el cambio desde tu perfil.
            </p>
            <Link
              href="/perfil"
              className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
            >
              Ir a mi perfil
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmarCambioCorreoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmacionCambioCorreo />
    </Suspense>
  );
}
