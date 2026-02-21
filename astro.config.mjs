import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

import db from '@astrojs/db';

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    db(),
  ],
})