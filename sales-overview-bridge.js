'use strict';
const SALES_IDS=['01','03','09','13','14','17','19','20','22','23','24'];
const SALES_DIVS=['Coffee','Convenience Foods','Home Care','Nutrition','Processed Meats','Refreshment Drinks','Seasoning'];
const SALES_TARGET_TOTAL=5769397937;
let trackingStatus=null;
async function loadSales(){
 sales=null;salesError='';trackingStatus=null;
 try{
  const results=await Promise.all(SALES_IDS.map(async id=>{
   const r=await fetch('data/targets/'+id+'.json?v=20261016',{cache:'no-store'});
   if(!r.ok)throw Error('Thiếu Target NVBH '+id);
   return r.json();
  }));
  const ids=new Set(),employees=results.map(e=>{
   if(!e.id||!e.name||ids.has(e.id)||!Array.isArray(e.target)||e.target.length!==7||e.target.some(v=>!numeric(v)))throw Error('Target NVBH không hợp lệ');
   ids.add(e.id);
   return {id:e.id,name:e.name,divisions:SALES_DIVS.map((id,i)=>({id,target:e.target[i],actual:null}))};
  });
  const targetSum=employees.flatMap(e=>e.divisions).reduce((s,d)=>s+d.target,0);
  if(targetSum!==SALES_TARGET_TOTAL)throw Error('Tổng Target không khớp đối soát');
  sales={status:'TARGET_ONLY',period:'10/2026',cutoff_date:null,source:'TARGET SO · File chỉ tiêu đã xác nhận',version:'TARGET-OCT2026-1',timegone_pct:null,divisions:SALES_DIVS.map(id=>({id,name:id})),employees};
  try{const st=await fetch('data/tracking-status.json?cache='+Date.now(),{cache:'no-store'});if(st.ok){const info=await st.json();if(info.schema_version===1&&info.period==='10/2026')trackingStatus=info;}}catch(e){}
  // Optional future snapshot; never treat the target workbook SO column as actual.
  const r=await fetch('data/sales-actual.json?v='+Date.now(),{cache:'no-store'});
  if(r.ok){
   const x=await r.json();
   if(x.schema_version===1&&(x.status==='PUBLISHED'&&x.qa_status==='PASSED'||x.status==='PILOT'&&['RAW_RECALCULATED_RECONCILIATION_PENDING','HOLD'].includes(x.qa_status))&&x.approved_for_public===true&&x.period==='10/2026'&&numeric(x.timegone_pct)&&x.timegone_pct<=100&&x.cutoff_date&&Array.isArray(x.employees)&&x.employees.length===11){
    const map=new Map(x.employees.map(e=>[e.id,e]));
    let valid=map.size===11;
    for(const e of sales.employees){
     const v=map.get(e.id);
     if(!v||!Array.isArray(v.divisions)||v.divisions.length!==7){valid=false;break;}
     const dm=new Map(v.divisions.map((d,i)=>[SALES_DIVS[i],typeof d==='number'?d:d.actual]));
     if(dm.size!==7||SALES_DIVS.some(id=>!numeric(dm.get(id)))){valid=false;break;}
    }
    if(valid){for(const e of sales.employees){const dm=new Map(map.get(e.id).divisions.map((d,i)=>[SALES_DIVS[i],typeof d==='number'?d:d.actual]));for(const d of e.divisions)d.actual=dm.get(d.id);}
     sales.status=x.status;sales.qa_status=x.qa_status;sales.timegone_pct=x.timegone_pct;sales.cutoff_date=x.cutoff_date;sales.source=x.source||'Danh sách đơn hàng';sales.version=x.version||'Snapshot đã đối soát';
    }
   }
  }
 }catch(e){sales=null;salesError=e.message;}
}
function aggregate(items,division){
 const details=items.flatMap(e=>e.divisions.filter(d=>division==='all'||d.id===division));
 return {target:details.reduce((a,d)=>a+d.target,0),actual:details.length&&details.every(d=>numeric(d.actual))?details.reduce((a,d)=>a+d.actual,0):null};
}


