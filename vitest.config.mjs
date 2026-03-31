import { getViteConfig } from 'astro/config'

export default getViteConfig({
  resolve: {
    alias: {
      '/pagefind/pagefind.js': '/Users/slava/dev/clod/src/test/pagefind-stub.js',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,mjs}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.js', 'src/components/**/*.jsx'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/*.spec.{js,jsx}',
        'src/test/**',
        '**/node_modules/**',
      ],
    },
  },
})
