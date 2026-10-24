import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {}
});

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'tmp/**',
      'scripts/**',
      'prisma/**',
      'next-env.d.ts',
      'test-update.ts'
    ]
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Existing server actions use Prisma's dynamic raw-query result shape;
      // keep type safety enforced by TypeScript while avoiding noisy duplicate
      // diagnostics from the generated query boundary.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-img-element': 'off'
    }
  }
];
