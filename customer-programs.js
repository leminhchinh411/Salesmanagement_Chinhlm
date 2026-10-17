'use strict';
let hvdnData=null,hvdnError='',hvdnOpenEmployee=null,hvdnOpenProgram=null,hvdnRevenuePilot=null,hvdnMappingAudit=null,hvdnEmployeePilot=null,hvdnBucketsPilot=null;
const HVDN_BUCKETS=[{key:'participants',label:'KH tham gia'},{key:'with_sales',label:'KH đã PSDS'},{key:'under_50',label:'DS <50%'},{key:'from_50_to_80',label:'DS 50–<80%'},{key:'from_80_to_100',label:'DS 80–<100%'},{key:'at_least_100',label:'DS ≥100%'},{key:'qualified',label:'KH đạt chương trình'}];
async function loadHvdn(){
 hvdnData=null;hvdnError='';hvdnRevenuePilot=null;hvdnMappingAudit=null;hvdnEmployeePilot=null;hvdnBucketsPilot=null;
 try{const r=await fetch('data/hvdn-buckets-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.employees?.length===11&&p.team?.at_least_100===10)hvdnBucketsPilot=p;}}catch(_){}
 try{const r=await fetch('data/hvdn-employee-summary-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.employees?.length===11)hvdnEmployeePilot=p;}}catch(_){}
 try{const r=await fetch('data/hvdn-452-mapping-audit-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.cutoff_date==='2026-10-16'&&p.mappings?.length===17)hvdnMappingAudit=p;}}catch(_){}
 try{const pr=await fetch('data/cat-brand-revenue-pilot-20261016.json?v='+Date.now(),{cache:'no-store'});if(pr.ok){const p=await pr.json();if(p.status==='PILOT'&&p.cutoff_date==='2026-10-16')hvdnRevenuePilot=p;}}catch(_){}
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
// CV452: CAT/BRAND do not apply SKU MOQ.
function hvdnTaskStatus(c,t){
 const label=String(t.name||'').trim().toLocaleLowerCase('vi');
 const audit=hvdnMappingAudit?.mappings?.find(m=>m.program===c.program&&String(m.task).trim().toLocaleLowerCase('vi')===label&&m.type===t.type);
 if(audit&&audit.status==='REVIEW_NO_SKU_IN_REV3')return 'REVIEW';
 if(c.program==='BRAND'&&label==='chinsu story')return 'REVIEW'; // Historical exception needs store-specific evidence
 return Number.isFinite(t.actual)&&t.actual>=200000?'PASS':'FAIL';
}
function hvdnEligibility(c){
 const focus=c.tasks.filter(t=>t.type==='FOCUS'),news=c.tasks.filter(t=>t.type==='NEW');
 const needNew=['CAT1','CAT3','BRAND1','BRAND3'].includes(c.tier)&&news.length>0;
 const missingFocus=focus.filter(t=>hvdnTaskStatus(c,t)==='FAIL'),reviewFocus=focus.filter(t=>hvdnTaskStatus(c,t)==='REVIEW');
 const hasNew=news.some(t=>hvdnTaskStatus(c,t)==='PASS');
 const missingNew=needNew&&!hasNew?news.filter(t=>hvdnTaskStatus(c,t)==='FAIL'):[];
 const reviewNew=needNew&&!hasNew?news.filter(t=>hvdnTaskStatus(c,t)==='REVIEW'):[];
 const basePass=c.target>0&&c.actual>=c.target;
 const failed=!basePass||missingFocus.length>0||(needNew&&!hasNew&&!reviewNew.length);
 const uncertain=!failed&&(reviewFocus.length>0||reviewNew.length>0);
 return {result:failed?'CHƯA ĐẠT':uncertain?'CHƯA ĐỦ CĂN CỨ':'ĐẠT DỰ KIẾN',needNew,focus,news,hasNew,missingFocus,reviewFocus,missingNew,reviewNew};
}
function hvdnSummary(customers){
 const b={participants:customers.length,with_sales:0,under_50:0,from_50_to_80:0,from_80_to_100:0,at_least_100:0,qualified:0};
 customers.forEach(c=>{
  if(c.actual>0)b.with_sales++;
  const p=c.actual/c.target*100;
  if(p<50)b.under_50++;else if(p<80)b.from_50_to_80++;else if(p<100)b.from_80_to_100++;else b.at_least_100++;
  if(hvdnEligibility(c).result==='ĐẠT DỰ KIẾN')b.qualified++;
 });
 return b;
}
function hvdn(){
 const people=sales?.employees||[];
 const entries=people.map(p=>({id:p.id,name:p.name,customers:hvdnData?.employees.find(e=>e.id===p.id)?.customers||[]}));
 const total=hvdnSummary(entries.flatMap(e=>e.customers));
 const heading='<tr><th>NVBH</th>'+HVDN_BUCKETS.map(b=>'<th>'+escapeHTML(b.label)+'</th>').join('')+'</tr>';
 const summaryRow=(name,c,team=false)=>{const n=hvdnSummary(c);return '<tr class="'+(team?'hvdn-team':'')+'"><th>'+escapeHTML(name)+'</th>'+HVDN_BUCKETS.map(b=>'<td>'+ (hvdnData?fmtMoney(n[b.key]):'—')+'</td>').join('')+'</tr>';};
 const currentSummary=hvdnEmployeePilot?'<section class="hvdn-card"><h3>Thẻ 1A · Tổng hợp mới nhất 16/10 — CAT / BRAND (không MOQ)</h3><p class="hvdn-hint">DS sau chiết khấu; KH đạt ngưỡng nền chưa đồng nghĩa đạt chương trình. Thẻ 1 và Thẻ 2 phía dưới vẫn dùng snapshot chi tiết 15/10.</p><div class="hvdn-scroll"><table class="hvdn-table"><tr><th>NVBH</th><th>CAT KH</th><th>CAT DS</th><th>CAT đạt nền</th><th>BRAND KH</th><th>BRAND DS</th><th>BRAND đạt nền</th></tr>'+[...hvdnEmployeePilot.employees,{id:'TEAM',cat:{participants:178,actual_vnd:771921920.62,baseline_pass_customers:8},brand:{participants:102,actual_vnd:622529310.05,baseline_pass_customers:2}}].map(e=>{const n=e.id==='TEAM'?'TỔNG TEAM':people.find(p=>p.id===e.id)?.name||e.id;return '<tr><th>'+escapeHTML(n)+'</th><td>'+fmtMoney(e.cat.participants)+'</td><td>'+fmtMoney(e.cat.actual_vnd)+'</td><td>'+fmtMoney(e.cat.baseline_pass_customers)+'</td><td>'+fmtMoney(e.brand.participants)+'</td><td>'+fmtMoney(e.brand.actual_vnd)+'</td><td>'+fmtMoney(e.brand.baseline_pass_customers)+'</td></tr>';}).join('')+'</table></div></section>':'';
 const displayBuckets=hvdnBucketsPilot?Object.fromEntries(hvdnBucketsPilot.employees.map(e=>[e.id,e])):null;
 const currentBucketRow=(name,b,team=false)=>'<tr class="'+(team?'hvdn-team':'')+'"><th>'+escapeHTML(name)+'</th>'+HVDN_BUCKETS.map(k=>'<td>'+(b?.[k.key]===null||b?.[k.key]===undefined?'—':fmtMoney(b[k.key]))+'</td>').join('')+'</tr>';
 const summary='<section class="hvdn-card"><h3>Thẻ 1 · Tổng hợp Hội Viên Doanh Nhân · '+(hvdnBucketsPilot?'16/10':'15/10')+'</h3><div class="hvdn-scroll"><table class="hvdn-table">'+heading+(hvdnBucketsPilot?currentBucketRow('TỔNG TEAM',hvdnBucketsPilot.team,true)+entries.map(e=>currentBucketRow(e.name,displayBuckets[e.id])).join(''):summaryRow('TỔNG TEAM',entries.flatMap(e=>e.customers),true)+entries.map(e=>summaryRow(e.name,e.customers)).join(''))+'</table></div></section>';
 const taskDetail=c=>{
  const e=hvdnEligibility(c);
  const missing=[...e.missingFocus,...e.reviewFocus,...(e.needNew&&!e.hasNew?[...e.missingNew,...e.reviewNew]:[])];
  return {missing,countNeeded:e.focus.length+(e.needNew?1:0),countAchieved:e.focus.filter(t=>hvdnTaskStatus(c,t)==='PASS').length+(e.needNew&&e.hasNew?1:0),note:e.result+(e.reviewFocus.length+e.reviewNew.length?' · SKU REVIEW':'')};
 };
 const details=entries.map(e=>{
  const opened=hvdnOpenEmployee===e.id;
  return '<div class="hvdn-employee"><button class="hvdn-toggle" data-hvdn-employee="'+escapeHTML(e.id)+'" aria-expanded="'+opened+'"><strong>'+escapeHTML(e.name)+'</strong><span>'+ (hvdnData?e.customers.length+' KH':'Chờ dữ liệu')+' '+(opened?'▾':'▸')+'</span></button>'+
  (opened?['CAT','BRAND'].map(program=>{
   const cs=e.customers.filter(c=>c.program===program),key=e.id+':'+program,open=hvdnOpenProgram===key;
   return '<div class="hvdn-program"><button class="hvdn-toggle hvdn-subtoggle" data-hvdn-program="'+escapeHTML(key)+'" aria-expanded="'+open+'"><strong>TĂNG '+program+'</strong><span>'+cs.length+' KH '+(open?'▾':'▸')+'</span></button>'+
   (open?'<div class="hvdn-scroll"><table class="hvdn-table"><tr><th>Khách hàng</th><th>Chỉ tiêu DS</th><th>Thực đạt</th><th>% DS</th><th>DS còn lại</th><th>Cần ≥200k</th><th>Đã đạt ≥200k</th><th>Ngành/Nhãn còn thiếu</th><th>Ghi chú</th></tr>'+
   cs.map(c=>{const t=taskDetail(c);return '<tr><th>'+escapeHTML(c.name||c.id)+'</th><td>'+fmtMoney(c.target)+'</td><td>'+fmtMoney(c.actual)+'</td><td>'+programPct(progress(c.actual,c.target))+'</td><td>'+fmtMoney(Math.max(0,c.target-c.actual))+'</td><td>'+t.countNeeded+'</td><td>'+t.countAchieved+'</td><td>'+escapeHTML(t.missing.map(v=>v.name).join(', ')||'—')+'</td><td>'+escapeHTML(t.note+(c.target>c.actual?' · Cửa hàng còn thiếu '+fmtMoney(c.target-c.actual)+'đ':'')+(t.missing.length?' · Ngành/nhãn còn thiếu: '+t.missing.map(v=>v.name).join(', '):''))+'</td></tr>';}).join('')+'</table></div>':'')+'</div>';
  }).join(''):'')+'</div>';
 }).join('');
 const freshness=(sales?.cutoff_date&&hvdnData?.cutoff_date&&sales.cutoff_date!==hvdnData.cutoff_date)?'<div class="notice error">DỮ LIỆU CHƯA ĐỒNG BỘ: Doanh số tổng chốt '+escapeHTML(sales.cutoff_date)+' nhưng CAT/BRAND mới chốt '+escapeHTML(hvdnData.cutoff_date)+'. Các kết quả chương trình bên dưới là PILOT kỳ cũ, không dùng để xác nhận đạt thưởng.</div>':'';
 const mappingBanner=hvdnMappingAudit?'<div class="fundamental-warning"><strong>Đối chiếu CV 452 / REV3 / RAW đến 16/10 — PILOT:</strong> Đã xác định phạm vi 13/17 mapping; 4 mapping còn REVIEW (CAT Bia FOCUS/NEW, BRAND Red Ruby NEW, Sư Tử Trắng NEW). CAT: '+hvdnMappingAudit.summary.CAT.customers_above_monthly_revenue_target+' KH đạt ngưỡng DS nền; BRAND: '+hvdnMappingAudit.summary.BRAND.customers_above_monthly_revenue_target+' KH đạt ngưỡng DS nền. Đây KHÔNG phải số KH đạt thưởng; Chinsu Story cần kiểm tra lịch sử. Chi tiết KH bên dưới có thể dùng snapshot cũ.</div>':'';
 const pilotBanner=hvdnRevenuePilot?'<div class="fundamental-warning"><strong>PILOT 16/10 — DS khách hàng tham gia (sau CK), CHƯA xét FOCUS/NEW hoặc thưởng:</strong> CAT '+fmtMoney(hvdnRevenuePilot.cat.actual_after_discount_vnd)+'đ / '+hvdnRevenuePilot.cat.enrollments+' KH; BRAND '+fmtMoney(hvdnRevenuePilot.brand.actual_after_discount_vnd)+'đ / '+hvdnRevenuePilot.brand.enrollments+' KH. Các bảng chi tiết phía dưới có thể vẫn dùng snapshot cũ.</div>':'';
 return '<div class="hvdn-page">'+mappingBanner+pilotBanner+freshness+'<div class="hvdn-meta">Hội Viên Doanh Nhân · CAT/BRAND · 10/2026 · '+(hvdnData?'Chốt '+escapeHTML(hvdnData.cutoff_date||'—')+' · '+escapeHTML(hvdnData.status):'Chờ gói dữ liệu khách hàng')+'</div>'+
 (hvdnError?'<div class="notice error">'+escapeHTML(hvdnError)+'</div>':'')+
 (!hvdnData?'<div class="fundamental-warning">Chưa tải được dữ liệu thực tế Hội Viên; kiểm tra kết nối hoặc phiên bản gói dữ liệu.</div>':'')+
 currentSummary+summary+'<section class="hvdn-card"><h3>Thẻ 2 · Chi tiết thực hiện của khách hàng · snapshot 15/10</h3><p class="hvdn-hint">Bấm tên NVBH → TĂNG CAT / TĂNG BRAND → danh sách khách hàng.</p>'+details+'</section>'+
 '<p class="hvdn-hint">CAT/BRAND KHÔNG xét MOQ. Chi tiết từ RAW 15/10/2026, doanh số sau chiết khấu; điều kiện FOCUS/NEW tính theo CV452. Mapping 17 nhiệm vụ đối chiếu REV3, 4 nhóm thiếu SKU giữ REVIEW. Kết quả đạt là dự kiến, không phải công ty chốt.</p><p class="hvdn-hint">Các khoảng doanh số: &lt;50%; 50–&lt;80%; 80–&lt;100%; ≥100%. Đạt chương trình còn yêu cầu FOCUS/NEW và doanh số nền theo công văn. OLD không bắt buộc.</p></div>';
}
