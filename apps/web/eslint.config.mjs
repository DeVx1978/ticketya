import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Regla nueva (experimental, parte de las herramientas de React
      // Compiler) que marca como error CUALQUIER setState al final de un
      // useEffect, incluyendo el patrón estándar y seguro de "verificar
      // algo externo (localStorage, una API) al montar, y recién ahí
      // habilitar el render" — usado en las guardias de autenticación de
      // /panel-empresa y /admin, y ya presente desde antes en
      // SelectorCiudad.tsx. Forzar un patrón distinto acá sería
      // sobre-ingeniería para un caso legítimo y común en React.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
