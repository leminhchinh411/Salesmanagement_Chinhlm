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
  const unknownIds=[...map.keys()].filter(id=>!roster.has(id));
  const mismatch=check.participants!==actual.summary.participants||check.buyers!==actual.summary.buyers||check.orders!==actual.summary.orders||check.closed!==actual.summary.closed_orders||unknownIds.length>0;
  if(mismatch){
   comboError='CẢNH BÁO ĐỐI SOÁT: danh sách KH Combo trên Dashboard chưa khớp snapshot RAW. KH chưa ghép '+unknownIds.length+'; theo danh sách ghép được: '+check.buyers+' KH, '+check.orders+' đơn ('+check.closed+' Đã Đóng). Snapshot RAW: '+actual.summary.buyers+' KH, '+actual.summary.orders+' đơn ('+actual.summary.closed_orders+' Đã Đóng). Không dùng kết quả ghép để chốt thưởng.';
  }
  comboPilot={...actual,validated_records:check.participants,matched_summary:check,unmatched_customers:unknownIds.length,reconciled:!mismatch};
  comboData=x;
 }catch(err){comboError=err.message;}
}
function comboMetrics(cs){
 const ready=cs.length>0&&cs.every(c=>Number.isInteger(c.combo_orders)&&c.combo_orders>=0&&typeof c.multiple_same_day==='boolean');
 const buyers=ready?cs.filter(c=>c.combo_orders>0).length:null;
 return {ready,buyers,orders:ready?cs.reduce((a,c)=>a+c.combo_orders,0):null,repeat:ready?cs.some(c=>c.multiple_same_day):null,pct:ready?buyers/cs.length*100:null};
}
function comboTeamSummary(items){
 if(!comboData)return '';
 const all=items.flatMap(e=>e.customers);
 const metric=e=>{const cs=e.customers,orders=cs.reduce((n,c)=>n+(c.combo_orders||0),0),closed=cs.reduce((n,c)=>n+(c.closed_orders||0),0),buyers=cs.filter(c=>c.combo_orders>0).length,repeat=cs.filter(c=>c.multiple_same_day).length;return [cs.length,buyers,cs.length?buyers/cs.length*100:0,orders,closed,orders-closed,repeat];};
 const head='<thead><tr><th>NVBH</th><th>KH tham gia</th><th>KH đã mua</th><th>% đã mua</th><th>Tổng đơn</th><th>Đã Đóng</th><th>Đang giao</th><th>KH >1 đơn/ngày</th></tr></thead>';
 const row=(name,v,cls='')=>'<tr'+(cls?' class="'+cls+'"':'')+'><th>'+escapeHTML(name)+'</th>'+v.map((n,i)=>'<td>'+(i===2?fmtPct(n):fmtMoney(n))+'</td>').join('')+'</tr>';
 return '<section class="hvdn-card"><h3>Combo · Tổng hợp Actual 11 NVBH · 16/10/2026</h3><p class="hvdn-hint">Từ danh sách COMBO.xlsx đối soát RAW; số đơn theo mã đơn duy nhất của SKU 03NM00789 có thành tiền dòng = 0. Kết quả PILOT, không phải chốt thưởng.</p><div class="hvdn-scroll"><table class="hvdn-table">'+head+'<tbody>'+items.map(e=>row(e.name,metric(e))).join('')+row('TỔNG TEAM',metric({customers:all}),'hvdn-team')+'</tbody></table></div></section>';
}
function comboKpiCards(items){
 if(!comboData)return '';
 const cs=items.flatMap(e=>e.customers),total=cs.length,buyers=cs.filter(c=>c.combo_orders>0).length,orders=cs.reduce((n,c)=>n+(c.combo_orders||0),0),closed=cs.reduce((n,c)=>n+(c.closed_orders||0),0),repeat=cs.filter(c=>c.multiple_same_day).length;
 const vals=[['👥','Tổng KH tham gia',total,''],['🛒','KH đã mua Combo',buyers,fmtPct(total?buyers/total*100:0)],['📋','Tổng đơn Combo',orders,''],['✓','Đơn Đã Đóng',closed,fmtPct(orders?closed/orders*100:0)],['🚚','Đơn chưa Đã Đóng',orders-closed,fmtPct(orders?(orders-closed)/orders*100:0)],['⚠','KH >1 đơn cùng ngày',repeat,'']];
 return '<div class="combo-kpi-grid">'+vals.map((v,i)=>'<div class="combo-kpi-card combo-kpi-'+i+'"><span class="combo-kpi-icon" aria-hidden="true">'+v[0]+'</span><div><small>'+v[1]+'</small><strong>'+fmtMoney(v[2])+'</strong>'+(v[3]?'<em>'+v[3]+'</em>':'')+'</div></div>').join('')+'</div>';
}
function comboSection(){
 const people=sales?.employees||[];
 const items=people.map(p=>({id:p.id,name:p.name,customers:comboData?.employees.find(e=>e.name===p.name)?.customers||[]}));
 const rows=items.map(e=>comboEmployeeRow(e)).join('');
 const total=comboPilot?.summary,closed=total?.closed_orders;
 const pilotBanner=total?'<div class="fundamental-warning combo-pilot-banner"><span aria-hidden="true">ⓘ</span><div><strong>COMBO · Actual 16/10 · PILOT:</strong> '+fmtMoney(total.buyers)+'/'+fmtMoney(total.participants)+' KH mua ('+fmtPct(total.participants?total.buyers/total.participants*100:0)+'), '+fmtMoney(total.orders)+' đơn'+(Number.isFinite(closed)?', '+fmtMoney(closed)+' Đã Đóng, '+fmtMoney(total.orders-closed)+' chưa Đã Đóng':'')+'; '+fmtMoney(total.repeat_same_day_customers)+' KH >1 đơn cùng ngày. <small>SKU 03NM00789, dòng tổng tiền = 0; đếm đơn duy nhất, không phải kết quả thưởng chính thức.</small></div></div>':'';
 const warning=comboError?'<p class="notice error">'+escapeHTML(comboError)+'</p>':'';
 const sourceNote=comboData?'<p class="hvdn-hint">Danh sách COMBO.xlsx · RAW đến 16/10/2026 · Nhấn tên NVBH để xem Actual từng KH.</p>':'<p class="fundamental-warning">Chưa tải được danh sách khách hàng Combo. Không hiển thị số liệu cấp NVBH khi chưa có dữ liệu.</p>';
 return '<section id="hvdn-anchor-c" class="hvdn-combo-section"><div class="combo-hero"><span class="combo-hero-icon" aria-hidden="true">🎁</span><div><h2 class="hvdn-section-title">C. Đơn hàng Combo</h2><p>Theo dõi khách hàng tham gia chương trình Combo theo từng NVBH</p></div><span class="combo-cutoff">▣ Dữ liệu đến: 16/10/2026</span></div>'+pilotBanner+warning+comboKpiCards(items)+sourceNote+comboTeamSummary(items)+rows+'</section>';
}