function kpi(){
 if(!sales)return '<div class="notice error">Chưa tải được Target: '+escapeHTML(salesError||'Không xác định')+'</div>';
 const tg=sales.timegone_pct,hasActual=['PUBLISHED','PILOT'].includes(sales.status);
 const people=sales.employees.filter(e=>employeeFilter==='all'||e.id===employeeFilter);
 const divs=sales.divisions.filter(d=>divisionFilter==='all'||d.id===divisionFilter);
 const fmt=fmtMoney,percent=fmtPct;
 const options=(a,selected)=>a.map(v=>'<option value="'+escapeHTML(v.id)+'"'+(v.id===selected?' selected':'')+'>'+escapeHTML(v.name)+'</option>').join('');
 const team=aggregate(sales.employees,divisionFilter),teamPct=progress(team.actual,team.target);
 const status=hasActual?(sales.status==='PILOT'?'PILOT · QA '+(sales.qa_status||'HOLD')+' · Timegone tham chiếu':'QA PASSED'):'TARGET ONLY';
 const top3=e=>new Set([...e.divisions].sort((a,b)=>b.target-a.target||SALES_DIVS.indexOf(a.id)-SALES_DIVS.indexOf(b.id)).slice(0,3).map(v=>v.id));
 const rowValues=v=>{
  const p=progress(v.actual,v.target),delta=p===null||tg===null?null:p-tg;
  return '<span class="compact-number">'+fmt(v.target)+'</span><span class="compact-number">'+fmt(v.actual)+'</span><span class="compact-number">'+percent(p)+'</span><span class="compact-number">'+percent(tg)+'</span><span class="compact-number '+colorClass(delta)+'">'+deltaLabel(delta)+'</span><span class="compact-status '+colorClass(delta)+'">'+(hasActual?noteFor(delta):'Chờ dữ liệu')+'</span>';
 };
 const rows=people.map(e=>{
  const v=aggregate([e],divisionFilter),ranks=top3(e);
  const details=divs.map(d=>{
   const item=e.divisions.find(x=>x.id===d.id);
   return '<div class="compact-detail-row"><span class="compact-div">'+(ranks.has(d.id)?'<span class="star-top" title="Top 3 chỉ tiêu ngành hàng của NVBH" aria-label="Top 3 chỉ tiêu">★</span> ':'')+escapeHTML(d.name)+'</span>'+rowValues(item)+'<span></span></div>';
  }).join('');
  return '<details class="compact-employee"><summary class="compact-grid"><span class="compact-person">'+escapeHTML(e.name)+'</span>'+rowValues(v)+'<span class="compact-chevron">⌄</span></summary><div class="compact-detail">'+details+'</div></details>';
 }).join('');
 const chartData=people.map(e=>({name:e.name,...aggregate([e],divisionFilter)}));
 const max=Math.max(100,tg||0,...chartData.map(x=>progress(x.actual,x.target)||0));
 const chart='<div class="compact-chart-key"><b>Biểu đồ % hoàn thành NVBH</b><span>— — Timegone '+percent(tg)+'</span></div><div class="compact-chart-scroll"><div class="compact-bars">'+(tg!==null?'<div class="compact-time-line" style="bottom:'+(29+76*tg/max).toFixed(2)+'px"></div>':'')+chartData.map(e=>{
  const p=progress(e.actual,e.target),delta=p===null||tg===null?null:p-tg;
  return '<div class="compact-bar-item" title="'+escapeHTML(e.name)+' · '+percent(p)+'"><span class="compact-bar-value">'+percent(p)+'</span><div class="compact-bar-track"><div class="compact-bar-fill '+colorClass(delta)+'" style="height:'+((p||0)/max*100).toFixed(2)+'%"></div></div><span class="compact-bar-label">'+escapeHTML(e.name.split(' ').slice(-2).join(' '))+'</span></div>';
 }).join('')+'</div></div>';
 const delta=teamPct===null||tg===null?null:teamPct-tg;
 return '<div class="sales-compact">'+
 '<div class="compact-toolbar"><div class="compact-source">Chốt '+escapeHTML(sales.cutoff_date||'—')+' · '+escapeHTML(status)+' · '+escapeHTML(sales.version)+'</div><div class="compact-filters"><label><span>NVBH</span><select id="employeeFilter">'+options([{id:'all',name:'Tất cả 11 NVBH'},...sales.employees],employeeFilter)+'</select></label><label><span>Ngành hàng</span><select id="divisionFilter">'+options([{id:'all',name:'Tất cả ngành hàng'},...sales.divisions],divisionFilter)+'</select></label></div></div>'+
 '<section class="compact-team"><div class="compact-team-title">TỔNG TEAM <small>11 NVBH</small></div><div><small>Chỉ tiêu</small><strong>'+fmt(team.target)+'</strong></div><div><small>Thực đạt</small><strong>'+fmt(team.actual)+'</strong></div><div><small>Hoàn thành</small><strong>'+percent(teamPct)+'</strong></div><div><small>Timegone</small><strong>'+percent(tg)+'</strong></div><div><small>So TG</small><strong>'+deltaLabel(delta)+'</strong></div><div class="compact-team-note '+colorClass(delta)+'">'+(hasActual?noteFor(delta):'Chờ dữ liệu')+'</div></section>'+
 '<section class="compact-table" aria-label="Bảng kết quả NVBH, vuốt ngang trên điện thoại"><div class="compact-heading"><strong>NVBH · Xem ngành hàng</strong><span>Chỉ tiêu (đ)</span><span>Thực đạt (đ)</span><span>% Đạt</span><span>Timegone</span><span>So TG</span><span>Đánh giá</span><span></span></div>'+rows+'</section>'+
 '<section class="compact-chart">'+chart+'</section>'+
 '<div class="compact-footer">★ Top 3 ngành hàng theo <b>Target của từng NVBH</b> (đủ 7 ngành). So TG = % Đạt − Timegone. Đỏ: dưới TG · Xanh: 0–10 đpt · Tím: trên 10 đpt. '+(sales.status==='PILOT'?'Actual PILOT từ RAW mới nhất.':'')+'</div></div>';
}
