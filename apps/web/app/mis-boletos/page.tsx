"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * "Mi cuenta" unificada (29-jul-2026): /mis-boletos se fusionó dentro
 * de /perfil como una pestaña. Esta página se deja como redirect para
 * no romper enlaces o marcadores existentes que apunten aquí.
 */
export default function MisBoletosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/perfil?tab=boletos");
  }, [router]);
  return null;
}
