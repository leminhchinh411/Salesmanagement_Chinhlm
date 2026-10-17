'use strict';
// Combo program module. Awaiting eligible customer list and order reconciliation.
let comboData=null,comboError='',comboOpenEmployee=null;
function programPct(value){return Number.isFinite(value)?'<span class="program-percent '+(value>=100?'program-percent-ok':'program-percent-low')+'">'+fmtPct(value)+'</span>':'—';}
async function loadCombo(){
 comboData=null;comboError='';
 try{
  const r=await fetch('data/combo-program.json?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();
  if(x.schema_version!==1||x.period!=='10/2026'||x.combo_sku!=='03NM00789'||!Array.isArray(x.employees)||x.employees.length!==11)throw Error('Dữ liệu Combo không hợp lệ');
  const ids=new Set();
  for(const e of x.employees){if(!e.id||ids.has(e.id)||!Array.isArray(e.customers))throw Error('NVBH không hợp lệ');ids.add(e.id);}
  comboData=x;
 }catch(err){comboError=err.message;}
}
function comboMetrics(cs){
 const ready=cs.length>0&&cs.every(c=>Number.isInteger(c.combo_orders)&&c.combo_orders>=0&&typeof c.multiple_same_day==='boolean');
 const buyers=ready?cs.filter(c=>c.combo_orders>0).length:null;
 return {ready,buyers,orders:ready?cs.reduce((a,c)=>a+c.combo_orders,0):null,repeat:ready?cs.some(c=>c.multiple_same_day):null,pct:ready?buyers/cs.length*100:null};
}
function comboSection(){return '<section id="hvdn-anchor-c"><h2>C. Đơn hàng Combo</h2><p>Chờ danh sách khách hàng tham gia.</p></section>';}
const oldComboPage=hvdn;
hvdn=function(){const html=oldComboPage();const start=html.indexOf('<section id="hvdn-anchor-c"');return start<0?html:html.slice(0,start)+comboSection()+'</div>';};
