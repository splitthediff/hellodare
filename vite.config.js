import { defineConfig } from 'vite'

export default defineConfig({

  root: 'src',

  base: '/hellodare/',

  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})