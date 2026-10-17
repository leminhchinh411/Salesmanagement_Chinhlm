'use strict';
// Combo program module. Awaiting eligible customer list and order reconciliation.
let comboData=null,comboError='',comboOpenEmployee=null,comboPilot=null;
function programPct(value){return Number.isFinite(value)?'<span class="program-percent '+(value>=100?'program-percent-ok':'program-percent-low')+'">'+fmtPct(value)+'</span>':'—';}
async function loadCombo(){
 comboData=null;comboError='';
 comboPilot=null;
 try{const r=await fetch('data/combo-pilot-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.employees?.length===11)comboPilot=p;}}catch(_){}
 try{
  const r=await fetch('data/combo-participants.json.gz.b64?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  const bytes=Uint8Array.from(atob((await r.text()).trim()),c=>c.charCodeAt(0));
  const x=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  if(x.schema_version!==1||x.period!=='10/2026'||x.combo_sku!=='03NM00789'||!Array.isArray(x.employees)||x.employees.length!==11)throw Error('Dữ liệu Combo không hợp lệ');
  const ids=new Set();
  for(const e of x.employees){if(!e.id||ids.has(e.id)||!Array.isArray(e.customers))throw Error('NVBH không hợp lệ');ids.add(e.id);}
  // Overlay customer-level Actual from reconciled RAW snapshot; zero orders are explicit.
  const ar=await fetch('data/combo-customer-actual-20261016.json?v='+Date.now(),{cache:'no-store'});
  if(!ar.ok)throw Error('Chưa tải được Actual Combo cấp khách hàng: HTTP '+ar.status);
  const actual=await ar.json();
  if(actual.schema_version!==2||actual.cutoff_date!=='2026-10-16'||actual.status!=='PILOT'||actual.summary.participants!==1687)throw Error('Snapshot Actual Combo không hợp lệ');
  const map=new Map(actual.customers.map(([id,orders,closed])=>[String(id),{orders,closed}]));
  const roster=new Set(),check={buyers:0,orders:0,closed:0,participants:0};
  for(const e of x.employees)for(const c of e.customers){
   const id=String(c.id);if(roster.has(id))throw Error('Trùng mã KH Combo '+id);
   roster.add(id);check.participants++;
   const a=map.get(id)||{orders:0,closed:0};
   if(a.orders<0||a.closed<0||a.closed>a.orders)throw Error('Số đơn Combo bất thường '+id);
   c.combo_orders=a.orders;c.closed_orders=a.closed;c.multiple_same_day=false;
   check.buyers+=a.orders>0?1:0;check.orders+=a.orders;check.closed+=a.closed;
  }
  if(check.participants!==actual.summary.participants||check.buyers!==actual.summary.buyers||check.orders!==actual.summary.orders||check.closed!==actual.summary.closed_orders||[...map.keys()].some(id=>!roster.has(id)))throw Error('Lệch tổng Combo cấp KH và Team');
  comboPilot={...actual,validated_records:check.participants};
  comboData=x;
 }catch(err){comboError=err.message;}
}
function comboMetrics(cs){
 const ready=cs.length>0&&cs.every(c=>Number.isInteger(c.combo_orders)&&c.combo_orders>=0&&typeof c.multiple_same_day==='boolean');
 const buyers=ready?cs.filter(c=>c.combo_orders>0).length:null;
 return {ready,buyers,orders:ready?cs.reduce((a,c)=>a+c.combo_orders,0):null,repeat:ready?cs.some(c=>c.multiple_same_day):null,pct:ready?buyers/cs.length*100:null};
}
function comboSection(){
 const people=sales?.employees||[];
 const items=people.map(p=>({id:p.id,name:p.name,customers:comboData?.employees.find(e=>e.name===p.name)?.customers||[]}));
 const rows=items.map(e=>comboEmployeeRow(e)).join('');
 const pilotBanner=comboPilot?'<div class="fundamental-warning"><strong>COMBO · Actual KH 16/10 · PILOT:</strong> '+comboPilot.summary.buyers+'/'+comboPilot.summary.participants+' KH mua ('+fmtPct(comboPilot.summary.buyers/comboPilot.summary.participants*100)+'), '+comboPilot.summary.orders+' đơn, '+comboPilot.summary.closed_orders+' Đã Đóng, '+(comboPilot.summary.orders-comboPilot.summary.closed_orders)+' Đang giao; '+comboPilot.summary.repeat_same_day_customers+' KH >1 đơn cùng ngày. Đã đối soát tổng 1.687 KH và 11 NVBH; chưa phải kết quả thưởng chính thức.</div>':'';
 return '<section id="hvdn-anchor-c" class="hvdn-combo-section"><h2 class="hvdn-section-title">C. Đơn hàng Combo</h2>'+pilotBanner+'<p class="hvdn-hint">Đơn có SKU 03NM00789 với thành tiền dòng = 0; đếm mã đơn duy nhất, cảnh báo trên 1 đơn cùng ngày tạo.</p>'+(comboError?'<p class="notice error">'+escapeHTML(comboError)+'</p>':'')+(!comboData?'<p class="fundamental-warning">Chờ dữ liệu danh sách Combo.</p>':'<p class="hvdn-hint">Danh sách 1.687 KH và số đơn đã đồng bộ RAW đến 16/10. Chọn NVBH để xem Actual từng KH; KH chưa mua hiển thị 0 đơn.</p>')+rows+'</section>';
}
const oldComboPage=hvdn;
hvdn=function(){const html=oldComboPage();const start=html.indexOf('<section id="hvdn-anchor-c"');return start<0?html:html.slice(0,start)+comboSection()+'</div>';};
function comboEmployeeRow(e){
 const m=comboMetrics(e.customers),open=comboOpenEmployee===e.id;
 return '<div class="combo-employee"><button class="combo-employee-toggle" data-combo-employee="'+escapeHTML(e.id)+'"><strong>'+escapeHTML(e.name)+'</strong><span>'+(open?'▾':'▸')+'</span></button><div class="combo-metrics"><span>KH tham gia <b>'+(comboData?fmtMoney(e.customers.length):'—')+'</b></span><span>KH mua ≥1 đơn <b>'+(m.ready?fmtMoney(m.buyers):'—')+'</b></span><span>% KH đã mua <b>'+programPct(m.pct)+'</b></span><span>Tổng đơn Combo <b>'+(m.ready?fmtMoney(m.orders):'—')+'</b></span><span>>1 đơn cùng ngày <b>'+(m.ready?(m.repeat?'CÓ CẢNH BÁO':'Không'):'—')+'</b></span></div>'+(open?comboDetailTable(e.customers):'')+'</div>';
}
function comboDetailTable(cs){
 const sorted=[...cs].sort((a,b)=>(a.channel==='OFF'?0:1)-(b.channel==='OFF'?0:1)||a.name.localeCompare(b.name,'vi'));
 return '<div class="hvdn-scroll"><table class="hvdn-table combo-table"><thead><tr><th>Khách hàng</th><th>Số đơn Combo</th><th>Đã Đóng</th><th>Đang giao</th><th>>1 đơn cùng ngày</th></tr></thead><tbody>'+sorted.map(c=>'<tr><th>'+escapeHTML(c.name)+' <span class="growth-channel growth-'+(c.channel==='OFF'?'off':'on')+'">'+escapeHTML(c.channel)+'</span><small>'+escapeHTML(c.id)+'</small></th><td>'+(Number.isInteger(c.combo_orders)?fmtMoney(c.combo_orders):'—')+'</td><td>'+(Number.isInteger(c.closed_orders)?fmtMoney(c.closed_orders):'—')+'</td><td>'+(Number.isInteger(c.combo_orders)&&Number.isInteger(c.closed_orders)?fmtMoney(c.combo_orders-c.closed_orders):'—')+'</td><td>'+(c.multiple_same_day===true?'<span class="combo-alert">CẢNH BÁO</span>':c.multiple_same_day===false?'Không':'—')+'</td></tr>').join('')+'</tbody></table></div>';
}
const previousComboLoad=loadHvdn;
loadHvdn=async function(){await Promise.all([previousComboLoad(),loadCombo()]);};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-combo-employee]');
 if(!b)return;
 comboOpenEmployee=comboOpenEmployee===b.dataset.comboEmployee?null:b.dataset.comboEmployee;
 render();
});
const previousComboSearch=growthSearch;
growthSearch=function(){
 const html=previousComboSearch(),q=growthQuery.trim().toLocaleLowerCase('vi');
 if(!q||!comboData)return html;
 const cs=comboData.employees.flatMap(e=>e.customers).filter(c=>(c.id+' '+c.name).toLocaleLowerCase('vi').includes(q)).slice(0,20);
 if(!cs.length)return html;
 return html+'<section class="combo-search-results"><h4>C. Đơn hàng Combo</h4>'+comboDetailTable(cs)+'</section>';
};
