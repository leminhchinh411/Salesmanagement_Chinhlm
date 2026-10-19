'use strict';
// Additive Sales Action Center purchase-frequency view. Never infer order counts from purchased boolean.
(function(){
 const oldRows=actionRows, oldCenter=actionCenter;
 let activity=null, activityIssue='Chưa có snapshot số đơn và ngày mua gần nhất đã đối soát';
 async function loadActivity(){
  activity=null;
  try{
   const response=await fetch('data/action-order-activity-202610.json?cache='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('Chưa phát hành dữ liệu số đơn theo khách hàng');
   const x=await response.json(),routes=actionRoutes;
   if(!routes||x.schema_version!==1||x.period!=='10/2026'||x.cutoff_date<(sales?.cutoff_date||'')||x.route_source_sha256!==routes.source_sha256||x.qa_status!=='PASSED'||x.complete_mcp!==true)throw Error('Snapshot chưa đạt QA hoặc không khớp ngày chốt/MCP');
   const owners=new Map(routes.employees.flatMap(e=>e.customers.map(c=>[c.id,e.id])));
   if(!Array.isArray(x.customers)||x.customers.length!==owners.size)throw Error('Thiếu khách hàng trong snapshot');
   const map=new Map();
   for(const c of x.customers){
    if(map.has(c.id)||owners.get(c.id)!==c.employee_id||!Number.isSafeInteger(c.order_count)||c.order_count<0)throw Error('Trùng MCP hoặc số đơn không hợp lệ');
    if(c.order_count===0&&c.last_order_date!==null)throw Error('Ngày mua không khớp số đơn');
    if(c.order_count>0&&(!/^2026-10-(0[1-9]|[12][0-9]|3[01])$/.test(c.last_order_date||'')||c.last_order_date>x.cutoff_date))throw Error('Ngày mua gần nhất không hợp lệ');
    map.set(c.id,c);
   }
   activity=map;activityIssue='';actionPurchases=new Map([...map].map(([id,c])=>[id,c.order_count>0]));actionPurchaseError='';
  }catch(e){activityIssue=e.message;}
 }
 const oldLoad=loadActionRoutes;
 loadActionRoutes=async function(){await oldLoad();await loadActivity();};
 actionRows=function(){
  return oldRows().map(e=>({...e,customers:e.customers.map(c=>({...c,activity:activity?.get(c.id)||null}))}));
 };
 function freqNumber(c){
  const m=/^F(\d+)$/.exec(String(c.frequency||''));
  return m?Number(m[1]):null;
 }
 function compact(c){
  const freq=freqNumber(c),n=c.activity?.order_count,date=c.activity?.last_order_date;
  const count=Number.isSafeInteger(n)?String(n):'—';
  const color=Number.isSafeInteger(n)&&freq!==null?(n<freq?'below':n===freq?'equal':'above'):'unknown';
  const last=date?date.slice(8,10)+'/'+date.slice(5,7):'—';
  return '<div class="action-activity" aria-label="Tần suất và đơn mua tháng 10"><span>Tần suất <b>'+(freq??'—')+'</b></span><span>Đơn <b class="action-count '+color+'">'+count+'</b></span><span>Gần nhất <b>'+last+'</b></span></div>';
 }
 actionCenter=function(){
  const html=oldCenter();
  if(!actionRoutes)return html;
  // Preserve existing full expandable customer details, priorities, program actions and filters.
  // Inject a compact row into each customer summary in the same order as the original renderer.
  const all=actionRows(),q=actionQuery.trim().toLocaleLowerCase('vi');
  const selected=all.filter(e=>actionEmployee==='all'||actionEmployee===e.id);
  const customerMap=new Map(selected.flatMap(e=>e.customers.map(c=>[c.id,c])));
  const parser=document.createElement('template');parser.innerHTML=html;
  const groups=parser.content.querySelectorAll('.action-employee');
  selected.forEach((e,i)=>{
   const route=e.customers.filter(c=>ActionCore.inRoute(c,actionDay,actionWeek));
   const focus=route.filter(c=>(actionShowAll||c.actions.length)&&(actionPriority==='all'||c.priority===actionPriority)&&(actionPurchaseFilter==='all'||(actionPurchaseFilter==='no'?c.purchased===false:c.purchased===true))&&(!q||(c.id+' '+c.name).toLocaleLowerCase('vi').includes(q))).sort((a,b)=>({P1:1,P2:2,P3:3,NONE:4}[a.priority]-{P1:1,P2:2,P3:3,NONE:4}[b.priority])||Number(a.purchased!==false)-Number(b.purchased!==false)||a.name.localeCompare(b.name,'vi'));
   const cards=groups[i]?.querySelectorAll('.action-store')||[];
   focus.forEach((c,j)=>{
    const summary=cards[j]?.querySelector('summary');
    if(summary)summary.insertAdjacentHTML('beforeend',compact(customerMap.get(c.id)));
    const detail=cards[j]?.querySelector('.action-store-detail');
    if(detail)detail.insertAdjacentHTML('afterbegin','<p class="action-detail-activity"><b>Hoạt động tháng 10:</b> '+(c.activity?'Số đơn '+c.activity.order_count+' · Đơn gần nhất '+(c.activity.last_order_date?c.activity.last_order_date.slice(8,10)+'/'+c.activity.last_order_date.slice(5,7):'—'):'Chưa có dữ liệu đơn hàng đã đối soát')+'</p>');
   });
  });
  const source=parser.content.querySelector('.action-source');if(source)source.textContent+=' · Đơn mua chốt '+(activity?'18/10/2026':'chưa QA');const method=parser.content.querySelector('.action-method');
  if(method){const p=document.createElement('p');p.textContent=activityIssue?'Số đơn/ngày mua: '+activityIssue+'. Không suy diễn từ trạng thái đã mua.':'Số đơn/ngày mua từ snapshot đã QA, đếm mã đơn duy nhất theo MCP.';method.append(p);}
  return parser.innerHTML;
 };
})();
