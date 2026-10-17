'use strict';
let growthData=null,growthError='',growthEmployeeOpen=null,growthQuery='';
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
 }catch(e){growthError=e.message;}
}
function growthNumber(v){return Number.isFinite(v)?fmtMoney(v):'—';}
function growthPct(v){return v&&Number.isFinite(v.actual)&&Number.isFinite(v.target)?fmtPct(progress(v.actual,v.target)):'—';}
function growthNote(c){
 return GROWTH_NAMES.map(([id,name])=>{const v=c.programs?.[id];return v&&Number.isFinite(v.actual)&&v.actual<v.target?'Cửa hàng còn thiếu '+growthNumber(v.target-v.actual)+'đ · '+name:null;}).filter(Boolean).join('; ')||'Chưa có Actual đối soát';
}
function growthTable(customers){
 return '<div class="hvdn-scroll"><table class="hvdn-table growth-wide"><thead><tr><th rowspan="2">Khách hàng / Mã KH</th>'+GROWTH_NAMES.map(p=>'<th colspan="4">'+escapeHTML(p[1])+'</th>').join('')+'<th rowspan="2">Ghi chú</th></tr><tr>'+GROWTH_NAMES.map(()=>'<th>Chỉ tiêu</th><th>Thực hiện</th><th>Còn lại</th><th>% TH</th>').join('')+'</tr></thead><tbody>'+customers.map(c=>'<tr><th>'+escapeHTML(c.name)+' · '+escapeHTML(c.id)+'</th>'+GROWTH_NAMES.map(([id])=>{const v=c.programs?.[id];return '<td>'+growthNumber(v?.target)+'</td><td>'+growthNumber(v?.actual)+'</td><td>'+(v&&Number.isFinite(v.actual)?growthNumber(Math.max(0,v.target-v.actual)):'—')+'</td><td>'+growthPct(v)+'</td>';}).join('')+'<td>'+escapeHTML(growthNote(c))+'</td></tr>').join('')+'</tbody></table></div>';
}
function growthSummary(){
 const cs=(growthData?.employees||[]).flatMap(e=>e.customers);
 const cells=GROWTH_NAMES.map(([id,name])=>{const v=cs.map(c=>c.programs?.[id]).filter(p=>p&&Number.isFinite(p.target));const sum=v.reduce((a,p)=>a+p.target,0);return '<tr><th>'+escapeHTML(name)+'</th><td>'+(v.length?fmtMoney(v.length):'—')+'</td><td>'+(v.length?growthNumber(sum):'—')+'</td><td>—</td><td>'+ (id==='ca_phe'?'Chờ file chỉ tiêu':'Chờ Actual đối soát')+'</td></tr>';}).join('');
 return '<div class="hvdn-scroll"><table class="hvdn-table"><thead><tr><th>Chương trình</th><th>KH có chỉ tiêu</th><th>Tổng chỉ tiêu</th><th>Thực hiện</th><th>Trạng thái</th></tr></thead><tbody>'+cells+'</tbody></table></div>';
}
function growthSection(){
 const e=growthData?.employees||[];
 const byName=new Map(e.map(x=>[x.name,x.customers]));
 const people=sales?.employees||[];
 const employees=people.length?people.map(x=>({name:x.name,customers:byName.get(x.name)||[]})):e;
 return '<h2 class="hvdn-section-title">B. Tăng trưởng Tích Lũy Doanh Số</h2><section class="hvdn-card"><p class="hvdn-hint">6 chương trình · Chỉ tiêu từ Tăng trưởng Tích Lũy.xlsx · Actual chờ đối soát RAW và danh mục SKU. Cà Phê chờ Master chỉ tiêu.</p>'+(growthError?'<p class="notice error">'+escapeHTML(growthError)+'</p>':'')+growthSummary()+employees.map(x=>'<div class="hvdn-employee"><button class="hvdn-toggle" data-growth-employee="'+escapeHTML(x.name)+'"><strong>'+escapeHTML(x.name)+'</strong><span>'+x.customers.length+' KH '+(growthEmployeeOpen===x.name?'▾':'▸')+'</span></button>'+(growthEmployeeOpen===x.name?growthTable(x.customers):'')+'</div>').join('')+'</section>';
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
hvdn=function(){
 const html=previousHvdn();
 const search='<section class="hvdn-card"><h3>Tìm kiếm khách hàng · Toàn bộ chương trình</h3><input class="hvdn-search" id="growthCustomerSearch" type="search" placeholder="Tên khách hàng hoặc mã KH" value="'+escapeHTML(growthQuery)+'"><div id="growthSearchResult">'+growthSearch()+'</div></section><h2 class="hvdn-section-title">A. Hội Viên Doanh Nhân</h2>';
 return html.replace('<div class="hvdn-page">','<div class="hvdn-page">'+search).replace(/<\/div>\s*$/,'')+growthSection()+'</div>';
};
const previousLoadHvdn=loadHvdn;
loadHvdn=async function(){await Promise.all([previousLoadHvdn(),loadGrowthTargets()]);};
document.addEventListener('input',e=>{if(e.target.id==='growthCustomerSearch'){growthQuery=e.target.value;document.getElementById('growthSearchResult').innerHTML=growthSearch();}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-growth-employee]');if(b){growthEmployeeOpen=growthEmployeeOpen===b.dataset.growthEmployee?null:b.dataset.growthEmployee;render();}});
