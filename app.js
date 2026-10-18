'use strict';
const NAV=[{id:'home',name:'Trang chủ',icon:'⌂'},{id:'kpi',name:'TỔNG QUAN DOANH SỐ',icon:'▥'},{id:'fundamental',name:'Fundamental KPI',icon:'◎'},{id:'customers',name:'Chương trình Khách Hàng',icon:'♧'},{id:'discipline',name:'Kỷ luật bán hàng',icon:'◎'},{id:'action',name:'Sales Action Center',icon:'◇'},{id:'tabs',name:'Các tab',icon:'▦'},{id:'info',name:'Thông tin',icon:'⚙'}];
const UI_ICONS={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 kpi:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V7"/>',
 fundamental:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
 customers:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-5-1-6-6-3-6 2 0 3 4 3 6Zm0 0c5-1 6-6 3-6-2 0-3 4-3 6Z"/>',
 discipline:'<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',
 tabs:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
};
function uiIcon(id){return '<svg class="ui-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(UI_ICONS[id]||UI_ICONS.tabs)+'</svg>';}
let manifest=null;let loadError='';let active='home';let sales=null;let salesError='';let employeeFilter='all';let divisionFilter='all';
const el=id=>document.getElementById(id);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeText=s=>escapeHTML(s||'Chưa có');
const row=(a,b)=>`<div class="data-row"><span class="muted">${escapeHTML(a)}</span><strong>${safeText(b)}</strong></div>`;
function navigation(){for(const target of ['sideNav','bottomNav']){el(target).innerHTML=NAV.map(n=>`<button class="navbtn ${active===n.id?'active':''}" data-page="${n.id}" aria-current="${active===n.id?'page':'false'}"><span class="symbol">${uiIcon(n.id)}</span><span>${n.name}</span></button>`).join('');}}
function status(){const p=manifest?.publication;return p?.status==='PUBLISHED'?'Đã phát hành':p?.status==='PILOT'?'PILOT':'Chưa phát hành';}
function home(){const p=manifest?.publication||{};return `<p class="intro">Nền tảng quản trị bán hàng dành cho đội ngũ Nam Trung Bộ. Các KPI sẽ được phát triển và kiểm thử theo từng tab.</p>${loadError?`<div class="notice error">Không tải được cấu hình dữ liệu: ${safeText(loadError)}. Không sử dụng dữ liệu lưu đệm để thay thế.</div>`:''}<div class="grid"><section class="card"><div class="muted small">NVBH trong phạm vi</div><div class="metric">11</div><span class="small muted">Cấu hình dự án, chưa đối soát Master</span></section><section class="card"><div class="muted small">MCP tháng 10/2026</div><div class="metric">1.695</div><span class="small muted">Phạm vi dự án, chưa đối soát Master</span></section><section class="card"><div class="muted small">Trạng thái dữ liệu</div><div style="margin:15px 0"><span class="pill ${p.status==='PUBLISHED'?'ok':'warn'}">${safeText(status())}</span></div><span class="small muted">Không hiển thị KPI chưa xác nhận</span></section><section class="card wide"><h2>Thông tin phát hành</h2>${row('Ngày chốt',p.cutoff_date)}${row('Nguồn',p.source)}${row('Phiên bản',p.version)}${row('Phát hành lúc',p.published_at)}${row('Trạng thái QA',p.qa_status)}<p class="small muted">Chỉ công bố dữ liệu đã được Supervisor phê duyệt. Trạng thái PUBLISHED không đồng nghĩa mọi KPI đã được xác nhận.</p></section><section class="card wide"><h2>Chu trình vận hành</h2><div class="steps"><div class="step"><strong>1. Daily Tracking</strong><span class="muted small">Nhận snapshot Excel lũy kế, kiểm tra và chuẩn hóa.</span></div><div class="step"><strong>2. QA & Supervisor Approval</strong><span class="muted small">Đối soát dữ liệu, kiểm tra sai lệch và phê duyệt gói công khai.</span></div><div class="step"><strong>3. Publish</strong><span class="muted small">Cập nhật file JSON, lưu phiên bản và triển khai lại cùng URL.</span></div></div></section></div>`;}
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const fmtMoney=n=>numeric(n)?new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(n):'—';
const fmtPct=n=>Number.isFinite(n)?new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n)+'%':'—';
const deltaLabel=n=>Number.isFinite(n)?(n>0?'+':'')+fmtPct(n)+' đpt':'—';
const progress=(a,t)=>numeric(a)&&numeric(t)&&t>0?a/t*100:null;
const colorClass=d=>d===null?'neutral':d<0?'red':d>10?'purple':'green';
const noteFor=d=>d===null?'Chưa đủ dữ liệu':d<0?'Cố lên':d>10?'Duy trì':'Phát huy';
const safeId=x=>String(x??'').replace(/[^a-zA-Z0-9_-]/g,'');
function validateSales(x){
 if(!x||x.schema_version!==1||x.status!=='PUBLISHED'||x.qa_status!=='PASSED'||!x.approved_for_public||!Array.isArray(x.employees)||x.employees.length!==11||!Array.isArray(x.divisions)||!x.divisions.length||!numeric(x.timegone_pct)||x.timegone_pct>100||!x.cutoff_date||!x.period||!x.version||!x.source)throw Error('Gói dữ liệu chưa đạt điều kiện phát hành');
 const divIds=x.divisions.map(d=>d.id);if(new Set(divIds).size!==divIds.length||divIds.some(id=>typeof id!=='string'||!id))throw Error('Sub division không hợp lệ');
 const ids=new Set();
 for(const e of x.employees){if(!e.id||!e.name||ids.has(e.id)||!Array.isArray(e.divisions))throw Error('Danh sách NVBH không hợp lệ');ids.add(e.id);if(e.divisions.length!==divIds.length||new Set(e.divisions.map(d=>d.id)).size!==divIds.length)throw Error('Thiếu Sub division');
 for(const d of e.divisions){if(!divIds.includes(d.id)||!numeric(d.target)||!numeric(d.actual))throw Error('Số liệu Sub division không hợp lệ');}}
 return x;
}
function aggregate(items,division){
 const details=items.flatMap(e=>e.divisions.filter(d=>division==='all'||d.id===division));
 return {target:details.reduce((a,d)=>a+d.target,0),actual:details.reduce((a,d)=>a+d.actual,0)};
}
function summaryLine(label,tot,tg,extra=''){
 const pct=progress(tot.actual,tot.target),delta=pct===null?null:pct-tg,cls=colorClass(delta);
 return '<div class="sales-summary '+cls+'"><div class="sales-name">'+escapeHTML(label)+'</div><div class="sales-figures"><span>Chỉ tiêu <b>'+fmtMoney(tot.target)+'</b></span><span>Thực đạt <b>'+fmtMoney(tot.actual)+'</b></span><span>Hoàn thành <b>'+fmtPct(pct)+'</b></span><span>Timegone <b>'+fmtPct(tg)+'</b></span><span>So tiến độ <b>'+deltaLabel(delta)+'</b></span></div><div class="sales-note">'+noteFor(delta)+'</div>'+extra+'</div>';
}
function chart(items,tg){
 const values=items.map(e=>({name:e.name,pct:progress(e.actual,e.target)}));const max=Math.max(100,tg,...values.map(v=>v.pct||0));
 return '<div class="chart-wrap"><div class="chart-key"><span class="key-time">— Timegone '+fmtPct(tg)+'</span><span>Chiều cao cột: % hoàn thành</span></div><div class="bar-chart" style="--time-pos:'+Math.min(100,tg/max*100)+'%"><div class="time-line"></div>'+values.map(v=>{const delta=v.pct===null?null:v.pct-tg;return '<div class="bar-item"><div class="bar-value">'+fmtPct(v.pct)+'</div><div class="bar-track"><div class="bar-fill '+colorClass(delta)+'" style="height:'+Math.min(100,(v.pct||0)/max*100)+'%"></div></div><div class="bar-label" title="'+escapeHTML(v.name)+'">'+escapeHTML(v.name)+'</div></div>';}).join('')+'</div></div>';
}
function kpi(){
 if(!sales)return '<div class="notice">'+(salesError?'Không thể hiển thị dữ liệu doanh số: '+escapeHTML(salesError):'Tab đã sẵn sàng. Chưa có gói dữ liệu doanh số được QA và phê duyệt để công bố.')+'</div><section class="card"><h2>Tổng quan doanh số</h2><p class="muted">Chờ 11 NVBH, danh mục Sub division, chỉ tiêu, thực đạt và Timegone theo ngày làm việc.</p><span class="pill warn">CHƯA CÓ DỮ LIỆU</span></section>';
 const tg=sales.timegone_pct;const chosen=sales.employees.filter(e=>employeeFilter==='all'||e.id===employeeFilter);
 const total=aggregate(chosen,divisionFilter);const team=aggregate(sales.employees,divisionFilter);
 const divisionName=id=>sales.divisions.find(d=>d.id===id)?.name||id;
 const options=(arr,selected)=>arr.map(o=>'<option value="'+escapeHTML(o.id)+'" '+(o.id===selected?'selected':'')+'>'+escapeHTML(o.name)+'</option>').join('');
 const cards=chosen.map(e=>{const t=aggregate([e],divisionFilter),p=progress(t.actual,t.target),d=p===null?null:p-tg;
 const details=e.divisions.filter(v=>divisionFilter==='all'||v.id===divisionFilter).map(v=>{const pc=progress(v.actual,v.target),dl=pc===null?null:pc-tg;return '<div class="division-row '+colorClass(dl)+'"><strong>'+escapeHTML(divisionName(v.id))+'</strong><span>CT: '+fmtMoney(v.target)+'</span><span>Đạt: '+fmtMoney(v.actual)+'</span><span>'+fmtPct(pc)+'</span><span>'+deltaLabel(dl)+'</span><b>'+noteFor(dl)+'</b></div>';}).join('');
 return '<details class="employee-card"><summary>'+summaryLine(e.name,t,tg)+'</summary><div class="division-list"><div class="small muted">Chi tiết theo Sub division · Timegone '+fmtPct(tg)+'</div>'+details+'</div></details>';}).join('');
 const chartItems=chosen.map(e=>({name:e.name,...aggregate([e],divisionFilter)}));
 return '<div class="notice">Kỳ '+escapeHTML(sales.period)+' · Chốt '+escapeHTML(sales.cutoff_date)+' · Nguồn '+escapeHTML(sales.source)+' · Phiên bản '+escapeHTML(sales.version)+' · QA PASSED · Dữ liệu đã phê duyệt công khai</div>'+
 '<div class="filterbar"><label>Nhân viên<select id="employeeFilter">'+options([{id:'all',name:'Tất cả 11 NVBH'},...sales.employees],employeeFilter)+'</select></label><label>Ngành hàng (Sub division)<select id="divisionFilter">'+options([{id:'all',name:'Tất cả ngành hàng'},...sales.divisions],divisionFilter)+'</select></label></div>'+
 '<section class="card"><h2>Tổng Team '+(divisionFilter!=='all'?'· '+escapeHTML(divisionName(divisionFilter)):'')+'</h2>'+summaryLine('11 NVBH',team,tg)+'</section>'+
 '<section class="card"><h2>Biểu đồ % hoàn thành</h2>'+chart(chartItems,tg)+'</section>'+
 '<section class="card"><h2>Chi tiết nhân viên ('+chosen.length+'/11)</h2><p class="small muted">Nhấn vào từng NVBH để bung chi tiết ngành hàng. Chênh lệch tính bằng điểm phần trăm: đỏ &lt; 0, xanh 0–10, tím &gt; 10.</p>'+cards+'</section>';
}
function tabs(){return `<p class="intro">Các module sẽ được bổ sung độc lập mà không đổi địa chỉ website.</p><div class="tabs-grid"><div class="tile"><strong>▥ KPI & Hiệu suất</strong><span class="muted small">Chưa triển khai</span></div><div class="tile"><strong>◫ Chương trình khách hàng</strong><span class="muted small">Chưa triển khai</span></div><div class="tile"><strong>▤ Xếp hạng NVBH</strong><span class="muted small">Chưa triển khai</span></div><div class="tile"><strong>◇ Sales Action Center</strong><span class="muted small">PILOT · Điều hành theo tuyến viếng thăm</span></div></div>`;}
function info(){return `<section class="card"><h2>Thông tin hệ thống</h2>${row('Ứng dụng','Sales Management Web Foundation V1')}${row('Chế độ','Công khai · Chỉ đọc')}${row('Đăng nhập','Không yêu cầu')}${row('Cập nhật','JSON qua quy trình phát hành thủ công')}${row('Dữ liệu hiện hành',status())}<div class="notice" style="margin-top:16px">Bất kỳ ai có URL đều có thể xem nội dung công khai. Không đưa RAW, thông tin khách hàng nhạy cảm hoặc coaching riêng tư vào file website.</div></section>`;}
function render(){if(!NAV.some(n=>n.id===active))active='home';el('pageTitle').textContent=NAV.find(n=>n.id===active).name;navigation();el('content').innerHTML=({home,kpi,fundamental,customers:hvdn,discipline:disciplinePage,action:actionCenter,tabs,info})[active]();document.title=`${NAV.find(n=>n.id===active).name} · Sales Management`;}
async function loadSales(){sales=null;salesError='';try{const r=await fetch('data/sales-overview.json?cache='+Date.now(),{cache:'no-store'});if(r.status===404)return;if(!r.ok)throw Error('HTTP '+r.status);sales=validateSales(await r.json());}catch(e){salesError=e.message;}}
async function load(){loadError='';try{const res=await fetch('data/manifest.json?cache='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const obj=await res.json();if(!obj||obj.schema_version!==1||!obj.publication||!['UNPUBLISHED','PILOT','PUBLISHED'].includes(obj.publication.status))throw Error('Schema hoặc trạng thái không hợp lệ');manifest=obj;}catch(e){manifest=null;loadError=e.message;}await loadSales();if(typeof loadFundamental==='function')await loadFundamental();if(typeof loadHvdn==='function')await loadHvdn();if(typeof loadDiscipline==='function')await loadDiscipline();render();}
document.addEventListener('change',e=>{if(e.target.id==='employeeFilter'){employeeFilter=e.target.value;render();}if(e.target.id==='divisionFilter'){divisionFilter=e.target.value;render();}if(e.target.id==='fundamentalFilter'){fundamentalFilter=e.target.value;render();}});
document.addEventListener('click',e=>{const emp=e.target.closest('[data-hvdn-employee]');if(emp){hvdnOpenEmployee=hvdnOpenEmployee===emp.dataset.hvdnEmployee?null:emp.dataset.hvdnEmployee;hvdnOpenProgram=null;render();return;}const prog=e.target.closest('[data-hvdn-program]');if(prog){hvdnOpenProgram=hvdnOpenProgram===prog.dataset.hvdnProgram?null:prog.dataset.hvdnProgram;render();return;}const b=e.target.closest('[data-page]');if(b){active=b.dataset.page;history.replaceState(null,'','#'+active);render();window.scrollTo(0,0);}});el('refresh').addEventListener('click',load);active=location.hash.replace('#','')||'home';load();
