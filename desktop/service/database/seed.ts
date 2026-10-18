import {createRequire} from "node:module"
import {dirname,join,resolve} from "node:path"
import {realpath} from "node:fs/promises"
import {readDatabaseSeed} from "../../shared/database-seed"

export async function loadDatabaseSeed(manifestPath:string,fixtureRuntimeRoot?:string):Promise<Blob>{
 const require=createRequire(import.meta.url)
 const actual=dirname(dirname(require.resolve('@electric-sql/pglite')))
 // Production resources belong to this application's prisma/ directory. Only
 // source fixtures may explicitly bind their independently generated directory.
 const expected=fixtureRuntimeRoot??join(dirname(dirname(resolve(manifestPath))),'node_modules/@electric-sql/pglite')
 if(await realpath(expected)!==resolve(expected)||await realpath(actual)!==resolve(expected))throw Error('DATABASE_SEED_RUNTIME_OUTSIDE_APP')
 return readDatabaseSeed(manifestPath,expected)
}
