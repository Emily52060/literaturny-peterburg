'use strict';
// Поиск, карточки, прогулки. Все картографические ссылки ведут только на Яндекс.
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = id => PLACES.find(place => place.id === id);
const number = id => String(PLACES.findIndex(place => place.id === id) + 1).padStart(2,'0');
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('literary-spb-saved') || '[]').filter(id => byId(id))); } catch {}
let favoritesOnly = false, routeId = 'all', walkId = 'classic', routeCategory = 'Все', activeId = null, previousFocus;
let mapTimer, lastMapUrl = '';

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').style.display = 'none', 2600);
}
function saveState() {
  try { localStorage.setItem('literary-spb-saved', JSON.stringify([...saved])); }
  catch { toast('Избранное доступно в этой вкладке; браузер не разрешил сохранение.'); }
}
function mapUrl(place) {
  const params = new URLSearchParams({text:'Санкт-Петербург, ' + place.address,ll:place.lon+','+place.lat,z:'17'});
  return 'https://yandex.ru/maps/?' + params;
}
function mapParams(places) {
  if (!places.length) return new URLSearchParams({ll:'30.325,59.935',z:'12',l:'map'});
  const minLon = Math.min(...places.map(p=>p.lon)), maxLon = Math.max(...places.map(p=>p.lon));
  const minLat = Math.min(...places.map(p=>p.lat)), maxLat = Math.max(...places.map(p=>p.lat));
  const span = Math.max((maxLon-minLon)*0.5,maxLat-minLat);
  const zoom = places.length===1 ? 16 : span>.04 ? 12 : span>.022 ? 13 : span>.012 ? 14 : 15;
  return new URLSearchParams({ll:((minLon+maxLon)/2)+','+((minLat+maxLat)/2),z:String(zoom),l:'map',pt:places.map(p=>p.lon+','+p.lat+',pm2blm'+(PLACES.indexOf(p)+1)).join('~')});
}
function showMap(places,title='Найденные литературные адреса') {
  clearTimeout(mapTimer);
  const params = mapParams(places);
  const url = 'https://yandex.ru/map-widget/v1/?' + params;
  if (url!==lastMapUrl) { $('#yandex-map').src=url; lastMapUrl=url; }
  $('#map-title').textContent = title;
  $('#map-external').href = 'https://yandex.ru/maps/?'+params;
}
function filtered() {
  const q = $('#search').value.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
  const kind=$('#kind').value, period=$('#era').value, author=$('#author').value;
  const route = ROUTES.find(r=>r.id===routeId);
  return route.ids.map(byId).filter(p=>p && (!kind || p.kind===kind) && (!period || p.period===period) && (!author || p.author.split(';').map(a=>a.trim()).includes(author)) && (!favoritesOnly || saved.has(p.id)) && (!q || [p.title,p.author,p.address,p.work,p.story].join(' ').toLocaleLowerCase('ru').replaceAll('ё','е').includes(q)));
}
function render(updateMap=true) {
  const places=filtered();
  const activeRoute=ROUTES.find(r=>r.id===routeId);
  $('#count').textContent=`Найдено: ${places.length} из ${PLACES.length}`+(routeId!=='all'?' · '+activeRoute.name:'');
  $('#place-list').innerHTML=places.length ? places.map(p=>`<button class="place-row ${p.id===activeId?'active':''}" data-place="${p.id}"><img class="${window.PHOTO_INFO?.[p.id]?.type==='illustration'?'illustration':''}" src="${esc(p.image)}" alt="" loading="lazy"><span><small class="row-tag">${number(p.id)} · ${esc(p.kind)}</small><strong>${esc(p.title)}</strong><small class="row-author">${esc(p.author)}</small><small>${esc(p.address)}</small>${saved.has(p.id)?'<small class="saved-label">♥ В избранном</small>':''}</span></button>`).join('') : '<p class="empty">Подходящих адресов не найдено. Попробуйте изменить условия или нажмите «Сбросить».</p>';
  if(updateMap){clearTimeout(mapTimer);mapTimer=setTimeout(()=>showMap(places,routeId==='all'?'Литературные адреса на карте':activeRoute.name),350);}
}
function openPlace(id,fromHash=false) {
  const p=byId(id); if(!p)return;
  activeId=id; previousFocus=document.activeElement;
  const photo=window.PHOTO_INFO?.[id];
  $('#dialog-content').innerHTML=`<img class="detail-image ${photo?.type==='illustration'?'illustration':''}" src="${esc(p.image)}" alt="${esc(photo?.caption||p.title)}"><div class="photo-caption">${esc(photo?.caption||p.title)} · <a href="${esc(photo?.page||p.source)}" target="_blank" rel="noopener">Источник фотографии ↗</a>${photo?.license?` · <a href="${esc(photo.license)}" target="_blank" rel="noopener">Лицензия ↗</a>`:''}</div><div class="detail-body"><div class="detail-meta"><span class="badge">${esc(p.kind)}</span><span class="badge">${esc(p.period)}</span><span class="badge">${esc(p.years)}</span></div>${p.attribution?`<p class="attribution">${esc(p.attribution)}</p>`:''}<h2 id="dialog-title">${esc(p.title)}</h2><p class="detail-address">${esc(p.author)}<br>${esc(p.address)}</p><p class="lead">${esc(p.lead)}</p><h3>История адреса</h3><p>${esc(p.story)}</p><h3>Связь с литературой</h3><p class="work-title">${esc(p.work)}</p><p>${esc(p.relation)}</p><h3>Почему это место важно</h3><p>${esc(p.significance)}</p><div class="task-box"><h3>Во время прогулки</h3><p>${esc(p.task)}</p></div><a class="source-link" href="${esc(p.source)}" target="_blank" rel="noopener">Источник фактов или литературный текст ↗</a>${p.access?`<p class="access-note">${esc(p.access)}</p>`:''}<div class="detail-actions"><button class="primary" data-show-map="${id}">Показать на карте</button><a href="${mapUrl(p)}" target="_blank" rel="noopener">Открыть Яндекс Карты ↗</a><button id="save-place" data-id="${id}" aria-pressed="${saved.has(id)}">${saved.has(id)?'♥ В избранном':'♡ Сохранить место'}</button><button id="copy-place" data-id="${id}">Скопировать ссылку</button></div></div>`;
  if(!$('#place-dialog').open)$('#place-dialog').showModal();
  $('#place-dialog').scrollTop=0; $('#close-dialog').focus();
  if(!fromHash)history.replaceState(null,'','#place='+id);
  render(false);
}
function closePlace() {
  if($('#place-dialog').open)$('#place-dialog').close();
  if(location.hash.startsWith('#place='))history.replaceState(null,'','#atlas');
  if(previousFocus?.isConnected)previousFocus.focus();
}
function renderRouteTabs() {
  const categories=['Все','По району','По эпохе','По писателю','По произведению'];
  $('#route-categories').innerHTML=categories.map(c=>`<button data-category="${c}" aria-pressed="${routeCategory===c}">${c}</button>`).join('');
  const routes=ROUTES.filter(r=>r.id!=='all'&&(routeCategory==='Все'||r.category===routeCategory));
  $('#route-tabs').innerHTML=routes.map(r=>`<button class="route-tab" data-route="${r.id}" aria-pressed="${r.id===walkId}"><span>${esc(r.category)}</span><strong>${esc(r.name)}</strong><small>${esc(r.subtitle)}</small><small>${r.ids.length} ${stopWord(r.ids.length)}</small></button>`).join('');
}
function stopWord(n){return n%10===1&&n%100!==11?'остановка':n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14)?'остановки':'остановок'}
function chooseWalk(id) {
  const r=ROUTES.find(r=>r.id===id);if(!r||r.id==='all')return;
  walkId=id;renderRouteTabs();
  $('#route-label').textContent=r.ids.length+' '+stopWord(r.ids.length)+' · '+r.category.toLocaleLowerCase('ru');
  $('#route-title').textContent=r.name;$('#route-intro').textContent=r.intro;$('#route-note').textContent=r.note||'';
  $('#route-link').textContent=r.id==='brodwalk'?'Маршрут на транспорте в Яндекс Картах ↗':'Пешеходный маршрут в Яндекс Картах ↗';
  $('#route-link').href='https://yandex.ru/maps/?rtext='+r.ids.map(id=>byId(id).lat+','+byId(id).lon).join('~')+'&rtt='+(r.id==='brodwalk'?'mt':'pd');
  $('#route-stops').innerHTML=r.ids.map((id,i)=>{const p=byId(id);return `<li><button data-place="${id}">${esc(p.title)}</button><small>${esc(p.author)} · ${esc(p.address)}</small>${r.transitions?.[i]?`<p>${esc(r.transitions[i])}</p>`:''}</li>`}).join('');
}
function reset() {
  routeId='all';favoritesOnly=false;
  for(const id of ['search','kind','era','author'])$('#'+id).value='';
  $('#favorites').setAttribute('aria-pressed','false');render();
}
function init() {
  const authors=[...new Set(PLACES.flatMap(p=>p.author.split(';').map(a=>a.trim())))].sort((a,b)=>a.localeCompare(b,'ru'));
  $('#author').innerHTML='<option value="">Все писатели</option>'+authors.map(a=>`<option>${esc(a)}</option>`).join('');
  $('#author-strip').innerHTML=authors.map(a=>`<button data-author="${esc(a)}">${esc(a)}</button>`).join('');
  document.querySelectorAll('[data-total-places]').forEach(e=>e.textContent=PLACES.length);
  document.querySelectorAll('[data-total-routes]').forEach(e=>e.textContent=ROUTES.length-1);
  render(false);showMap(PLACES,'Все литературные адреса');chooseWalk('classic');
  $('#sources').innerHTML='<ol>'+PLACES.map(p=>`<li><a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.title)}</a></li>`).join('')+'</ol>';
  if(location.hash.startsWith('#place='))openPlace(decodeURIComponent(location.hash.slice(7)),true);
}

