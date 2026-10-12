// Builds the offline review fixture, not the application.
import { build } from 'esbuild'
import { resolve } from 'node:path'
await build({entryPoints:[resolve('design/toast-style/viewer.tsx')],bundle:true,format:'iife',platform:'browser',jsx:'automatic',minify:true,outfile:resolve('design/toast-style/preview.bundle.js'),define:{'process.env.NODE_ENV':'"production"'},tsconfig:resolve('tsconfig.json')})
console.log('Built local toast design fixture.')
