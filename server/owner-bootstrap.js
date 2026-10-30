// Deployment-only owner provisioning. Passwords are never stored in configuration.
export function bootstrapOwner(db,profileNew,raw=process.env.AGARM_OWNER_BOOTSTRAP){
 if(!raw)return null;
 const config=JSON.parse(raw),email=String(config.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!(/^[a-f0-9]{128}$/).test(config.hash)||!(/^[a-f0-9]{32}$/).test(config.salt))throw Error('Invalid owner bootstrap configuration');
 db.exec('BEGIN IMMEDIATE');
 try{
  let row=db.prepare('SELECT id,profile FROM accounts WHERE email=?').get(email);
  if(!row){const profile={...profileNew('Murat'),role:'admin'};const id=Number(db.prepare('INSERT INTO accounts(email,hash,salt,profile) VALUES(?,?,?,?)').run(email,config.hash,config.salt,JSON.stringify(profile)).lastInsertRowid);row={id};}
  else {const profile=JSON.parse(row.profile);if(profile.role!=='admin'){profile.role='admin';db.prepare('UPDATE accounts SET profile=? WHERE id=?').run(JSON.stringify(profile),row.id);}}
  db.exec('COMMIT');return row.id;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
