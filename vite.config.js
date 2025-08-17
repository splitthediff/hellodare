import { resolve } from 'path'
import { defineConfig } from 'vite'
import { glob } from 'glob'

const htmlFiles = glob.sync(['src/**/*.html', '!src/vite-env.d.ts'])

const input = htmlFiles.reduce((acc, file) => {
  const name = file.replace('src/', '').replace('.html', '')
  acc[name] = resolve(__dirname, file)
  return acc
}, {})

export default defineConfig({
  root: 'src',
  base: '/hellodare/',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    rollupOptions: {
      input: input,
    },
    emptyOutDir: true,
  },
})