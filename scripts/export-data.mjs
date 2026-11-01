// Offline migration export. Run on the existing host before replacing it.
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const [sourceDir,outputDir]=process.argv.slice(2);
if(!sourceDir||!outputDir)throw Error('Usage: node scripts/export-data.mjs SOURCE_DATA_DIR PRIVATE_OUTPUT_DIR');
const from=path.resolve(sourceDir),to=path.resolve(outputDir);
if(to===from||to.startsWith(from+path.sep))throw Error('Export directory must be outside source data');
await fs.mkdir(to,{recursive:true,mode:0o700});
const dest=path.join(to,'agarm.sqlite');
try{await fs.stat(dest);throw Error('Destination already exists; choose a new export directory')}catch(e){if(e.code!=='ENOENT')throw e}
const db=new DatabaseSync(path.join(from,'agarm.sqlite'),{readOnly:true});
try{await backup(db,dest)}finally{db.close()}
await fs.chmod(dest,0o600);
const reportDb=new DatabaseSync(dest,{readOnly:true});
const report={createdAt:new Date().toISOString(),tables:{},sha256:crypto.createHash('sha256').update(await fs.readFile(dest)).digest('hex')};
try{for(const row of reportDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){const quoted='"'+row.name.replaceAll('"','""')+'"';report.tables[row.name]=reportDb.prepare('SELECT count(*) count FROM '+quoted).get().count}if(reportDb.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity check failed')}finally{reportDb.close()}
for(const folder of ['skins','uploads']){try{await fs.cp(path.join(from,folder),path.join(to,folder),{recursive:true,errorOnExist:true,force:false})}catch(e){if(e.code!=='ENOENT')throw e}}
await fs.writeFile(path.join(to,'manifest.json'),JSON.stringify(report,null,2),{mode:0o600});
console.log('Consistent migration backup created; integrity verified. Keep the export private.');
