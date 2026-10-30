import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {bootstrapOwner} from '../server/owner-bootstrap.js';
test('deployment owner is created once, other accounts stay ordinary, existing credentials are preserved',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE accounts(id INTEGER PRIMARY KEY,email TEXT UNIQUE,hash TEXT,salt TEXT,profile TEXT)');
 const config=JSON.stringify({email:'Owner@example.test',hash:'ab'.repeat(64),salt:'cd'.repeat(16)});
 const profileNew=name=>({name,gold:100000});
 try{
  const id=bootstrapOwner(db,profileNew,config);
  assert.equal(JSON.parse(db.prepare('SELECT profile FROM accounts WHERE id=?').get(id).profile).role,'admin');
  db.prepare('INSERT INTO accounts(email,hash,salt,profile) VALUES(?,?,?,?)').run('player@example.test','original','salt',JSON.stringify({name:'Player'}));
  db.prepare('UPDATE accounts SET hash=? WHERE id=?').run('changed-password',id);
  assert.equal(bootstrapOwner(db,profileNew,config),id);
  assert.equal(db.prepare('SELECT count(*) n FROM accounts').get().n,2);
  assert.equal(db.prepare('SELECT hash FROM accounts WHERE id=?').get(id).hash,'changed-password');
  assert.equal(JSON.parse(db.prepare('SELECT profile FROM accounts WHERE email=?').get('player@example.test').profile).role,undefined);
  assert.throws(()=>bootstrapOwner(db,profileNew,'{"email":"bad"}'));
 }finally{db.close()}
});
