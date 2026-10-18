import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {join,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {databaseSeedInputs,readDatabaseSeed} from '../desktop/shared/database-seed.ts'

async function vanillaProfile(db){
 const schemas=(await db.query("SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema' ORDER BY nspname")).rows
 assert.deepEqual(schemas,[{nspname:'public'}])
 assert.deepEqual((await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows,[])
 assert.deepEqual((await db.query("SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY c.relname")).rows,[])
 assert.deepEqual((await db.query("SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'")).rows,[])
 assert.deepEqual((await db.query("SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1')")).rows,[])
 assert.deepEqual((await db.query("SELECT rolname FROM pg_roles WHERE rolname !~ '^pg_' AND rolname <> 'postgres'")).rows,[])
 return (await db.query("SELECT name,setting FROM pg_settings WHERE name IN ('server_version','server_encoding','lc_collate','lc_ctype') ORDER BY name")).rows
}

/** Always create from memory; there is no user-root or input-database argument. */
export async function generateDatabaseSeed(project,directory=join(project,'prisma')){
 const require=createRequire(join(project,'package.json')),{PGlite}=require('@electric-sql/pglite')
 const packageRoot=dirname(dirname(require.resolve('@electric-sql/pglite')))
 const db=await PGlite.create({relaxedDurability:false})
 let bytes,profile
 try{profile=await vanillaProfile(db);bytes=Buffer.from(await(await db.dumpDataDir('gzip')).arrayBuffer())}finally{await db.close()}
 const restored=await PGlite.create({loadDataDir:new Blob([bytes]),relaxedDurability:false})
 try{assert.deepEqual(await vanillaProfile(restored),profile)}finally{await restored.close()}
 const runtime=await databaseSeedInputs(packageRoot)
 const manifest={format:'shakeink-empty-pglite',schemaVersion:1,fingerprintFormat:'runtime-metadata-without-scripts-keywords-v1',...runtime,archive:{path:'empty-database.tar.gz',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}}
 await mkdir(directory,{recursive:true})
 await writeFile(join(directory,manifest.archive.path),bytes)
 await writeFile(join(directory,'empty-database.json'),JSON.stringify(manifest,null,2)+'\n')
 await readDatabaseSeed(join(directory,'empty-database.json'),packageRoot)
 return manifest
}

export async function verifyDatabaseSeed(project,directory=join(project,'prisma')){
 const require=createRequire(join(project,'package.json'))
 return readDatabaseSeed(join(directory,'empty-database.json'),dirname(dirname(require.resolve('@electric-sql/pglite'))))
}
