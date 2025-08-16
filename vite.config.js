import { defineConfig } from 'vite'

export default defineConfig({

  root: 'src',

  base: '/splitthediff/',

  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})