import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'storybook-static/**',
      'node_modules/**',
      'coverage/**',
      // Código legado do myPlay, já excluído do tsconfig (não faz parte do build).
      // Ver docs/REFACTORING_ROADMAP.md (P0 — remover).
      'src/components/AddVideo.tsx',
      'src/components/EditVideoDialog.tsx',
      'src/components/ScanDirectory.tsx',
      'src/components/VideoList.tsx',
      'src/components/VideoPlayer.tsx',
      'src/reportWebVitals.ts',
      'src/setupTests.ts',
      'src/index.tsx',
      'src/setupProxy.js',
      'src/stories/Button.tsx',
      'src/stories/Header.tsx',
      'src/stories/Configure.mdx',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts}', 'vite.config.ts', 'setupProxy.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
