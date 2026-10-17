'use strict';
const FUNDAMENTAL_KPIS=[
 {id:'aso_all',name:'ASO ALL'},{id:'pc_4_line',name:'PC 4 Line'},
 {id:'lppc',name:'LPPC'},{id:'lppc_meat',name:'LPPC Meat'},
 {id:'pc_on',name:'PC ON'},{id:'aso_focus_1',name:'ASO FOCUS 1'},
 {id:'aso_focus_2',name:'ASO FOCUS 2'}
];
let fundamentalFilter='all',fundamentalData=null,fundamentalTargets=null,fundamentalError='',coveragePilot=null,focusCandidatePilot=null;
async function loadFundamental(){
 fundamentalData=null;fundamentalTargets=null;fundamentalError='';coveragePilot=null;focusCandidatePilot=null;
 try{const r=await fetch('data/aso-focus-candidate-positive-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT')focusCandidatePilot=p;}}catch(_){}
 try{const r=await fetch('data/coverage-positive-orders-pilot-20261016.json?v='+Date.now(),{cache:'no-store'});if(r.ok){const p=await r.json();if(p.status==='PILOT'&&p.summary?.mcp_total===1695)coveragePilot=p;}}catch(_){}
 try{const t=await fetch('data/fundamental-targets-candidate.json?v='+Date.now(),{cache:'no-store'});if(t.ok){const x=await t.json();if(x.schema_version===1&&x.period==='10/2026'&&x.employees?.length===11)fundamentalTargets=x;}}catch(e){}
 try{
  const r=await fetch('data/fundamental-kpi.json?v='+Date.now(),{cache:'no-store'});
  if(r.status===404)return;
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();
  if(x.schema_version!==1||!['PILOT','PUBLISHED'].includes(x.status)||x.approved_for_public!==true||x.period!=='10/2026'||!Array.isArray(x.employees)||x.employees.length!==11||!numeric(x.timegone_pct)||x.timegone_pct>100)throw Error('Dữ liệu Fundamental KPI chưa đủ điều kiện');
  const expected=new Set(FUNDAMENTAL_KPIS.map(k=>k.id)),ids=new Set();
  for(const e of x.employees){
   if(!e.id||ids.has(e.id)||!Array.isArray(e.kpis)||e.kpis.length!==7)throw Error('Thiếu NVBH hoặc KPI');ids.add(e.id);
   if(new Set(e.kpis.map(k=>k.id)).size!==7||e.kpis.some(k=>!expected.has(k.id)||(k.target!==null&&!numeric(k.target))||(k.actual!==null&&!numeric(k.actual))))throw Error('KPI không hợp lệ');
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
 const hasTargets=!!fundamentalTargets;
 const lookup=new Map((fundamentalData?.employees||[]).map(e=>[e.id,e]));
 const calc=(id,kpi)=>{
  const e=lookup.get(id),v=e?.kpis.find(k=>k.id===kpi);
  const target=fundamentalTargets?.employees.find(x=>x.id===id)?.targets?.[kpi];
  return {target:numeric(v?.target)?v.target:(numeric(target)?target:null),actual:numeric(v?.actual)?v.actual:null};
 };
 const fmtValue=v=>numeric(v)?fmt(v):'—';
 const metric=(v)=>{
  const pct=progress(v.actual,v.target),delta=pct===null||!ready?null:pct-fundamentalData.timegone_pct;
  return '<div class="fundamental-metric '+colorClass(delta)+'"><span>CT <b>'+fmtValue(v.target)+'</b></span><span>Đạt <b>'+fmtValue(v.actual)+'</b></span><strong>'+fmtPct(pct)+'</strong></div>';
 };
 const filtered=people.filter(e=>fundamentalFilter==='all'||e.id===fundamentalFilter);
 const teamVal=k=>{
  const v=fundamentalData?.team?.kpis?.find(x=>x.id===k);
  const vals=people.map(e=>fundamentalTargets?.employees.find(t=>t.id===e.id)?.targets?.[k]);
  const target=(k==='lppc'||k==='lppc_meat')?(vals.every(numeric)?vals[0]:null):(vals.every(numeric)?vals.reduce((a,b)=>a+b,0):null);
  return {target:numeric(v?.target)?v.target:target,actual:numeric(v?.actual)?v.actual:null};
 };
 const riskItems=people.map(e=>{
  const records=FUNDAMENTAL_KPIS.map(k=>({k,v:calc(e.id,k.id)}));
  const valid=records.filter(x=>numeric(x.v.actual)&&numeric(x.v.target)&&x.v.target>0);
  const red=valid.filter(x=>progress(x.v.actual,x.v.target)<fundamentalData?.timegone_pct);
  return {id:e.id,name:e.name,complete:valid.length===7,red:red.map(x=>x.k.name),count:red.length};
 });
 const allReady=ready&&riskItems.length===11&&riskItems.every(x=>x.complete);
 let riskCard='';
 if(!allReady){
  riskCard='<section class="fundamental-risk"><div class="fundamental-risk-heading"><strong>Nhân viên cần ưu tiên theo dõi</strong><span>Chờ đủ 7/7 Actual đã kiểm thử</span></div><p>Chưa xếp hạng hoặc gắn nhãn đỏ khi KPI chưa đủ dữ liệu. Thẻ sẽ tự hiển thị khi đủ 11 NVBH × 7 KPI.</p></section>';
 }else{
  const selected=riskItems.filter(x=>x.count>=4);
  const chosen=selected.length?selected:riskItems.slice().sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'vi')).slice(0,3);
  const description=selected.length?'NVBH có từ 4/7 KPI đỏ':'Không có NVBH đạt 4 KPI đỏ — hiển thị 3 NVBH có nhiều KPI đỏ nhất';
  riskCard='<section class="fundamental-risk"><div class="fundamental-risk-heading"><strong>Nhân viên cần ưu tiên theo dõi</strong><span>'+description+'</span></div><div class="fundamental-risk-list">'+chosen.map(e=>'<div class="fundamental-risk-item"><strong>'+escapeHTML(e.name)+'</strong><b>'+e.count+'/7 đỏ</b><span>'+escapeHTML(e.red.length?e.red.join(' · '):'Không có KPI đỏ')+'</span></div>').join('')+'</div></section>';
 }
 const header='<div class="fundamental-row fundamental-header"><strong>NVBH</strong>'+FUNDAMENTAL_KPIS.map(k=>'<strong>'+escapeHTML(k.name)+'</strong>').join('')+'</div>';
 const team='<div class="fundamental-row fundamental-team"><strong>TỔNG TEAM</strong>'+FUNDAMENTAL_KPIS.map(k=>metric(teamVal(k.id))).join('')+'</div>';
 const rows=filtered.map(e=>'<div class="fundamental-row"><strong class="fundamental-name">'+escapeHTML(e.name)+'</strong>'+FUNDAMENTAL_KPIS.map(k=>metric(calc(e.id,k.id))).join('')+'</div>').join('');
 return '<div class="fundamental-page"><div class="compact-toolbar"><div class="compact-source">Fundamental KPI · Kỳ 10/2026 · '+(ready?'Chốt '+escapeHTML(fundamentalData.cutoff_date||'—')+' · '+escapeHTML(fundamentalData.status)+' · '+escapeHTML(fundamentalData.qa_status):'Target 7/7 KPI · LPPC 4,7 đã xác nhận · Actual chờ QA theo RAW')+'</div><div class="compact-filters"><label><span>NVBH</span><select id="fundamentalFilter">'+options+'</select></label></div></div>'+
 (fundamentalError?'<div class="notice error">'+escapeHTML(fundamentalError)+'</div>':'')+
 (focusCandidatePilot?'<div class="fundamental-warning"><strong>PILOT 16/10 — CH mua SKU Focus ứng viên (CHƯA xét MOQ):</strong> Trà Búp Non '+focusCandidatePilot.team.tra_bup_non+'/'+focusCandidatePilot.target.tra_bup_non+'; Homey 2.9kg '+focusCandidatePilot.team.homey_29kg+'/'+focusCandidatePilot.target.homey_29kg+'. Kết quả ASO Focus chính thức vẫn REVIEW MOQ nhóm.</div>':'')+
 (coveragePilot?'<div class="fundamental-warning"><strong>PILOT 16/10 — CH MCP có đơn dương:</strong> '+coveragePilot.summary.unique_positive_mcp+' / '+coveragePilot.summary.mcp_total+' ('+fmtPct(100*coveragePilot.summary.unique_positive_mcp/coveragePilot.summary.mcp_total)+'). Không phải KPI Bao phủ chính thức; 56 dòng ngoài MCP vị trí đang REVIEW.</div>':'')+
 (ready&&sales?.cutoff_date&&fundamentalData.cutoff_date!==sales.cutoff_date?'<div class="notice error">DỮ LIỆU CHƯA ĐỒNG BỘ: Fundamental chốt '+escapeHTML(fundamentalData.cutoff_date)+'; doanh số chốt '+escapeHTML(sales.cutoff_date)+'. Không dùng KPI cũ để kết luận tiến độ 16/10.</div>':'')+
 (ready&&fundamentalData.disclaimer?'<div class="fundamental-warning">'+escapeHTML(fundamentalData.disclaimer)+'</div>':'')+
 (!ready?'<div class="fundamental-warning">Chỉ tiêu 7 KPI đã nạp (Master REV3 CANDIDATE/HOLD; LPPC 4,7 do Supervisor xác nhận). Actual chưa phát hành do đang đối soát MOQ, trạng thái đơn và MCP trên RAW 15/10. Dấu “—” không có nghĩa bằng 0.</div>':'')+
 '<div class="fundamental-scroll" role="region" aria-label="Fundamental KPI, vuốt ngang để xem các KPI">'+header+team+rows+'</div>'+riskCard+
 '<div class="compact-footer">Mỗi ô: CT = Chỉ tiêu · Đạt = Thực đạt · số lớn = % hoàn thành. Màu đỏ: dưới Timegone; xanh: từ Timegone đến +10 đpt; tím: trên +10 đpt. Không hiển thị Timegone theo yêu cầu. Tổng Team lấy từ KPI Engine đã xác nhận, không cộng cơ học KPI tỷ lệ.</div></div>';
}
