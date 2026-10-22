'use strict';
// Management suggestions only. Existing KPI engines remain the owners of KPI results.
const ActionCore = (() => {
 const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
 function today(now=new Date()) {
  const day=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',weekday:'short'}).format(now);
  return {Mon:'2',Tue:'3',Wed:'4',Thu:'5',Fri:'6',Sat:'7',Sun:'8'}[day];
 }
 function validateRoutes(x,expected) {
  if(x.schema_version!==1||x.period!=='10/2026'||!Array.isArray(x.employees)||x.employees.length!==11||!x.source||!x.source_sha256)throw Error('Thiếu nguồn hoặc danh sách 11 NVBH trong lịch MCP');
  const ids=new Set(),stores=new Set();
  for(const e of x.employees){
   if(ids.has(e.id)||!expected.some(p=>p.id===e.id&&p.name===e.name)||!Array.isArray(e.customers))throw Error('Mã NVBH lịch tuyến không khớp Dashboard');
   ids.add(e.id);
   for(const c of e.customers){
    if(typeof c.id!=='string'||!c.id||stores.has(c.id)||!c.name||!Array.isArray(c.days)||!c.days.length||new Set(c.days).size!==c.days.length||c.days.some(d=>!Number.isInteger(d)||d<2||d>7)||!['both','odd','even'].includes(c.week))throw Error('Mã CH, quyền phụ trách hoặc lịch viếng thăm không hợp lệ');
    stores.add(c.id);
   }
  }
  return x;
 }
 function inRoute(c,day,week){return (day==='all'||c.days.includes(Number(day)))&&(week==='all'||c.week==='both'||c.week===week);}
 function validatePurchases(x,routes,cutoff){
  const expected=new Map(routes.employees.flatMap(e=>e.customers.map(c=>[c.id,e.id])));
  if(x.schema_version!==1||x.period!==routes.period||x.cutoff_date!==cutoff||x.complete_mcp!==true||x.route_source_sha256!==routes.source_sha256||!Array.isArray(x.customers)||x.customers.length!==expected.size)throw Error('Trạng thái mua hàng chưa khớp MCP/ngày chốt');
  const ids=new Set();
  for(const c of x.customers){if(ids.has(c.id)||expected.get(c.id)!==c.employee_id||typeof c.purchased!=='boolean')throw Error('Trạng thái mua hàng trùng hoặc thiếu mã');ids.add(c.id);}
  const purchased=x.customers.filter(c=>c.purchased).length;
  if(x.summary?.mcp!==expected.size||x.summary.purchased!==purchased||x.summary.not_purchased!==expected.size-purchased)throw Error('Tổng mua hàng chưa đối soát');
  return new Map(x.customers.map(c=>[c.id,c.purchased]));
 }
 function hvdnActions(c,status){
  const a=[];let review=false;
  if(!finite(c.target)||c.target<=0||!finite(c.actual))return [{program:c.program,priority:'P3',review:true,text:'Chưa đủ doanh số nền để xác định khoảng thiếu.'}];
  if(c.actual<c.target)a.push({text:'Bổ sung doanh số nền',gap:c.target-c.actual});
  for(const t of c.tasks.filter(t=>t.type==='FOCUS')){
   const s=status(c,t);
   if(s==='REVIEW'){review=true;a.push({review:true,text:'Xác minh FOCUS '+t.name});}
   else if(s==='FAIL')a.push({text:'Bổ sung FOCUS '+t.name,gap:Math.max(0,200000-t.actual)});
  }
  const news=c.tasks.filter(t=>t.type==='NEW');
  if(['CAT1','CAT3','BRAND1','BRAND3'].includes(c.tier)&&news.length&&!news.some(t=>status(c,t)==='PASS')){
   const options=news.filter(t=>status(c,t)==='FAIL'&&finite(t.actual));
   const uncertain=news.filter(t=>status(c,t)==='REVIEW');
   review=review||uncertain.length>0;
   if(options.length)a.push({text:'Mở ít nhất 1 NEW: '+options.map(t=>t.name+' (thiếu '+Math.max(0,200000-t.actual).toLocaleString('vi-VN')+'đ)').join(' hoặc ')});
   if(uncertain.length)a.push({review:true,text:'NEW cần xác minh: '+uncertain.map(t=>t.name).join(', ')});
  }
  const missing=a.filter(t=>!t.review).length;
  return a.map(t=>({...t,program:c.program,priority:t.review?'P3':!review&&missing===1&&c.actual>=c.target?'P1':'P2'}));
 }
 function growthActions(c,names){
  return Object.entries(c.programs||{}).flatMap(([id,p])=>{
   const program=names[id]||id;
   if(p.actual_cutoff!=='2026-10-16'||p.actual_status!=='PILOT'||p.target_conflict||!finite(p.actual)||!finite(p.target)||p.target<=0)return [{program,priority:'P3',review:true,text:'Đối soát Actual/chỉ tiêu cấp cửa hàng trước khi giao mức bổ sung.'}];
   return p.actual<p.target?[{program,priority:'P2',gap:p.target-p.actual,text:'Bổ sung doanh số'}]:[];
  });
 }
 function rank(actions){return actions.some(a=>a.priority==='P1')?'P1':actions.some(a=>a.priority==='P2')?'P2':actions.length?'P3':'NONE';}
 return {today,validateRoutes,validatePurchases,inRoute,hvdnActions,growthActions,rank};
})();
if(typeof module!=='undefined')module.exports=ActionCore;
