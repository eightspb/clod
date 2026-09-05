import js from '@eslint/js'
import eslintPluginAstro from 'eslint-plugin-astro'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

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
    ignores: [
      'dist/**',
      'node_modules/**',
      'db/**',
      'scripts/**',
      'bun.lock',
      '*.config.js',
      '*.config.mjs',
      'public/**',
      'src/pages/**/*.astro',
      'src/layouts/**/*.astro',
      'src/content/**',
      'e2e/**',
      'src/lib/tracker.js',
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
