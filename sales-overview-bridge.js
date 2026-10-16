'use strict';
const SALES_IDS=['01','03','09','13','14','17','19','20','22','23','24'];
const SALES_DIVS=['Coffee','Convenience Foods','Home Care','Nutrition','Processed Meats','Refreshment Drinks','Seasoning'];
const SALES_TARGET_TOTAL=5769397937;
async function loadSales(){
 sales=null;salesError='';
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
  // Optional future snapshot; never treat the target workbook SO column as actual.
  const r=await fetch('data/sales-actual.json?v='+Date.now(),{cache:'no-store'});
  if(r.ok){
   const x=await r.json();
   if(x.schema_version===1&&x.status==='PUBLISHED'&&x.qa_status==='PASSED'&&x.approved_for_public===true&&x.period==='10/2026'&&numeric(x.timegone_pct)&&x.timegone_pct<=100&&x.cutoff_date&&Array.isArray(x.employees)&&x.employees.length===11){
    const map=new Map(x.employees.map(e=>[e.id,e]));
    let valid=map.size===11;
    for(const e of sales.employees){
     const v=map.get(e.id);
     if(!v||!Array.isArray(v.divisions)||v.divisions.length!==7){valid=false;break;}
     const dm=new Map(v.divisions.map(d=>[d.id,d.actual]));
     if(dm.size!==7||SALES_DIVS.some(id=>!numeric(dm.get(id)))){valid=false;break;}
    }
    if(valid){for(const e of sales.employees){const dm=new Map(map.get(e.id).divisions.map(d=>[d.id,d.actual]));for(const d of e.divisions)d.actual=dm.get(d.id);}
     sales.status='PUBLISHED';sales.timegone_pct=x.timegone_pct;sales.cutoff_date=x.cutoff_date;sales.source=x.source||'Danh sách đơn hàng';sales.version=x.version||'Snapshot đã đối soát';
    }
   }
  }
 }catch(e){sales=null;salesError=e.message;}
}
function kpi(){
 if(!sales)return '<div class="notice error">Chưa tải được dữ liệu Target: '+escapeHTML(salesError||'Không xác định')+'</div>';
 const tg=sales.timegone_pct,hasActual=sales.status==='PUBLISHED';
 const employees=sales.employees.filter(e=>employeeFilter==='all'||e.id===employeeFilter);
 const divisions=sales.divisions.filter(d=>divisionFilter==='all'||d.id===divisionFilter);
 const team=aggregate(sales.employees,divisionFilter);
 const fmt=fmtMoney,divName=id=>sales.divisions.find(d=>d.id===id)?.name||id;
 const opts=(arr,sel)=>arr.map(v=>'<option value="'+escapeHTML(v.id)+'"'+(v.id===sel?' selected':'')+'>'+escapeHTML(v.name)+'</option>').join('');
 const metric=(label,value)=>'<div class="sales-kpi"><span>'+label+'</span><strong>'+value+'</strong></div>';
 const summary=(name,t)=>{
  const pct=progress(t.actual,t.target),delta=pct===null||tg===null?null:pct-tg;
  return '<div class="sales-summary '+colorClass(delta)+'"><strong class="sales-name">'+escapeHTML(name)+'</strong><div class="sales-figures">'+metric('Chỉ tiêu',fmt(t.target))+metric('Thực đạt',fmt(t.actual))+metric('Hoàn thành',fmtPct(pct))+metric('Timegone',fmtPct(tg))+metric('So tiến độ',deltaLabel(delta))+'</div><div class="sales-note">'+(hasActual?noteFor(delta):'Chờ doanh số Real-time')+'</div></div>';
 };
 const cards=employees.map(e=>{
  const rows=divisions.map(d=>{
   const v=e.divisions.find(x=>x.id===d.id),p=progress(v.actual,v.target),delta=p===null||tg===null?null:p-tg;
   return '<div class="division-row '+colorClass(delta)+'"><strong>'+escapeHTML(d.name)+'</strong><span>CT: '+fmt(v.target)+'</span><span>Đạt: '+fmt(v.actual)+'</span><span>'+fmtPct(p)+'</span><span>'+deltaLabel(delta)+'</span><b>'+(hasActual?noteFor(delta):'Chờ dữ liệu')+'</b></div>';
  }).join('');
  return '<details class="employee-card"><summary>'+summary(e.name,aggregate([e],divisionFilter))+'</summary><div class="division-list">'+rows+'</div></details>';
 }).join('');
 const chartData=employees.map(e=>({name:e.name,...aggregate([e],divisionFilter)}));
 const max=Math.max(1,...chartData.map(x=>hasActual?progress(x.actual,x.target)||0:x.target));
 const bars='<div class="bar-chart">'+chartData.map(v=>{
  const p=progress(v.actual,v.target),delta=p===null||tg===null?null:p-tg,value=hasActual?p:v.target;
  return '<div class="bar-item"><div class="bar-value">'+(hasActual?fmtPct(p):fmt(v.target))+'</div><div class="bar-track"><div class="bar-fill '+(hasActual?colorClass(delta):'')+'" style="height:'+((value||0)/max*100).toFixed(2)+'%"></div></div><div class="bar-label">'+escapeHTML(v.name)+'</div></div>';
 }).join('')+'</div>';
 return '<div class="notice">'+(hasActual?'Snapshot chốt '+escapeHTML(sales.cutoff_date)+' · QA PASSED':'TARGET THÁNG 10/2026 ĐÃ ĐỐI SOÁT · Chưa có doanh số Real-time; không đánh giá màu tiến độ')+' · '+escapeHTML(sales.version)+'</div>'+
 '<div class="filterbar"><label>Nhân viên<select id="employeeFilter">'+opts([{id:'all',name:'Tất cả 11 NVBH'},...sales.employees],employeeFilter)+'</select></label><label>Sub Division<select id="divisionFilter">'+opts([{id:'all',name:'Tất cả ngành hàng'},...sales.divisions],divisionFilter)+'</select></label></div>'+
 '<section class="card"><h2>Tổng Team · '+(divisionFilter==='all'?'Tất cả ngành hàng':escapeHTML(divName(divisionFilter)))+'</h2>'+summary('11 NVBH',team)+'</section>'+
 '<section class="card"><h2>Biểu đồ cột · '+(hasActual?'% hoàn thành':'Chỉ tiêu doanh số (đồng)')+'</h2><div class="chart-wrap">'+bars+'</div></section>'+
 '<section class="card"><h2>Chi tiết NVBH ('+employees.length+'/11)</h2><p class="small muted">Nhấn vào tên NVBH để xem chi tiết theo Sub Division. Màu đỏ: chậm tiến độ; xanh: bằng đến +10 đpt; tím: trên +10 đpt.</p>'+cards+'</section>';
}
