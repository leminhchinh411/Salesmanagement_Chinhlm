'use strict';
let growthData=null,growthError='',growthEmployeeOpen=null,growthQuery='',growthChannels={};
const GROWTH_NAMES=[['gia_vi','Gia Vị'],['bfast',"Ngũ Cốc B'Fast"],['ponnie','Ponnie'],['tra_bup_non','Trà Búp Non'],['chante','Chanté'],['ca_phe','Cà Phê']];
async function loadGrowthTargets(){
 growthData=null;growthError='';
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
  growthData=x;
  growthChannels={};
  try{const cr=await fetch('data/growth-channel.json.gz.b64?v='+Date.now(),{cache:'no-store'});if(cr.ok){const raw=Uint8Array.from(atob((await cr.text()).trim()),c=>c.charCodeAt(0));const ch=JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());if(ch.schema_version===1&&ch.period===x.period&&ch.channels)growthChannels=ch.channels;}}catch(err){growthError='Không tải được phân loại ON/OFF: '+err.message;}
 }catch(e){growthError=e.message;}
}
function growthNumber(v){return Number.isFinite(v)?fmtMoney(v):'—';}
function growthPct(v){return v&&Number.isFinite(v.actual)&&Number.isFinite(v.target)?fmtPct(progress(v.actual,v.target)):'—';}
function growthNote(c){
 return GROWTH_NAMES.map(([id,name])=>{const v=c.programs?.[id];return v&&Number.isFinite(v.actual)&&v.actual<v.target?'Cửa hàng còn thiếu '+growthNumber(v.target-v.actual)+'đ · '+name:null;}).filter(Boolean).join('; ')||'Chưa có Actual đối soát';
}
function growthChannel(c){const v=String(c.channel||c.l1||growthChannels[String(c.id)]||'').toUpperCase();return v==='OFF'||v==='ON'?v:null;}
function growthSorted(customers){return [...customers].sort((a,b)=>{const rank=x=>growthChannel(x)==='OFF'?0:growthChannel(x)==='ON'?1:2;return rank(a)-rank(b)||String(a.name||'').localeCompare(String(b.name||''),'vi');});}
function growthTable(customers){
 return '<div class="hvdn-scroll growth-scroll"><table class="hvdn-table growth-wide"><colgroup><col class="growth-col-customer">'+GROWTH_NAMES.map(()=>'<col class="growth-col-number"><col class="growth-col-number"><col class="growth-col-number"><col class="growth-col-number">').join('')+'<col class="growth-col-note"></colgroup><thead><tr><th rowspan="2">Khách hàng / Mã KH</th>'+GROWTH_NAMES.map(p=>'<th class="growth-program-heading" colspan="4">'+escapeHTML(p[1])+'</th>').join('')+'<th class="growth-header-note" rowspan="2">Ghi chú</th></tr><tr>'+GROWTH_NAMES.map(()=>'<th>Chỉ tiêu</th><th>Thực hiện</th><th>Còn lại</th><th>% TH</th>').join('')+'</tr></thead><tbody>'+growthSorted(customers).map(c=>'<tr><th class="growth-customer">'+escapeHTML(c.name)+' '+(growthChannel(c)?'<span class="growth-channel growth-'+growthChannel(c).toLowerCase()+'">'+growthChannel(c)+'</span>':'')+'<small>'+escapeHTML(c.id)+'</small></th>'+GROWTH_NAMES.map(([id])=>{const v=c.programs?.[id];return '<td>'+growthNumber(v?.target)+'</td><td>'+growthNumber(v?.actual)+'</td><td>'+(v&&Number.isFinite(v.actual)?growthNumber(Math.max(0,v.target-v.actual)):'—')+'</td><td>'+growthPct(v)+'</td>';}).join('')+'<td>'+escapeHTML(growthNote(c))+'</td></tr>').join('')+'</tbody></table></div>';
}
function growthSummary(){
 const cs=(growthData?.employees||[]).flatMap(e=>e.customers);
 const cells=GROWTH_NAMES.map(([id,name])=>{const v=cs.map(c=>c.programs?.[id]).filter(p=>p&&Number.isFinite(p.target));const sum=v.reduce((a,p)=>a+p.target,0);const qualified=v.length&&v.every(p=>typeof p.qualified==='boolean')?v.filter(p=>p.qualified===true).length:null;return '<tr><th>'+escapeHTML(name)+'</th><td>'+(v.length?fmtMoney(v.length):'—')+'</td><td>'+(v.length?growthNumber(sum):'—')+'</td><td>—</td><td>'+(qualified===null?'—':fmtMoney(qualified))+'</td><td>'+ (id==='ca_phe'?'Chờ file chỉ tiêu':'Chờ Actual đối soát')+'</td></tr>';}).join('');
 return '<div class="hvdn-scroll"><table class="hvdn-table"><thead><tr><th>Chương trình</th><th>KH có chỉ tiêu</th><th>Tổng chỉ tiêu</th><th>Thực hiện</th><th>Số lượng KH Đạt Chương trình</th><th>Trạng thái</th></tr></thead><tbody>'+cells+'</tbody></table></div>';
}
function growthSection(){
 const e=growthData?.employees||[];
 const byName=new Map(e.map(x=>[x.name,x.customers]));
 const people=sales?.employees||[];
 const employees=people.length?people.map(x=>({name:x.name,customers:byName.get(x.name)||[]})):e;
 return '<h2 class="hvdn-section-title">B. Tăng trưởng Tích Lũy Doanh Số</h2><section class="hvdn-card"><p class="hvdn-hint">6 chương trình · Chỉ tiêu từ Tăng trưởng Tích Lũy.xlsx · Actual chờ đối soát RAW. ON/OFF từ cột L1. Cà Phê chờ Master chỉ tiêu.</p>'+(growthError?'<p class="notice error">'+escapeHTML(growthError)+'</p>':'')+growthSummary()+employees.map(x=>'<div class="hvdn-employee"><button class="hvdn-toggle" data-growth-employee="'+escapeHTML(x.name)+'"><strong>'+escapeHTML(x.name)+'</strong><span>'+x.customers.length+' KH '+(growthEmployeeOpen===x.name?'▾':'▸')+'</span></button>'+(growthEmployeeOpen===x.name?growthTable(x.customers):'')+'</div>').join('')+'</section>';
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
