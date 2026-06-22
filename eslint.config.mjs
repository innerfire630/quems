import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable conflicting formatting rules so Prettier owns all formatting.
  prettier,
  // Project-specific rule set.
  {
    plugins: {
      'no-relative-import-paths': noRelativeImportPaths,
    },
    rules: {
      // Disallow `../../../` style relative imports — use the `@/` alias instead.
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: true, prefix: '@' },
      ],
      // TypeScript hygiene.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'prisma/migrations/**']),
]);

export default eslintConfig;
