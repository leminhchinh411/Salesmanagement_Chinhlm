'use strict';
const FUNDAMENTAL_KPIS=[
 {id:'aso_all',name:'ASO ALL'},{id:'pc_4_line',name:'PC 4 Line'},
 {id:'lppc',name:'LPPC'},{id:'lppc_meat',name:'LPPC Meat'},
 {id:'pc_on',name:'PC ON'},{id:'aso_focus_1',name:'ASO FOCUS 1'},
 {id:'aso_focus_2',name:'ASO FOCUS 2'}
];
let fundamentalFilter='all',fundamentalData=null,fundamentalError='';
async function loadFundamental(){
 fundamentalData=null;fundamentalError='';
 try{
  const r=await fetch('data/fundamental-kpi.json?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();
  if(x.schema_version!==1||!['PILOT','PUBLISHED'].includes(x.status)||x.approved_for_public!==true||x.period!=='10/2026'||!Array.isArray(x.employees)||x.employees.length!==11||!numeric(x.timegone_pct)||x.timegone_pct>100)throw Error('Dữ liệu Fundamental KPI chưa đủ điều kiện');
  const expected=new Set(FUNDAMENTAL_KPIS.map(k=>k.id)),ids=new Set();
  for(const e of x.employees){
   if(!e.id||ids.has(e.id)||!Array.isArray(e.kpis)||e.kpis.length!==7)throw Error('Thiếu NVBH hoặc KPI');ids.add(e.id);
   if(new Set(e.kpis.map(k=>k.id)).size!==7||e.kpis.some(k=>!expected.has(k.id)||!numeric(k.target)||!numeric(k.actual)))throw Error('KPI không hợp lệ');
  }
  if(sales&&x.employees.some(e=>!sales.employees.some(s=>s.id===e.id)))throw Error('Mã NVBH không khớp Dashboard');
  fundamentalData=x;
 }catch(e){fundamentalError=e.message;}
}
function fundamental(){
 const people=sales?.employees||[];
 const fmt=fmtMoney;
 const options=[{id:'all',name:'Tất cả 11 NVBH'},...people].map(v=>'<option value="'+escapeHTML(v.id)+'"'+(v.id===fundamentalFilter?' selected':'')+'>'+escapeHTML(v.name)+'</option>').join('');
 const ready=!!fundamentalData;
 const lookup=new Map((fundamentalData?.employees||[]).map(e=>[e.id,e]));
 const calc=(id,kpi)=>{
  const e=lookup.get(id),v=e?.kpis.find(k=>k.id===kpi);
  return v||{target:null,actual:null};
 };
 const fmtValue=v=>numeric(v)?fmt(v):'—';
 const metric=(v)=>{
  const pct=progress(v.actual,v.target),delta=pct===null||!ready?null:pct-fundamentalData.timegone_pct;
  return '<div class="fundamental-metric '+colorClass(delta)+'"><span>CT <b>'+fmtValue(v.target)+'</b></span><span>Đạt <b>'+fmtValue(v.actual)+'</b></span><strong>'+fmtPct(pct)+'</strong></div>';
 };
 const filtered=people.filter(e=>fundamentalFilter==='all'||e.id===fundamentalFilter);
 const teamVal=k=>{
  const v=fundamentalData?.team?.kpis?.find(x=>x.id===k);
  return v&&numeric(v.target)&&numeric(v.actual)?v:{target:null,actual:null};
 };
 const header='<div class="fundamental-row fundamental-header"><strong>NVBH</strong>'+FUNDAMENTAL_KPIS.map(k=>'<strong>'+escapeHTML(k.name)+'</strong>').join('')+'</div>';
 const team='<div class="fundamental-row fundamental-team"><strong>TỔNG TEAM</strong>'+FUNDAMENTAL_KPIS.map(k=>metric(teamVal(k.id))).join('')+'</div>';
 const rows=filtered.map(e=>'<div class="fundamental-row"><strong class="fundamental-name">'+escapeHTML(e.name)+'</strong>'+FUNDAMENTAL_KPIS.map(k=>metric(calc(e.id,k.id))).join('')+'</div>').join('');
 return '<div class="fundamental-page"><div class="compact-toolbar"><div class="compact-source">Fundamental KPI · Kỳ 10/2026 · '+(ready?'Chốt '+escapeHTML(fundamentalData.cutoff_date||'—')+' · '+escapeHTML(fundamentalData.status):'Chưa có KPI Master/Rule và kết quả tính đủ 7 KPI')+'</div><div class="compact-filters"><label><span>NVBH</span><select id="fundamentalFilter">'+options+'</select></label></div></div>'+
 (fundamentalError?'<div class="notice error">'+escapeHTML(fundamentalError)+'</div>':'')+
 (!ready?'<div class="fundamental-warning">Đã dựng giao diện 7 KPI. Chỉ tiêu, thực đạt và % hoàn thành tạm để “—” cho đến khi có dữ liệu đã tính và đối soát; không tự suy diễn công thức.</div>':'')+
 '<div class="fundamental-scroll" role="region" aria-label="Fundamental KPI, vuốt ngang để xem các KPI">'+header+team+rows+'</div>'+
 '<div class="compact-footer">Mỗi ô: CT = Chỉ tiêu · Đạt = Thực đạt · số lớn = % hoàn thành. Màu đỏ: dưới Timegone; xanh: từ Timegone đến +10 đpt; tím: trên +10 đpt. Không hiển thị Timegone theo yêu cầu. Tổng Team lấy từ KPI Engine đã xác nhận, không cộng cơ học KPI tỷ lệ.</div></div>';
}
