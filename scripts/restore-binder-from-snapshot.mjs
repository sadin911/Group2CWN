/**
 * Restores the binder and decks destroyed at 2026-08-28T08:49Z from the
 * point-in-time snapshot. Writes the captured `fields` payload verbatim, so
 * types and values round-trip exactly.
 *
 * Pass --commit to actually write; without it this is a dry run.
 */
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs'; import path from 'path';
const COMMIT=process.argv.includes('--commit');
const ROOT='/Users/sadin/Project/PokeCountTracker';
const key=fs.readdirSync(ROOT).find(f=>f.includes('firebase-adminsdk')&&f.endsWith('.json'));
const sa=JSON.parse(fs.readFileSync(path.join(ROOT,key),'utf8'));
const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/datastore']});
const client=await auth.getClient();
const base=`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
const UID='Ylxd0VSKk6QKmiBKlnf7uFGtxgE3';
const dump=JSON.parse(fs.readFileSync(path.join(ROOT,'data/firestore-recovery/pit-2026-08-28T08-48-00Z.json'),'utf8'));
const snap=dump.users[UID];

// Which live docs already match — leave those untouched.
const live={};
for(const sub of ['binders','decks']){
  const res=await client.request({url:`${base}/users/${UID}/${sub}?pageSize=300`});
  live[sub]=new Map((res.data.documents||[]).map(d=>[d.name.split('/').pop(), d]));
}
const cardCount=d=>Object.keys(d?.fields?.cards?.mapValue?.fields||{}).length;

const plan=[];
for(const sub of ['binders','decks']){
  for(const d of snap[sub]){
    const id=d.name.split('/').pop();
    const cur=live[sub].get(id);
    const before=cur?cardCount(cur):null;
    const after=cardCount(d);
    if(sub==='binders'&&cur&&before===after){ console.log(`skip  ${sub}/${id} (already matches)`); continue; }
    if(sub==='decks'&&cur){ console.log(`skip  ${sub}/${id} (still present, untouched)`); continue; }
    plan.push({sub,id,doc:d,before,after});
  }
}

console.log(`\n${COMMIT?'RESTORING':'DRY RUN'} — ${plan.length} document(s):`);
for(const p of plan){
  console.log(`  ${p.sub}/${p.id}: ${p.before===null?'MISSING':p.before+' cards'} -> ${p.sub==='binders'?p.after+' cards':'recreate'}`);
}

if(!COMMIT){ console.log('\n(no writes performed — pass --commit)'); process.exit(0); }

for(const p of plan){
  const url=`${base}/users/${UID}/${p.sub}/${p.id}`;
  await client.request({url, method:'PATCH', data:{fields:p.doc.fields}});
  console.log(`  wrote ${p.sub}/${p.id}`);
}

console.log('\n=== verify ===');
for(const sub of ['binders','decks']){
  const res=await client.request({url:`${base}/users/${UID}/${sub}?pageSize=300`});
  for(const d of res.data.documents||[]){
    console.log(`  ${sub}/${d.name.split('/').pop()}  cards=${sub==='binders'?cardCount(d):'-'}  name="${d.fields?.name?.stringValue??'?'}"`);
  }
}
