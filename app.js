const DEFAULTS={hourlyRate:4000,minimumFee:5000,riskPct:10,soundEnabled:false};
const DEFAULT_MATERIALS=[{id:'pla-basic',name:'Bambu PLA Basic',price:25000},{id:'petg-basic',name:'Bambu PETG Basic',price:28000},{id:'generic-pla',name:'Generic PLA',price:20000}];
const $=id=>document.getElementById(id); const won=n=>Math.round(n).toLocaleString('ko-KR')+'원'; const n=v=>Math.max(0,Number(v)||0);
let settings=loadJSON('pq_settings',DEFAULTS),materials=loadJSON('pq_materials',DEFAULT_MATERIALS),history=loadJSON('pq_history',[]),confirmAction=null;
const fields=['projectName','spoolPrice','grams','hours','minutes','hourlyRate','minimumFee','riskPct'];
function loadJSON(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}}
function saveJSON(k,v){localStorage.setItem(k,JSON.stringify(v))}
function defaultMaterialId(){const saved=localStorage.getItem('pq_default_material');return materials.some(m=>m.id===saved)?saved:(materials[0]?.id||'')}
function beep(){if(!settings.soundEnabled)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.03,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.08);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.08)}catch{}}
function setStatus(t){$('statusText').textContent=t}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1200)}
function ask(title,text,fn){$('dialogTitle').textContent=title;$('dialogText').textContent=text;confirmAction=fn;$('modal').classList.add('show')}
$('dialogNo').onclick=()=>{$('modal').classList.remove('show');confirmAction=null};$('dialogYes').onclick=()=>{const fn=confirmAction;$('modal').classList.remove('show');confirmAction=null;if(fn)fn()}

function populateMaterials(preferredId){
  const sel=$('materialPreset'); const currentBefore=preferredId||sel.value||localStorage.getItem('pq_selected_material')||defaultMaterialId();
  sel.innerHTML='';
  materials.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=`${m.name} — ${m.price.toLocaleString('ko-KR')}원/kg`;sel.appendChild(o)});
  if(materials.some(m=>m.id===currentBefore)) sel.value=currentBefore; else if(defaultMaterialId()) sel.value=defaultMaterialId();
  const current=materials.find(m=>m.id===sel.value);
  if(current)$('spoolPrice').value=current.price;
  renderMaterials();
}
function renderMaterials(){
  const body=$('materialsBody'); body.innerHTML='';
  const def=defaultMaterialId();
  materials.forEach(m=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><input class="textbox mat-name" data-id="${m.id}" value="${escapeHtml(m.name)}" style="height:26px"></td>
      <td><div class="controlrow"><input class="textbox mat-price" data-id="${m.id}" type="number" min="0" step="100" value="${m.price}" style="height:26px"><span class="unit">원/kg</span></div></td>
      <td style="white-space:nowrap">
        <button data-save="${m.id}">저장</button>
        <button data-default="${m.id}">${m.id===def?'기본 ✓':'기본'}</button>
        <button data-clone="${m.id}">복제</button>
        <button data-del="${m.id}">삭제</button>
      </td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveMaterialRow(b.dataset.save));
  body.querySelectorAll('[data-default]').forEach(b=>b.onclick=()=>{localStorage.setItem('pq_default_material',b.dataset.default);renderMaterials();toast('기본 재료로 지정했습니다.');setStatus('기본 필라멘트 변경 완료')});
  body.querySelectorAll('[data-clone]').forEach(b=>b.onclick=()=>{const src=materials.find(m=>m.id===b.dataset.clone);if(!src)return;const copy={id:'m-'+Date.now(),name:src.name+' 복사본',price:src.price};materials.push(copy);saveJSON('pq_materials',materials);renderMaterials();toast('프리셋을 복제했습니다.')});
  body.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>ask('프리셋 삭제','이 필라멘트 프리셋을 삭제하시겠습니까?',()=>{const id=b.dataset.del;materials=materials.filter(m=>m.id!==id);if(localStorage.getItem('pq_default_material')===id)localStorage.removeItem('pq_default_material');saveJSON('pq_materials',materials);populateMaterials();setStatus('재료 프리셋 삭제 완료')}))
}
function saveMaterialRow(id){
  const nameInput=document.querySelector(`.mat-name[data-id="${id}"]`);
  const priceInput=document.querySelector(`.mat-price[data-id="${id}"]`);
  const name=nameInput?.value.trim(), price=n(priceInput?.value);
  if(!name||!price){toast('재료명과 가격을 확인하세요.');return}
  const m=materials.find(x=>x.id===id); if(!m)return;
  m.name=name; m.price=price; saveJSON('pq_materials',materials);
  const selected=$('materialPreset').value;
  populateMaterials(selected);
  if(selected===id){$('spoolPrice').value=price;calculate()}
  toast('프리셋을 수정했습니다.'); setStatus('재료 프리셋 수정 완료'); beep();
}

