'use strict';
// Combo program module. Awaiting eligible customer list and order reconciliation.
let comboData=null,comboError='',comboOpenEmployee=null;
function programPct(value){return Number.isFinite(value)?'<span class="program-percent '+(value>=100?'program-percent-ok':'program-percent-low')+'">'+fmtPct(value)+'</span>':'—';}
async function loadCombo(){
 comboData=null;comboError='';
 try{
  const r=await fetch('data/combo-participants.json.gz.b64?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  const bytes=Uint8Array.from(atob((await r.text()).trim()),c=>c.charCodeAt(0));
  const x=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
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
function comboSection(){
 const people=sales?.employees||[];
 const items=people.map(p=>({id:p.id,name:p.name,customers:comboData?.employees.find(e=>e.name===p.name)?.customers||[]}));
 const rows=items.map(e=>comboEmployeeRow(e)).join('');
 return '<section id="hvdn-anchor-c" class="hvdn-combo-section"><h2 class="hvdn-section-title">C. Đơn hàng Combo</h2><p class="hvdn-hint">Đơn có SKU 03NM00789 với thành tiền dòng = 0; đếm mã đơn duy nhất, cảnh báo trên 1 đơn cùng ngày tạo.</p>'+(comboError?'<p class="notice error">'+escapeHTML(comboError)+'</p>':'')+(!comboData?'<p class="fundamental-warning">Chờ dữ liệu danh sách Combo.</p>':'<p class="hvdn-hint">Danh sách tham gia đã xác nhận. Số đơn và trạng thái mua đang chờ đối soát RAW.</p>')+rows+'</section>';
}
const oldComboPage=hvdn;
hvdn=function(){const html=oldComboPage();const start=html.indexOf('<section id="hvdn-anchor-c"');return start<0?html:html.slice(0,start)+comboSection()+'</div>';};
function comboEmployeeRow(e){
 const m=comboMetrics(e.customers),open=comboOpenEmployee===e.id;
 return '<div class="combo-employee"><button class="combo-employee-toggle" data-combo-employee="'+escapeHTML(e.id)+'"><strong>'+escapeHTML(e.name)+'</strong><span>'+(open?'▾':'▸')+'</span></button><div class="combo-metrics"><span>KH tham gia <b>'+(comboData?fmtMoney(e.customers.length):'—')+'</b></span><span>KH mua ≥1 đơn <b>'+(m.ready?fmtMoney(m.buyers):'—')+'</b></span><span>% KH đã mua <b>'+programPct(m.pct)+'</b></span><span>Tổng đơn Combo <b>'+(m.ready?fmtMoney(m.orders):'—')+'</b></span><span>>1 đơn cùng ngày <b>'+(m.ready?(m.repeat?'CÓ CẢNH BÁO':'Không'):'—')+'</b></span></div>'+(open?comboDetailTable(e.customers):'')+'</div>';
}
function comboDetailTable(cs){
 const sorted=[...cs].sort((a,b)=>(a.channel==='OFF'?0:1)-(b.channel==='OFF'?0:1)||a.name.localeCompare(b.name,'vi'));
 return '<div class="hvdn-scroll"><table class="hvdn-table combo-table"><thead><tr><th>Khách hàng</th><th>Số đơn Combo</th><th>>1 đơn cùng ngày</th></tr></thead><tbody>'+sorted.map(c=>'<tr><th>'+escapeHTML(c.name)+' <span class="growth-channel growth-'+(c.channel==='OFF'?'off':'on')+'">'+escapeHTML(c.channel)+'</span><small>'+escapeHTML(c.id)+'</small></th><td>'+(Number.isInteger(c.combo_orders)?fmtMoney(c.combo_orders):'—')+'</td><td>'+(c.multiple_same_day===true?'<span class="combo-alert">CẢNH BÁO</span>':c.multiple_same_day===false?'Không':'—')+'</td></tr>').join('')+'</tbody></table></div>';
}
