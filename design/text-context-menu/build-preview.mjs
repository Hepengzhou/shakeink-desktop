// Offline HTML design artifact only; does not build or modify the product.
import { build } from 'esbuild'
import { resolve } from 'node:path'
await build({ entryPoints:[resolve('design/text-context-menu/viewer.tsx')], bundle:true, format:'iife', platform:'browser', jsx:'automatic', minify:true, outfile:resolve('design/text-context-menu/preview.bundle.js'), define:{'process.env.NODE_ENV':'"production"'}, tsconfig:resolve('tsconfig.json') })
console.log('Built offline text menu design artifact.')