function calculate(){const grams=n($('grams').value),hours=n($('hours').value),minutes=Math.min(59,n($('minutes').value)),spool=n($('spoolPrice').value),rate=n($('hourlyRate').value),minFee=n($('minimumFee').value),riskPct=n($('riskPct').value),totalHours=hours+minutes/60;const material=spool*(grams/1000),time=rate*totalHours,base=material+time,risk=base*(riskPct/100),subtotal=base+risk,total=Math.max(subtotal,minFee);$('materialCost').textContent=won(material);$('timeCost').textContent=won(time);$('riskCost').textContent=won(risk);$('subtotalCost').textContent=won(subtotal);$('minimumApplied').textContent=total>subtotal?'예':'아니오';$('timeLabel').textContent=`${hours}시간 ${minutes}분`;$('totalCost').textContent=won(total);$('projectBadge').textContent=$('projectName').value.trim()||'이름 없는 프로젝트';setStatus(`계산 완료 · ${grams.toLocaleString('ko-KR')}g / ${hours}h ${minutes}m`);saveCurrent()}
function saveCurrent(){const obj={};fields.forEach(id=>obj[id]=$(id).value);obj.materialPreset=$('materialPreset').value;saveJSON('pq_current',obj)}
function loadCurrent(){const cur=loadJSON('pq_current',null);if(!cur){applySettingsToQuote();return}fields.forEach(id=>{if(cur[id]!==undefined)$(id).value=cur[id]});if(cur.materialPreset&&materials.some(m=>m.id===cur.materialPreset))$('materialPreset').value=cur.materialPreset}
function applySettingsToQuote(){$('hourlyRate').value=settings.hourlyRate;$('minimumFee').value=settings.minimumFee;$('riskPct').value=settings.riskPct}
function newQuote(){$('projectName').value='';$('grams').value=100;$('hours').value=2;$('minutes').value=0;applySettingsToQuote();const id=defaultMaterialId(),m=materials.find(x=>x.id===id);if(m){$('materialPreset').value=m.id;$('spoolPrice').value=m.price;localStorage.setItem('pq_selected_material',m.id)}calculate();toast('새 견적을 시작합니다.');beep()}
function clearInputs(){$('projectName').value='';$('grams').value='';$('hours').value='';$('minutes').value='';calculate();toast('입력값을 지웠습니다.');setStatus('입력값 지우기 완료')}
function quoteSnapshot(){return {id:Date.now(),date:new Date().toLocaleString('ko-KR'),project:$('projectName').value.trim()||'미지정',material:$('materialPreset').selectedOptions[0]?.textContent||'직접 입력',grams:n($('grams').value),hours:n($('hours').value),minutes:n($('minutes').value),total:$('totalCost').textContent}}
function saveHistory(){history.unshift(quoteSnapshot());history=history.slice(0,20);saveJSON('pq_history',history);renderHistory();setStatus('견적 기록 저장 완료');toast('견적을 기록했습니다.');beep()}
function renderHistory(){const wrap=$('historyWrap');if(!history.length){wrap.innerHTML='<div class="empty">저장된 견적이 없습니다.</div>';return}wrap.innerHTML='<div class="tablewrap"><table class="classic-table"><thead><tr><th>날짜</th><th>프로젝트</th><th>사용량</th><th>시간</th><th>견적</th></tr></thead><tbody>'+history.map(h=>`<tr><td>${escapeHtml(h.date)}</td><td>${escapeHtml(h.project)}</td><td>${h.grams}g</td><td>${h.hours}h ${h.minutes}m</td><td><b>${escapeHtml(h.total)}</b></td></tr>`).join('')+'</tbody></table></div>'}
async function copyQuote(){const mat=$('materialPreset').selectedOptions[0]?.textContent||'직접 입력';const txt=`[3D 프린팅 견적]\n프로젝트: ${$('projectName').value.trim()||'미지정'}\n재료: ${mat}\n사용량: ${n($('grams').value)}g\n출력시간: ${$('timeLabel').textContent}\n재료비: ${$('materialCost').textContent}\n장비 사용료: ${$('timeCost').textContent}\n리스크 비용: ${$('riskCost').textContent}\n최종 견적: ${$('totalCost').textContent}`;try{await navigator.clipboard.writeText(txt);toast('견적을 복사했습니다.');setStatus('클립보드에 견적 복사 완료');beep()}catch{toast('복사에 실패했습니다.')}}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function syncSettingsUI(){$('setHourlyRate').value=settings.hourlyRate;$('setMinimumFee').value=settings.minimumFee;$('setRiskPct').value=settings.riskPct;$('soundEnabled').checked=!!settings.soundEnabled}
function saveSettings(){settings={hourlyRate:n($('setHourlyRate').value),minimumFee:n($('setMinimumFee').value),riskPct:n($('setRiskPct').value),soundEnabled:$('soundEnabled').checked};saveJSON('pq_settings',settings);applySettingsToQuote();calculate();toast('설정을 저장했습니다.');setStatus('설정 저장 완료');beep()}
function switchTab(name){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+name));setStatus(name==='quote'?'견적 입력':name==='materials'?'재료 관리':name==='settings'?'설정':'최근 견적')}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));
fields.forEach(id=>$(id).addEventListener('input',calculate));$('materialPreset').onchange=()=>{const m=materials.find(x=>x.id===$('materialPreset').value);if(m)$('spoolPrice').value=m.price;localStorage.setItem('pq_selected_material',$('materialPreset').value);calculate()};document.querySelectorAll('[data-risk]').forEach(b=>b.onclick=()=>{$('riskPct').value=b.dataset.risk;calculate()});
$('newBtn').onclick=()=>ask('새 견적','현재 입력값을 기본값으로 되돌리고 새 견적을 시작하시겠습니까?',newQuote);$('clearInputsBtn').onclick=()=>ask('입력값 지우기','프로젝트명, 사용량, 출력 시간을 지우시겠습니까?',clearInputs);$('copyBtn').onclick=copyQuote;$('copyTopBtn').onclick=copyQuote;$('saveHistoryBtn').onclick=saveHistory;
$('addMaterialBtn').onclick=()=>{const name=$('newMatName').value.trim(),price=n($('newMatPrice').value);if(!name||!price){toast('재료명과 가격을 입력하세요.');return}const item={id:'m-'+Date.now(),name,price};materials.push(item);saveJSON('pq_materials',materials);$('newMatName').value='';populateMaterials(item.id);toast('프리셋을 추가했습니다.');setStatus('재료 프리셋 추가 완료')};
$('saveSettingsBtn').onclick=saveSettings;$('restoreDefaultsBtn').onclick=()=>ask('기본값 복원','설정을 기본값으로 되돌리시겠습니까?',()=>{settings={...DEFAULTS};saveJSON('pq_settings',settings);syncSettingsUI();applySettingsToQuote();calculate();toast('기본값을 복원했습니다.')});$('clearHistoryBtn').onclick=()=>ask('기록 삭제','저장된 모든 견적 기록을 삭제하시겠습니까?',()=>{history=[];saveJSON('pq_history',history);renderHistory();setStatus('견적 기록 삭제 완료')});
function tick(){$('clock').textContent=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}setInterval(tick,1000);tick();populateMaterials();syncSettingsUI();loadCurrent();calculate();renderHistory();