document.addEventListener('click',async e=>{
  const place=e.target.closest('[data-place]');if(place){e.preventDefault();openPlace(place.dataset.place);return;}
  const show=e.target.closest('[data-show-map]');if(show){const p=byId(show.dataset.showMap);closePlace();showMap([p],p.title);$('#atlas').scrollIntoView();return;}
  const period=e.target.closest('[data-period]');if(period){reset();$('#era').value=period.dataset.period;render();$('#atlas').scrollIntoView();return;}
  const author=e.target.closest('[data-author]');if(author){reset();$('#author').value=author.dataset.author;render();$('#atlas').scrollIntoView();return;}
  const category=e.target.closest('[data-category]');if(category){routeCategory=category.dataset.category;const first=ROUTES.find(r=>r.id!=='all'&&(routeCategory==='Все'||r.category===routeCategory));chooseWalk(first.id);return;}
  const route=e.target.closest('[data-route]');if(route){chooseWalk(route.dataset.route);return;}
  if(e.target.id==='save-place'){const id=e.target.dataset.id;saved.has(id)?saved.delete(id):saved.add(id);saveState();e.target.setAttribute('aria-pressed',saved.has(id));e.target.textContent=saved.has(id)?'♥ В избранном':'♡ Сохранить место';render(false);}
  if(e.target.id==='copy-place'){const url=new URL(location.href);url.hash='place='+e.target.dataset.id;try{await navigator.clipboard.writeText(url.href);toast('Ссылка на адрес скопирована');}catch{toast('Скопируйте ссылку из адресной строки браузера.');}}
});
for(const id of ['search','kind','era','author'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>render());
$('#favorites').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;$('#favorites').setAttribute('aria-pressed',favoritesOnly);render();});
$('#reset').addEventListener('click',reset);
$('#fit').addEventListener('click',()=>showMap(filtered()));
$('#close-dialog').addEventListener('click',closePlace);
$('#place-dialog').addEventListener('cancel',e=>{e.preventDefault();closePlace();});
$('#place-dialog').addEventListener('click',e=>{if(e.target===$('#place-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePlace();}});
$('#route-map').addEventListener('click',()=>{reset();routeId=walkId;render();$('#atlas').scrollIntoView();});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#place='))openPlace(decodeURIComponent(location.hash.slice(7)),true);});
$('#print').addEventListener('click',()=>{
  let section=$('#print-records');
  if(!section){section=document.createElement('section');section.id='print-records';section.style.display='none';section.innerHTML='<h2>Литературные адреса</h2>'+PLACES.map(p=>`<article class="print-record"><h3>${esc(p.title)}</h3><p>${esc(p.author)} · ${esc(p.address)}</p><p>${esc(p.story)}</p><p><b>${esc(p.work)}</b> ${esc(p.relation)}</p><p>${esc(p.significance)}</p><p>Источник: ${esc(p.source)}</p></article>`).join('');document.querySelector('main').append(section);}window.print();
});
init();
