// Offline design artifact only. No production source is built or modified.
import { build } from 'esbuild'
import { resolve } from 'node:path'
await build({entryPoints:[resolve('design/sidebar-navigation/viewer.tsx')],bundle:true,format:'iife',platform:'browser',jsx:'automatic',minify:true,outfile:resolve('design/sidebar-navigation/preview.bundle.js'),define:{'process.env.NODE_ENV':'"production"'},tsconfig:resolve('tsconfig.json')})
console.log('Built offline sidebar navigation review artifact.')