const oldComboPage=hvdn;
hvdn=function(){const html=oldComboPage();const start=html.indexOf('<section id="hvdn-anchor-c"');return start<0?html:html.slice(0,start)+comboSection()+'</div>';};
function comboEmployeeRow(e){
 const m=comboMetrics(e.customers),open=comboOpenEmployee===e.id;
 const stats=[['👥','KH tham gia',comboData?fmtMoney(e.customers.length):'—'],['🛒','KH mua ≥1 đơn',m.ready?fmtMoney(m.buyers):'—'],['◉','% KH đã mua',m.ready?fmtPct(m.pct):'—'],['📋','Tổng đơn Combo',m.ready?fmtMoney(m.orders):'—'],['▣','>1 đơn cùng ngày',m.ready?(m.repeat?'CẢNH BÁO':'Không'):'—']];
 return '<div class="combo-employee combo-employee-modern"><button class="combo-employee-toggle" data-combo-employee="'+escapeHTML(e.id)+'" aria-expanded="'+open+'"><span class="combo-person-icon" aria-hidden="true">●</span><strong>'+escapeHTML(e.name)+'</strong><span class="combo-inline-stats">'+stats.map((v,i)=>'<span class="combo-inline-stat"><span class="combo-stat-symbol" aria-hidden="true">'+v[0]+'</span><span><small>'+v[1]+'</small><b class="'+(i===2?'combo-rate':'')+'">'+v[2]+'</b></span></span>').join('')+'</span><span class="combo-chevron">'+(open?'⌄':'›')+'</span></button>'+(open?comboDetailTable(e.customers):'')+'</div>';
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
