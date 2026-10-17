'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const folder=process.argv[2];
if(!folder){console.error('Usage: node handoff/tools/validate.js handoff/candidates/YYYY-MM-DD/run-id');process.exit(2);}
const dir=path.resolve(root,folder);
if(!dir.startsWith(path.join(root,'handoff','candidates')+path.sep))throw Error('Candidate path required');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const m=read('manifest.json'),s=read('snapshot.json'),a=read('audit.json'),errors=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg);};
const ids=['01','03','09','13','14','17','19','20','22','23','24'].map(n=>'SM-FM-10KF4093.'+n);
const divs=['Coffee','Convenience Foods','Home Care','Nutrition','Processed Meats','Refreshment Drinks','Seasoning'];
check(m.contract==='sales-handoff-v1'&&s.contract==='sales-handoff-v1'&&a.contract==='sales-handoff-v1','contract mismatch');
check(m.cutoff_date===s.cutoff_date&&s.cutoff_date===a.cutoff_date&&/^2026-10-\d{2}$/.test(s.cutoff_date||''),'cutoff mismatch');
check(m.qa_status===a.qa_status&&s.qa_status===a.qa_status,'QA mismatch');
check(s.period==='10/2026'&&m.period==='10/2026','period mismatch');
check(Array.isArray(s.employees)&&s.employees.length===11,'11 employees required');
const seen=new Set();let total=0;
for(const e of s.employees||[]){
 check(ids.includes(e.id)&&!seen.has(e.id),'invalid/duplicate employee '+e.id);seen.add(e.id);
 check(Array.isArray(e.divisions)&&e.divisions.length===7,'7 divisions required '+e.id);
 for(const v of e.divisions||[]){const n=typeof v==='number'?v:v?.actual;check(typeof n==='number'&&Number.isFinite(n)&&n>=0,'invalid actual '+e.id);if(Number.isFinite(n))total+=n;}
}
check(seen.size===11,'missing employee IDs');
check(!s.division_order||JSON.stringify(s.division_order)===JSON.stringify(divs),'division order mismatch');
check(Number.isFinite(s.team_actual_vnd)&&Math.abs(total-s.team_actual_vnd)<=Math.max(.02,Math.abs(s.rounding_variance_vnd||0)+.01),'team total mismatch');
check(Number.isFinite(s.timegone_pct)&&s.timegone_pct>=0&&s.timegone_pct<=100,'timegone missing or invalid');
check(Array.isArray(m.source_partitions)&&m.source_partitions.length===2&&m.source_partitions.every(p=>p.filename&&p.sha256),'source partitions missing');
check(Array.isArray(a.issues),'audit issues missing');
check(m.approved_for_public===false&&s.approved_for_public===false,'candidate must not publish directly');
const ready=errors.length===0&&a.qa_status==='PASSED'&&Object.values(a.checks||{}).every(v=>v==='PASS')&&a.issues.length===0;
console.log(JSON.stringify({candidate:folder,contract_valid:errors.length===0,qa_ready:ready,release:'HOLD',errors},null,2));
process.exitCode=errors.length?1:0;
