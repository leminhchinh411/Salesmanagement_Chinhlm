'use strict';
let growthData=null,growthError='',growthEmployeeOpen=null,growthQuery='',growthChannels={},growthCandidatePilot=null,growthRemainingPilot=null,growthCustomerPilot=null,growthConfirmedSummary=null,growthEmployeeConfirmed=null;
const GROWTH_NAMES=[['gia_vi','Gia Vị'],['bfast',"Ngũ Cốc B'Fast"],['ponnie','Ponnie'],['tra_bup_non','Trà Búp Non'],['chante','Chanté'],['ca_phe','Cà Phê']];
async function loadGrowthTargets(){
 growthData=null;growthError='';
 growthCandidatePilot=null;growthRemainingPilot=null;
 growthConfirmedSummary=null;growthEmployeeConfirmed=null;
 try{const r=await fetch('data/growth-summary-user-confirmed-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.schema_version===2&&p.cutoff_date==='2026-10-16')growthConfirmedSummary=p;}}catch(_){}
 try{const r=await fetch('data/growth-employee-confirmed-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.schema_version===1&&p.cutoff_date==='2026-10-16'&&p.status==='PILOT'&&GROWTH_NAMES.every(([id])=>{const v=p.programs?.[id],c=growthConfirmedSummary?.programs?.[id];return v&&c&&Object.keys(v.employees).length===11&&v.totals.every((n,i)=>Math.abs(n-[c.participants,c.target_vnd,c.actual_vnd,c.closed_vnd,c.threshold_pass][i])<=.05)}))growthEmployeeConfirmed=p;}}catch(_){}
 try{const r=await fetch('data/growth-remaining-candidate-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.employees?.length===11)growthRemainingPilot=p;}}catch(_){}
 try{const r=await fetch('data/growth-employee-candidate-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.employees?.length===11)growthCandidatePilot=p;}}catch(_){}
 try{
  const r=await fetch('data/growth-targets.json.gz.b64?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt chưa hỗ trợ giải nén gzip');
  const a=Uint8Array.from(atob((await r.text()).trim()),c=>c.charCodeAt(0));
  const x=JSON.parse(await new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  if(x.schema_version!==1||x.period!=='10/2026'||x.approved_for_public!==true||!Array.isArray(x.employees)||x.employees.length!==11)throw Error('Master chỉ tiêu không hợp lệ');
  const ids=new Set();
  for(const e of x.employees)for(const c of e.customers){
   if(!c.id||ids.has(c.id))throw Error('Trùng mã khách hàng');
   ids.add(c.id);
   for(const p of Object.values(c.programs))if(!Number.isFinite(p.target)||p.target<=0)throw Error('Chỉ tiêu không hợp lệ');
  }
  // Overlay 16/10 RAW customer Actual on the verified customer/target roster.
  growthCustomerPilot=null;
  try{
   const ar=await fetch('data/growth-customer-actual-20261016.json.gz.b64?v='+Date.now(),{cache:'no-store'});
   if(!ar.ok)throw Error('HTTP '+ar.status);
   if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt không hỗ trợ giải nén');
   const ab=Uint8Array.from(atob((await ar.text()).trim()),k=>k.charCodeAt(0));
   const overlay=JSON.parse(await new Response(new Blob([ab]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
   if(overlay.cutoff_date!=='2026-10-16'||overlay.status!=='PILOT'||!Array.isArray(overlay.customers)||overlay.customers.length!==5627)throw Error('Gói Actual khách hàng không hợp lệ');
   const customerMap=new Map(x.employees.flatMap(e=>e.customers.map(c=>[String(c.id),{customer:c,employee:e}])));
   const seen=new Set(),actualTotals={},missing=[];
   for(const row of overlay.customers){
    const [id,program,employeeId,target,actual,closed,alternate]=row,key=id+'|'+program;
    if(seen.has(key)||!Number.isFinite(actual)||actual<0||!Number.isFinite(closed)||closed<0||!Number.isFinite(target)||target<=0)throw Error('Actual trùng hoặc không hợp lệ: '+key);
    seen.add(key);
    const dest=customerMap.get(String(id));
    if(!dest){missing.push(id);continue;}
    if(dest.employee.id&&employeeId!==dest.employee.id)throw Error('Mã NVBH không khớp cho KH '+id);
    if(!dest.customer.programs)dest.customer.programs={};
    const prev=dest.customer.programs[program]||{};
    dest.customer.programs[program]={...prev,target,actual,closed,remaining:Math.max(0,target-actual),pct:actual/target*100,threshold_pass_candidate:actual>=target,target_conflict:alternate!==null&&Math.abs(alternate-target)>0.01,alternate_target:alternate,qualified:null,actual_cutoff:'2026-10-16',actual_status:'PILOT'};
    actualTotals[program]=(actualTotals[program]||0)+actual;
   }
   if(missing.length)throw Error('Không tìm thấy '+missing.length+' mã KH trong Master; không hiển thị dữ liệu ghép thiếu');
   for(const [program,p] of Object.entries(overlay.programs||{}))if(Math.abs((actualTotals[program]||0)-p.actual_vnd)>1)throw Error('Lệch tổng doanh số '+program);
   growthCustomerPilot={...overlay,validated_records:seen.size};
  }catch(err){growthError='Actual KH chưa đồng bộ: '+err.message;}
  growthData=x;
  growthChannels={};
  try{const cr=await fetch('data/growth-channel.json.gz.b64?v='+Date.now(),{cache:'no-store'});if(cr.ok){const raw=Uint8Array.from(atob((await cr.text()).trim()),c=>c.charCodeAt(0));const ch=JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());if(ch.schema_version===1&&ch.period===x.period&&ch.channels)growthChannels=ch.channels;}}catch(err){growthError='Không tải được phân loại ON/OFF: '+err.message;}
 }catch(e){growthError=e.message;}
}
function growthNumber(v){return Number.isFinite(v)?fmtMoney(v):'—';}
function growthPct(v){return v&&Number.isFinite(v.actual)&&Number.isFinite(v.target)?programPct(progress(v.actual,v.target)):'—';}
function growthNote(c){
 return GROWTH_NAMES.map(([id,name])=>{const v=c.programs?.[id];return v?.target_conflict?'Lệch chỉ tiêu Ponnie · '+name:v&&Number.isFinite(v.actual)&&v.actual<v.target?'Còn '+growthNumber(v.target-v.actual)+'đ · '+name:null;}).filter(Boolean).join('; ')||(growthCustomerPilot?'Đạt ngưỡng doanh số ứng viên; chưa chốt thưởng':'Chưa có Actual đối soát');
}
function growthChannel(c){const v=String(c.channel||c.l1||growthChannels[String(c.id)]||'').toUpperCase();return v==='OFF'||v==='ON'?v:null;}
function growthSorted(customers){return [...customers].sort((a,b)=>{const rank=x=>growthChannel(x)==='OFF'?0:growthChannel(x)==='ON'?1:2;return rank(a)-rank(b)||String(a.name||'').localeCompare(String(b.name||''),'vi');});}
function growthTable(customers){
 return '<div class="hvdn-scroll growth-scroll"><table class="hvdn-table growth-wide"><colgroup><col class="growth-col-customer">'+GROWTH_NAMES.map(()=>'<col class="growth-col-number"><col class="growth-col-number"><col class="growth-col-number"><col class="growth-col-number">').join('')+'<col class="growth-col-note"></colgroup><thead><tr><th class="growth-header-customer" rowspan="2">Khách hàng / Mã KH</th>'+GROWTH_NAMES.map(p=>'<th class="growth-program-heading" colspan="4">'+escapeHTML(p[1])+'</th>').join('')+'<th class="growth-header-note" rowspan="2">Ghi chú</th></tr><tr>'+GROWTH_NAMES.map(()=>'<th>Chỉ tiêu</th><th>Thực hiện</th><th>Còn lại</th><th>% TH</th>').join('')+'</tr></thead><tbody>'+growthSorted(customers).map(c=>'<tr><th class="growth-customer">'+escapeHTML(c.name)+' '+(growthChannel(c)?'<span class="growth-channel growth-'+growthChannel(c).toLowerCase()+'">'+growthChannel(c)+'</span>':'')+'<small>'+escapeHTML(c.id)+'</small></th>'+GROWTH_NAMES.map(([id])=>{const v=c.programs?.[id];const assigned=v&&Number.isFinite(v.target);const hasActual=assigned&&Number.isFinite(v.actual);const actual=hasActual?v.actual:null;return '<td>'+growthNumber(v?.target)+(v?.target_conflict?' ⚠':'')+'</td><td title="Đã Đóng: '+growthNumber(v?.closed)+'đ · Actual: '+(v?.actual_cutoff||'chưa có')+'">'+(hasActual?growthNumber(actual):assigned?'<span class="growth-missing" title="Chưa có Actual đối soát">Chưa có</span>':'—')+'</td><td>'+(hasActual?growthNumber(Math.max(0,v.target-actual)):'—')+'</td><td>'+(hasActual?programPct(v.target?actual/v.target*100:0):'—')+'</td>';}).join('')+'<td>'+escapeHTML(growthNote(c))+'</td></tr>').join('')+'</tbody></table></div>';
}
let growthSelectedProgram=null;
function growthProgramEmployees(programId){
 const d=growthEmployeeConfirmed?.programs?.[programId];
 if(!d)return '<tr class="growth-program-detail-row"><td colspan="6">Chưa tải được Actual NVBH đã đối soát.</td></tr>';
 const people=sales?.employees||[];
 const rows=Object.entries(d.employees).map(([id,v])=>{
  const name=people.find(p=>String(p.id||'').endsWith('.'+id))?.name||id;
  return '<tr><th>'+escapeHTML(name)+'</th><td>'+fmtMoney(v[0])+'</td><td>'+growthNumber(v[1])+'</td><td>'+growthNumber(v[2])+'</td><td>'+fmtMoney(v[4])+'</td><td>'+fmtPct(v[1]?100*v[2]/v[1]:0)+'</td></tr>';
 }).join('');
 const t=d.totals;
 return '<tr class="growth-program-detail-row"><td colspan="6"><div class="growth-program-drill"><h4>Actual 11 NVBH · 16/10</h4><table class="hvdn-table growth-drill-table"><thead><tr><th>NVBH</th><th>KH có chỉ tiêu</th><th>Chỉ tiêu</th><th>Thực hiện</th><th>KH đạt ngưỡng</th><th>% TH</th></tr></thead><tbody>'+rows+'<tr class="hvdn-team"><th>TỔNG TEAM</th><td>'+fmtMoney(t[0])+'</td><td>'+growthNumber(t[1])+'</td><td>'+growthNumber(t[2])+'</td><td>'+fmtMoney(t[4])+'</td><td>'+fmtPct(t[1]?100*t[2]/t[1]:0)+'</td></tr></tbody></table><p class="hvdn-hint">Đã Đóng: '+growthNumber(t[3])+'đ · KH đạt ngưỡng là PILOT, chưa chốt thưởng.</p></div></td></tr>';
}
function growthSummary(){
 const cs=(growthData?.employees||[]).flatMap(e=>e.customers);
 const cells=GROWTH_NAMES.map(([id,name])=>{
  const v=cs.map(c=>c.programs?.[id]).filter(p=>p&&Number.isFinite(p.target));
  const confirmed=growthConfirmedSummary?.programs?.[id];
  const customerRows=growthCustomerPilot?.programs?.[id];
  const sum=confirmed?.target_vnd??v.reduce((a,p)=>a+p.target,0);
  const actual=confirmed?.actual_vnd??customerRows?.actual_vnd??growthRemainingPilot?.programs?.[id]?.actual_vnd??growthCandidatePilot?.programs?.[id]?.actual_vnd;
  const pass=Number.isInteger(confirmed?.threshold_pass)?confirmed.threshold_pass:null;
  const candidatePass=Number.isInteger(customerRows?.threshold_pass_candidate)?customerRows.threshold_pass_candidate:null;
  const count=pass??candidatePass;
  const participants=confirmed?.participants??v.length;
  const label=confirmed?'PILOT · phạm vi đã xác nhận · 16/10':growthCustomerPilot?'PILOT · 16/10':'Chưa có Actual KH';
  const button='<button type="button" class="growth-program-button" data-growth-program="'+id+'" aria-expanded="'+(growthSelectedProgram===id)+'"><span aria-hidden="true">▦</span> '+escapeHTML(name)+' <span class="growth-program-arrow">'+(growthSelectedProgram===id?'▾':'▸')+'</span></button>';
  return '<tr class="growth-program-row"><th>'+button+'</th><td>'+fmtMoney(participants)+'</td><td>'+growthNumber(sum)+'</td><td>'+(Number.isFinite(actual)?growthNumber(actual)+' *':'—')+'</td><td>'+(Number.isInteger(count)?fmtMoney(count)+' *':'—')+'</td><td>'+label+'</td></tr>'+(growthSelectedProgram===id?growthProgramEmployees(id):'');
 }).join('');
 return '<p class="hvdn-hint"><strong>Chọn tên chương trình để xem 11 NVBH theo cùng trục chỉ số.</strong> KH đạt ngưỡng doanh số (PILOT) là số KH có Actual ≥ ngưỡng chương trình tại 16/10, chưa xét Đã Đóng, thời hạn hoặc quyết toán thưởng. Tổng hợp theo phạm vi đã xác nhận; chi tiết NVBH vẫn là SKU ứng viên và chưa đồng bộ.</p><div class="hvdn-scroll"><table class="hvdn-table growth-summary-table"><thead><tr><th>Chương trình</th><th>KH có chỉ tiêu</th><th>Tổng chỉ tiêu/ngưỡng</th><th>Thực hiện</th><th>KH đạt ngưỡng DS (PILOT)</th><th>Trạng thái</th></tr></thead><tbody>'+cells+'</tbody></table></div>';
}
function growthEmployeeActualSummary(){
 if(!growthCandidatePilot||!growthRemainingPilot)return '';
 const left=new Map(growthCandidatePilot.employees.map(e=>[e.id,e]));
 const right=new Map(growthRemainingPilot.employees.map(e=>[e.id,e]));
 const people=sales?.employees||[];
 const ids=people.length?people.map(p=>p.id):[...left.keys()];
 const labels={gia_vi:'Gia Vị',bfast:"Ngũ Cốc B'fast",ponnie:'Ponnie',tra_bup_non:'Trà Búp Non',chante:'Chanté',ca_phe:'Cà Phê'};
 const actual=(id,p)=>['gia_vi','ponnie','ca_phe'].includes(p)?left.get(id)?.programs?.[p]?.actual_vnd:right.get(id)?.actual_vnd?.[p];
 return '<section class="hvdn-card"><h3>Actual 6 chương trình theo 11 NVBH · PILOT 16/10</h3><p class="hvdn-hint">Đơn vị: đồng sau CK · SKU ứng viên, chưa xác nhận phạm vi công văn và thưởng. Không cộng doanh số sáu chương trình thành doanh số Team vì một SKU/KH có thể tham gia nhiều chương trình.</p><div class="hvdn-scroll"><table class="hvdn-table"><thead><tr><th>NVBH</th>'+GROWTH_NAMES.map(([id])=>'<th>'+labels[id]+'</th>').join('')+'</tr></thead><tbody>'+ids.map(id=>'<tr><th>'+escapeHTML(people.find(p=>p.id===id)?.name||id)+'</th>'+GROWTH_NAMES.map(([p])=>'<td>'+growthNumber(actual(id,p))+'</td>').join('')+'</tr>').join('')+'<tr class="hvdn-team"><th>TỔNG TEAM</th>'+GROWTH_NAMES.map(([p])=>'<td>'+growthNumber(growthRemainingPilot.programs[p]?.actual_vnd??growthCandidatePilot.programs[p]?.actual_vnd)+'</td>').join('')+'</tr></tbody></table></div></section>';
}
function growthSection(){
 const e=growthData?.employees||[];
 const correctedBanner=growthConfirmedSummary?'<div class="fundamental-warning"><strong>Actual tổng hợp 16/10 theo phạm vi SKU đã xác nhận:</strong> '+GROWTH_NAMES.map(([id,name])=>name+': '+fmtMoney(growthConfirmedSummary.programs[id]?.actual_vnd||0)+'đ').join(' | ')+'. Ponnie: nền × 120%; 50 KH vượt ngưỡng doanh số. Bảng chi tiết KH bên dưới vẫn dùng bản cũ, CHƯA ĐỒNG BỘ theo quy tắc mới, không dùng chốt thưởng. STK = Siêu Tiết Kiệm và NTCS = Nước tương CHIN-SU đã được xác nhận. Bảng Actual chi tiết KH vẫn cần đồng bộ theo quy tắc mới.</div>':'';
 const detailBanner=growthCustomerPilot?'<div class="fundamental-warning"><strong>Đã đối soát cấp KH · 16/10:</strong> '+growthCustomerPilot.validated_records+' cặp KH–chương trình, 6 chương trình, 11 NVBH. Thực hiện / Còn lại / % TH được tính theo RAW sau CK; Đã Đóng theo dõi riêng. Ponnie có '+growthCustomerPilot.programs.ponnie.conflicting_targets+' chỉ tiêu xung đột, chưa chốt đạt thưởng. Không áp MOQ.</div>':'';
 const byName=new Map(e.map(x=>[x.name,x.customers]));
 const people=sales?.employees||[];
 const employees=people.length?people.map(x=>({name:x.name,customers:byName.get(x.name)||[]})):e;
 const remainingBanner=growthRemainingPilot?'<div class="fundamental-warning"><strong>Actual 16/10 — Ngũ Cốc B’fast / Trà Búp Non / Chanté (PILOT, SKU ứng viên):</strong> '+[['bfast','Ngũ Cốc B’fast'],['tra_bup_non','Trà Búp Non'],['chante','Chanté']].map(([id,name])=>{const v=growthRemainingPilot.programs[id];return name+': '+fmtMoney(v.actual_vnd)+'đ / CT '+fmtMoney(v.target_vnd)+'đ · '+v.positive_customers+' KH có DS · '+v.threshold_pass_candidate+' KH vượt CT ứng viên';}).join(' | ')+' . Chưa đối soát công văn từng chương trình; chi tiết KH dùng Actual 16/10 khi tải gói mới.</div>':'';
 const candidateBanner=growthCandidatePilot?'<div class="fundamental-warning"><strong>PILOT 16/10 — Doanh số theo SKU ứng viên, chưa đủ điều kiện kết luận thưởng:</strong> Gia Vị '+fmtMoney(growthCandidatePilot.programs.gia_vi.actual_vnd)+'đ ('+growthCandidatePilot.programs.gia_vi.threshold_pass_candidate+' KH vượt ngưỡng tạm tính); Ponnie '+fmtMoney(growthCandidatePilot.programs.ponnie.actual_vnd)+'đ ('+growthCandidatePilot.programs.ponnie.threshold_pass_candidate+' KH); Cà Phê '+fmtMoney(growthCandidatePilot.programs.ca_phe.actual_vnd)+'đ ('+growthCandidatePilot.programs.ca_phe.threshold_pass_candidate+' KH). SKU chương trình còn REVIEW. Riêng Ponnie có chênh lệch chỉ tiêu giữa REV3 và file Tăng trưởng (số KH vượt ngưỡng có thể thay đổi); cần chốt nguồn trước khi xét đạt. Chi tiết KH dùng Actual 16/10 khi tải gói mới.</div>':'';
 return '<h2 class="hvdn-section-title">B. Tăng trưởng Tích Lũy Doanh Số</h2>'+correctedBanner+(growthConfirmedSummary?'':detailBanner+remainingBanner+candidateBanner)+'<section class="hvdn-card"><p class="hvdn-hint">6 chương trình · Chỉ tiêu từ Tăng trưởng Tích Lũy.xlsx · Actual có dấu * = tính tạm theo SKU ứng viên từ RAW 16/10, chưa xác nhận phạm vi công văn; không dùng chốt thưởng. Chi tiết KH dùng Actual 16/10 khi tải gói mới. ON/OFF từ cột L1.</p>'+(growthError?'<p class="notice error">'+escapeHTML(growthError)+'</p>':'')+growthSummary()+employees.map(x=>'<div class="hvdn-employee"><button class="hvdn-toggle" data-growth-employee="'+escapeHTML(x.name)+'"><strong>'+escapeHTML(x.name)+'</strong><span>'+x.customers.length+' KH '+(growthEmployeeOpen===x.name?'▾':'▸')+'</span></button>'+(growthEmployeeOpen===x.name?growthTable(x.customers):'')+'</div>').join('')+'</section>';
}
function growthSearch(){
 const q=growthQuery.trim().toLocaleLowerCase('vi');
 if(!q)return '<p class="hvdn-hint">Nhập mã hoặc tên KH để xem toàn bộ chương trình trong một bảng.</p>';
 const matches=new Map();
 const all=new Map();
 for(const e of growthData?.employees||[])for(const c of e.customers)all.set(c.id,{...c,employee:e.name});
 for(const e of hvdnData?.employees||[])for(const c of e.customers){
  const existing=all.get(c.id)||{id:c.id,name:c.name,programs:{},employee:e.name};
  existing.hvdn=c;all.set(c.id,existing);
 }
 for(const c of all.values())if((c.id+' '+c.name+' '+(c.hvdn?.name||'')).toLocaleLowerCase('vi').includes(q))matches.set(c.id,c);
 if(!matches.size)return '<p class="hvdn-hint">Không tìm thấy khách hàng.</p>';
 return '<p class="hvdn-hint">'+matches.size+' kết quả · hiển thị tối đa 20 KH</p>'+[...matches.values()].slice(0,20).map(c=>'<div class="hvdn-customer-result"><strong>'+escapeHTML(c.name)+' · '+escapeHTML(c.id)+'</strong>'+(c.hvdn?'<p>Hội Viên '+escapeHTML(c.hvdn.program)+' · Chỉ tiêu '+growthNumber(c.hvdn.target)+' · Thực hiện '+growthNumber(c.hvdn.actual)+' · Còn '+growthNumber(Math.max(0,c.hvdn.target-c.hvdn.actual))+' · '+(c.hvdn.qualified===true?'Đạt dự kiến':'Chưa đạt dự kiến')+'</p>':'')+growthTable([c])+'</div>').join('');
}
const previousHvdn=hvdn;
function customerProgramJumpNav(){
 const items=[['a','A. Hội Viên Doanh Nhân','hvdn-anchor-a'],['b','B. Tăng trưởng Tích Lũy Doanh Số','hvdn-anchor-b'],['c','C. Đơn hàng Combo','hvdn-anchor-c']];
 return '<nav class="customer-jump-nav" aria-label="Chuyển nhanh đến chương trình">'+items.map(([key,label,target])=>'<button type="button" class="customer-jump-btn customer-jump-'+key+'" data-customer-jump="'+target+'">'+escapeHTML(label)+'<span aria-hidden="true"> ↓</span></button>').join('')+'</nav>';
}
hvdn=function(){
 const html=previousHvdn();
 const search='<section class="hvdn-card"><h3>Tìm kiếm khách hàng · Toàn bộ chương trình</h3><input class="hvdn-search" id="growthCustomerSearch" type="search" placeholder="Tên khách hàng hoặc mã KH" value="'+escapeHTML(growthQuery)+'"><div id="growthSearchResult">'+growthSearch()+'</div></section><h2 id="hvdn-anchor-a" class="hvdn-section-title">A. Hội Viên Doanh Nhân</h2>';
 const growth=growthSection().replace('<h2 class="hvdn-section-title">','<h2 id="hvdn-anchor-b" class="hvdn-section-title">');
 const combo='<section id="hvdn-anchor-c" class="hvdn-combo-placeholder"><h2 class="hvdn-section-title">C. Đơn hàng Combo</h2><p>Đang xây dựng cấu trúc và quy tắc tính. Chưa có dữ liệu hoặc KPI Combo được xác nhận.</p></section>';
 return html.replace('<div class="hvdn-page">','<div class="hvdn-page">'+customerProgramJumpNav()+search).slice(0,-6)+growth+combo+'</div>';
};
const previousLoadHvdn=loadHvdn;
loadHvdn=async function(){await Promise.all([previousLoadHvdn(),loadGrowthTargets()]);};
document.addEventListener('input',e=>{if(e.target.id==='growthCustomerSearch'){growthQuery=e.target.value;document.getElementById('growthSearchResult').innerHTML=growthSearch();}});
document.addEventListener('click',e=>{const jump=e.target.closest('[data-customer-jump]');if(jump){const target=document.getElementById(jump.dataset.customerJump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});return;}const b=e.target.closest('[data-growth-employee]');if(b){growthEmployeeOpen=growthEmployeeOpen===b.dataset.growthEmployee?null:b.dataset.growthEmployee;render();}});

document.addEventListener('click',e=>{const b=e.target.closest('[data-growth-program]');if(!b)return;const id=b.dataset.growthProgram;growthSelectedProgram=growthSelectedProgram===id?null:id;render();document.querySelector('[data-growth-program="'+id+'"]')?.focus({preventScroll:true});});
