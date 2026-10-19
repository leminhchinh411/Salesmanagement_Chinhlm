'use strict';
let actionRoutes=null,actionPurchases=null,actionPurchaseError='',actionError='',actionDay=ActionCore.today(),actionWeek='all',actionEmployee='all',actionPriority='all',actionQuery='',actionShowAll=false,actionPurchaseFilter='all';
const actionDays=[['all','Tất cả thứ'],['2','Thứ 2'],['3','Thứ 3'],['4','Thứ 4'],['5','Thứ 5'],['6','Thứ 6'],['7','Thứ 7'],['8','Chủ nhật']];
async function loadActionRoutes(){
 actionRoutes=null;actionPurchases=null;actionPurchaseError='';actionError='';
 try{
  if(!sales?.employees)throw Error('Chưa tải đủ danh sách NVBH để ghép lịch');
  const r=await fetch('data/action-routes-pilot.json?v=20261018',{cache:'no-store'});
  if(!r.ok)throw Error('Không tải được lịch MCP');
  actionRoutes=ActionCore.validateRoutes(await r.json(),sales.employees);
  try{
   const p=await fetch('data/action-purchase-status-20261016.json?v=20261018-compact',{cache:'no-store'});
   if(!p.ok)throw Error('Chưa tải được trạng thái mua hàng');
   actionPurchases=ActionCore.validatePurchases(await p.json(),actionRoutes,sales.cutoff_date);
  }catch(err){actionPurchaseError=err.message;}
 }catch(err){actionError=err.message;}
}
const actionPreviousLoadHvdn=loadHvdn;
loadHvdn=async function(){await actionPreviousLoadHvdn();await loadActionRoutes();};
function actionRows(){
 if(!actionRoutes)return [];
 const hvdn=new Map(),growth=new Map(),combos=new Map(),conflicts=new Set();
 const routeOwners=new Map(actionRoutes.employees.flatMap(e=>e.customers.map(c=>[c.id,e.id])));
 if(hvdnData?.cutoff_date==='2026-10-16')for(const e of hvdnData.employees)for(const c of e.customers){
  if(hvdn.has(c.id)||routeOwners.get(c.id)!==e.id){conflicts.add(c.id);continue;}hvdn.set(c.id,c);
 }
 if(growthData&&growthCustomerPilot?.cutoff_date==='2026-10-16')for(const e of growthData.employees){
  const owner=actionRoutes.employees.find(r=>r.name===e.name);
  for(const c of e.customers){if(!owner||routeOwners.get(c.id)!==owner.id||growth.has(c.id)){conflicts.add(c.id);continue;}growth.set(c.id,c);}
 }
 if(comboData)for(const e of comboData.employees){
  const owner=actionRoutes.employees.find(r=>r.name===e.name);
  for(const c of e.customers){if(!owner||routeOwners.get(c.id)!==owner.id||combos.has(c.id)){conflicts.add(c.id);continue;}combos.set(c.id,c);}
 }
 const names=Object.fromEntries(GROWTH_NAMES);
 return actionRoutes.employees.map(e=>({...e,customers:e.customers.map(c=>{
  let actions=[];const programs=[];
  const h=hvdn.get(c.id),g=growth.get(c.id),co=combos.get(c.id);
  if(conflicts.has(c.id))actions=[{program:'Ghép dữ liệu',priority:'P3',review:true,text:'Quyền phụ trách hoặc chương trình chưa khớp MCP. Xác minh trước khi giao việc.'}];
  else{
   if(h){programs.push(h.program);actions.push(...ActionCore.hvdnActions(h,hvdnTaskStatus));}
   if(g){programs.push(...Object.keys(g.programs).map(p=>names[p]||p));actions.push(...ActionCore.growthActions(g,names));}
   if(co){programs.push('Combo');
    if(comboPilot?.reconciled===true&&comboPilot.cutoff_date==='2026-10-16'&&co.combo_orders===0)actions.push({program:'Combo',priority:'P2',text:'Kiểm tra nhu cầu và triển khai đơn Combo đầu tiên theo quy tắc hiện hành.'});
    else if(!comboPilot?.reconciled)actions.push({program:'Combo',priority:'P3',review:true,text:'Danh sách Combo chưa khớp snapshot. Chưa xác nhận cửa hàng không mua.'});
   }
  }
  const purchased=actionPurchases?.get(c.id);
  if(purchased===false)actions.unshift({program:'Mở bán',priority:'P2',text:'CHƯA MUA HÀNG — khai thác nhu cầu và tạo đơn bán hợp lệ.'});
  return {...c,purchased,programs,actions,priority:ActionCore.rank(actions)};
 })}));
}
function actionCenter(){
 const esc=escapeHTML;
 if(!actionRoutes)return '<section class="card"><h2>Sales Action Center</h2><p class="notice error">Chưa tải được lịch tuyến: '+esc(actionError)+'</p></section>';
 const all=actionRows(),q=actionQuery.trim().toLocaleLowerCase('vi');
 const selected=all.filter(e=>actionEmployee==='all'||actionEmployee===e.id).map(e=>{
  const route=e.customers.filter(c=>ActionCore.inRoute(c,actionDay,actionWeek));
  const focus=route.filter(c=>(actionShowAll||c.actions.length)&&(actionPriority==='all'||c.priority===actionPriority)&&(actionPurchaseFilter==='all'||(actionPurchaseFilter==='no'?c.purchased===false:c.purchased===true))&&(!q||(c.id+' '+c.name).toLocaleLowerCase('vi').includes(q))).sort((a,b)=>({P1:1,P2:2,P3:3,NONE:4}[a.priority]-{P1:1,P2:2,P3:3,NONE:4}[b.priority])||Number(a.purchased!==false)-Number(b.purchased!==false)||a.name.localeCompare(b.name,'vi'));
  return {...e,route,focus};
 });
 const focus=selected.flatMap(e=>e.focus),route=selected.flatMap(e=>e.route);
 const options=(arr,v)=>arr.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===v?'selected':'')+'>'+esc(n)+'</option>').join('');
 const select=(id,label,arr,value)=>'<label>'+label+'<select id="'+id+'">'+options(arr,value)+'</select></label>';
 const taskLabel=a=>a.program+(a.text.startsWith('Bổ sung FOCUS ')?' · '+a.text.slice(14):a.text==='Bổ sung doanh số nền'?' · Nền':a.text.startsWith('Mở ít nhất 1 NEW')?' · NEW':'')+(Number.isFinite(a.gap)?': thiếu '+fmtMoney(a.gap)+'đ':a.review?' · Xác minh':'');
 const cards=selected.map(e=>{
  const employee=sales?.employees.find(p=>p.id===e.id),t=employee&&employee.divisions.every(d=>Number.isFinite(d.actual))?aggregate([employee],'all'):null;
  const body=e.focus.map(c=>{
   const tasks=c.actions.filter(a=>a.program!=='Mở bán'),visible=tasks.slice(0,2);
   const purchase=c.purchased===false?'<b class="action-purchase no">CHƯA MUA HÀNG</b>':c.purchased===true?'<span class="action-purchase yes">Đã mua hàng</span>':'<span class="action-purchase">Chưa đủ dữ liệu mua hàng</span>';
   return '<details class="action-store"><summary><div class="action-store-head"><strong>'+esc(c.name)+'</strong><span class="action-badge '+c.priority+'">'+(c.priority==='NONE'?'Theo dõi':c.priority)+'</span></div><div class="action-store-meta"><span>'+esc(c.id)+'</span>'+purchase+'</div><div class="action-chips">'+visible.map(a=>'<span>'+esc(taskLabel(a))+'</span>').join('')+(tasks.length>2?'<span>+'+(tasks.length-2)+' mục</span>':'')+(!c.actions.length?'<span>Chưa có việc đề xuất</span>':'')+'</div></summary><div class="action-store-detail"><small>'+c.days.map(d=>'T'+d).join(', ')+' · '+({both:'Hằng tuần',odd:'Tuần lẻ',even:'Tuần chẵn'}[c.week])+'</small>'+c.actions.map(a=>'<p><b>'+esc(a.program)+'</b> · '+esc(a.text)+(Number.isFinite(a.gap)?' · Thiếu '+fmtMoney(a.gap)+'đ':'')+'</p>').join('')+'</div></details>';
  }).join('');
  return '<details class="action-employee" open><summary><strong>'+esc(e.name)+'</strong><span>'+e.focus.length+'/'+e.route.length+' CH'+(t?' · DS '+(t.actual/1000000).toLocaleString('vi-VN',{maximumFractionDigits:1})+'tr':'')+'</span></summary><div class="action-store-grid">'+(body||'<p class="action-empty">'+(!e.route.length?'Không có tuyến theo bộ lọc.':'Không có CH khớp bộ lọc.')+'</p>')+'</div></details>';
 }).join('');
 const missing=[];if(!hvdnData||hvdnData.cutoff_date!=='2026-10-16')missing.push('CAT/BRAND chưa đồng bộ');if(!growthCustomerPilot||growthCustomerPilot.cutoff_date!=='2026-10-16')missing.push('Tăng trưởng chưa đồng bộ');if(!comboPilot?.reconciled)missing.push('Combo chưa khớp danh sách');if(actionPurchaseError)missing.push(actionPurchaseError);
 return '<div class="action-page"><div class="action-heading"><h2>Điều hành theo tuyến</h2><button type="button" id="actionToday">Hôm nay</button></div><p class="action-source">PILOT · DS/đơn chốt '+esc(sales?.cutoff_date||'—')+' · Chương trình chốt 16/10 · MCP 1.695 CH · Tuần chọn thủ công</p><div class="action-filters">'+select('actionDay','Thứ viếng thăm',actionDays,actionDay)+select('actionWeek','Tuần',[['all','Tất cả tuần'],['odd','Tuần lẻ'],['even','Tuần chẵn']],actionWeek)+select('actionEmployee','NVBH',[['all','Tất cả 11 NVBH'],...all.map(e=>[e.id,e.name])],actionEmployee)+select('actionPurchaseFilter','Mua hàng',[['all','Tất cả'],['no','CHƯA MUA HÀNG'],['yes','Đã mua hàng']],actionPurchaseFilter)+select('actionPriority','Ưu tiên',[['all','Tất cả'],['P1','P1'],['P2','P2'],['P3','P3']],actionPriority)+'<label>Tìm cửa hàng<input id="actionQuery" type="search" placeholder="Tên hoặc mã CH" value="'+esc(actionQuery)+'"></label></div><div class="action-stats">'+[['CH theo tuyến',route.length],['CH tập trung',focus.length],['Chưa mua',actionPurchases?route.filter(c=>c.purchased===false).length:'—'],['P1',focus.filter(c=>c.priority==='P1').length]].map(([n,v])=>'<div><small>'+n+'</small><strong>'+v+'</strong></div>').join('')+'</div><label class="action-toggle"><input id="actionShowAll" type="checkbox" '+(actionShowAll?'checked':'')+'> Xem toàn bộ CH theo tuyến</label>'+(actionDay==='8'?'<p class="action-note">Chủ nhật không có tuyến trong MCP.</p>':'')+'<div class="action-team">'+cards+'</div><details class="action-method"><summary>Nguồn và lưu ý'+(missing.length?' · '+missing.length+' mục cần xác minh':'')+'</summary><p>'+esc(actionRoutes.source)+' · RAW 01–16/10/2026. CHƯA MUA HÀNG = chưa có dòng Tổng tiền >0 thuộc đơn hợp lệ trong kỳ, tính trên 11 NVBH; không xét MOQ. Dữ liệu thiếu hoặc lệch ngày chốt không gán nhãn chưa mua.</p><p>Chẵn/lẻ tuần chọn thủ công. Danh sách theo thứ chưa phải bằng chứng đã viếng thăm. P1: CAT/BRAND đạt nền, còn một điều kiện bắt buộc, không REVIEW. P2: cần thúc đẩy. P3: cần xác minh. Đây là đề xuất quản trị. Chưa có việc đề xuất không đồng nghĩa đạt toàn bộ KPI.</p><p>'+esc(missing.join(' · '))+'</p></details></div>';
}
document.addEventListener('change',e=>{
 const binds={actionPurchaseFilter:v=>actionPurchaseFilter=v,actionDay:v=>actionDay=v,actionWeek:v=>actionWeek=v,actionEmployee:v=>actionEmployee=v,actionPriority:v=>actionPriority=v,actionShowAll:()=>actionShowAll=e.target.checked};
 if(binds[e.target.id]){binds[e.target.id](e.target.value);render();}
});
document.addEventListener('input',e=>{if(e.target.id==='actionQuery'){const start=e.target.selectionStart;actionQuery=e.target.value;render();const input=document.getElementById('actionQuery');input.focus();input.setSelectionRange(start,start);}});
document.addEventListener('click',e=>{if(e.target.closest('#actionToday')){actionDay=ActionCore.today();render();}});
