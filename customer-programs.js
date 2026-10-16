'use strict';
let hvdnData=null,hvdnError='',hvdnOpenEmployee=null,hvdnOpenProgram=null;
const HVDN_BUCKETS=[{key:'participants',label:'KH tham gia'},{key:'with_sales',label:'KH đã PSDS'},{key:'under_50',label:'DS <50%'},{key:'from_50_to_80',label:'DS 50–<80%'},{key:'from_80_to_100',label:'DS 80–<100%'},{key:'at_least_100',label:'DS ≥100%'},{key:'qualified',label:'KH đạt chương trình'}];
async function loadHvdn(){
 hvdnData=null;hvdnError='';
 try{
  const r=await fetch('data/hvdn-public.json.gz.b64?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt không hỗ trợ giải nén dữ liệu; hãy cập nhật trình duyệt');
  const encoded=(await r.text()).trim();
  const compressed=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const x=JSON.parse(await new Response(stream).text());
  if(x.schema_version!==1||x.approved_for_public!==true||!['PILOT','PUBLISHED'].includes(x.status)||x.period!=='10/2026'||!Array.isArray(x.employees)||x.employees.length!==11)throw Error('Gói Hội Viên chưa đạt điều kiện hiển thị');
  const ids=new Set();
  for(const e of x.employees){
   if(!e.id||ids.has(e.id)||!Array.isArray(e.customers))throw Error('Trùng hoặc thiếu NVBH');
   ids.add(e.id);
   const customers=new Set();
   for(const c of e.customers){
    if(!c.id||customers.has(c.id)||!['CAT','BRAND'].includes(c.program)||!Number.isFinite(c.target)||c.target<=0||!Number.isFinite(c.actual)||c.actual<0||!Array.isArray(c.tasks))throw Error('Dữ liệu KH không hợp lệ');
    customers.add(c.id);
    if(c.tasks.some(t=>!['FOCUS','NEW','OLD'].includes(t.type)||!Number.isFinite(t.actual)||t.actual<0))throw Error('Nhiệm vụ KH không hợp lệ');
   }
  }
  if(sales&&x.employees.some(e=>!sales.employees.some(p=>p.id===e.id)))throw Error('Mã NVBH không khớp');
  hvdnData=x;
 }catch(e){hvdnError=e.message;}
}
function hvdnSummary(customers){
 const b={participants:customers.length,with_sales:0,under_50:0,from_50_to_80:0,from_80_to_100:0,at_least_100:0,qualified:0};
 customers.forEach(c=>{
  if(c.actual>0)b.with_sales++;
  const p=c.actual/c.target*100;
  if(p<50)b.under_50++;else if(p<80)b.from_50_to_80++;else if(p<100)b.from_80_to_100++;else b.at_least_100++;
  if(c.qualified===true)b.qualified++;
 });
 return b;
}
function hvdn(){
 const people=sales?.employees||[];
 const entries=people.map(p=>({id:p.id,name:p.name,customers:hvdnData?.employees.find(e=>e.id===p.id)?.customers||[]}));
 const total=hvdnSummary(entries.flatMap(e=>e.customers));
 const heading='<tr><th>NVBH</th>'+HVDN_BUCKETS.map(b=>'<th>'+escapeHTML(b.label)+'</th>').join('')+'</tr>';
 const summaryRow=(name,c,team=false)=>{const n=hvdnSummary(c);return '<tr class="'+(team?'hvdn-team':'')+'"><th>'+escapeHTML(name)+'</th>'+HVDN_BUCKETS.map(b=>'<td>'+ (hvdnData?fmtMoney(n[b.key]):'—')+'</td>').join('')+'</tr>';};
 const summary='<section class="hvdn-card"><h3>Thẻ 1 · Tổng hợp Hội Viên Doanh Nhân</h3><div class="hvdn-scroll"><table class="hvdn-table">'+heading+summaryRow('TỔNG TEAM',entries.flatMap(e=>e.customers),true)+entries.map(e=>summaryRow(e.name,e.customers)).join('')+'</table></div></section>';
 const taskDetail=c=>{
  const required=c.tasks.filter(t=>t.type==='FOCUS'||t.type==='NEW');
  const focus=required.filter(t=>t.type==='FOCUS'),newTasks=required.filter(t=>t.type==='NEW');
  const unmetFocus=focus.filter(t=>!(t.passed===true));
  const unmetNew=newTasks.filter(t=>t.actual<200000);
  const needNew=['CAT1','CAT3','BRAND1','BRAND3'].includes(c.tier)&&newTasks.length>0;
  const missing=[...unmetFocus,...(needNew&&newTasks.every(t=>t.passed!==true)?unmetNew:[])];
  const note=needNew?'Tối thiểu 1':'Mua đủ';
  const countNeeded=focus.length+(needNew?1:0);
  const countAchieved=focus.filter(t=>t.passed===true).length+(needNew&&newTasks.some(t=>t.passed===true)?1:0);
  return {missing,countNeeded,countAchieved,note};
 };
 const details=entries.map(e=>{
  const opened=hvdnOpenEmployee===e.id;
  return '<div class="hvdn-employee"><button class="hvdn-toggle" data-hvdn-employee="'+escapeHTML(e.id)+'" aria-expanded="'+opened+'"><strong>'+escapeHTML(e.name)+'</strong><span>'+ (hvdnData?e.customers.length+' KH':'Chờ dữ liệu')+' '+(opened?'▾':'▸')+'</span></button>'+
  (opened?['CAT','BRAND'].map(program=>{
   const cs=e.customers.filter(c=>c.program===program),key=e.id+':'+program,open=hvdnOpenProgram===key;
   return '<div class="hvdn-program"><button class="hvdn-toggle hvdn-subtoggle" data-hvdn-program="'+escapeHTML(key)+'" aria-expanded="'+open+'"><strong>TĂNG '+program+'</strong><span>'+cs.length+' KH '+(open?'▾':'▸')+'</span></button>'+
   (open?'<div class="hvdn-scroll"><table class="hvdn-table"><tr><th>Khách hàng</th><th>Chỉ tiêu DS</th><th>Thực đạt</th><th>% DS</th><th>DS còn lại</th><th>Cần ≥200k</th><th>Đã đạt ≥200k</th><th>Ngành/Nhãn còn thiếu</th><th>Ghi chú</th></tr>'+
   cs.map(c=>{const t=taskDetail(c);return '<tr><th>'+escapeHTML(c.name||c.id)+'</th><td>'+fmtMoney(c.target)+'</td><td>'+fmtMoney(c.actual)+'</td><td>'+fmtPct(progress(c.actual,c.target))+'</td><td>'+fmtMoney(Math.max(0,c.target-c.actual))+'</td><td>'+t.countNeeded+'</td><td>'+t.countAchieved+'</td><td>'+escapeHTML(t.missing.map(v=>v.name).join(', ')||'—')+'</td><td>'+t.note+'</td></tr>';}).join('')+'</table></div>':'')+'</div>';
  }).join(''):'')+'</div>';
 }).join('');
 return '<div class="hvdn-page"><div class="hvdn-meta">Hội Viên Doanh Nhân · CAT/BRAND · 10/2026 · '+(hvdnData?'Chốt '+escapeHTML(hvdnData.cutoff_date||'—')+' · '+escapeHTML(hvdnData.status):'Chờ gói dữ liệu khách hàng')+'</div>'+
 (hvdnError?'<div class="notice error">'+escapeHTML(hvdnError)+'</div>':'')+
 (!hvdnData?'<div class="fundamental-warning">Chưa tải được dữ liệu thực tế Hội Viên; kiểm tra kết nối hoặc phiên bản gói dữ liệu.</div>':'')+
 summary+'<section class="hvdn-card"><h3>Thẻ 2 · Chi tiết thực hiện của khách hàng</h3><p class="hvdn-hint">Bấm tên NVBH → TĂNG CAT / TĂNG BRAND → danh sách khách hàng.</p>'+details+'</section>'+
 '<p class="hvdn-hint">PILOT: Actual từ RAW 15/10/2026, doanh số sau chiết khấu; ánh xạ SKU/ngành nhãn theo Mapping 79 nhiệm vụ CANDIDATE. Trạng thái đạt là dự kiến, không phải công ty chốt.</p><p class="hvdn-hint">Các khoảng doanh số: &lt;50%; 50–&lt;80%; 80–&lt;100%; ≥100%. Đạt chương trình còn yêu cầu FOCUS/NEW và doanh số nền theo công văn. OLD không bắt buộc.</p></div>';
}
