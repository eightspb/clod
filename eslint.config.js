import js from '@eslint/js'
import eslintPluginAstro from 'eslint-plugin-astro'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // React 18.3 renders only the lowercase attribute without warning; switch back to fetchPriority on React 19
      'react/no-unknown-property': ['error', { ignore: ['fetchpriority'] }],
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='get'] > Literal[value=/^x-(forwarded-for|real-ip)$/i]",
          message: 'Read the client address only through getClientIp from src/lib/client-ip.js',
        },
      ],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    files: ['src/lib/client-ip.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { Bun: 'readonly' } },
  },
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tsParser, extraFileExtensions: ['.astro'] } },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'db/**',
      'bun.lock',
      '*.config.js',
      '*.config.mjs',
      'public/**',
      'src/content/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '.astro/**',
      'graphify-out/**',
      '.worktrees/**',
      '.superpowers/**',
      'seomachine-workspace/**',
      '.claude/design-systems/**',
      '.claude/marketplaces/**',
      '.claude/skills/humanizer/**',
    ],
  },
]
