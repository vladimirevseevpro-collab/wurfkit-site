// WurfKit Demo App — main controller
// Tab navigation, rendering, interactions, browser history

let weightChart = null;

// On-demand loader for heavy CDN libs (PDF + Chart) — keeps initial page light
const _scriptCache = {};
function loadScript(src) {
  if (_scriptCache[src]) return _scriptCache[src];
  return _scriptCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { delete _scriptCache[src]; reject(new Error('Failed to load ' + src)); };
    document.head.appendChild(s);
  });
}
// Demo PDFs are generated from the beta templates before publication.
const PDFLibs = () => Promise.resolve();
const ChartLib = () => loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');

function setActiveTabUI(tab) {
  STATE.currentTab = tab;
  document.querySelectorAll('section.tabview').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('tab-' + tab);
  if (target) target.classList.add('active');
  document.querySelectorAll('.tb').forEach(b => {
    const matches = b.dataset.go === tab || (tab === 'dog' && b.dataset.go === 'overview') || (tab === 'litter' && b.dataset.go === 'litters');
    b.classList.toggle('active', matches);
  });
}

function buildHashURL() {
  let url = '#/' + STATE.currentTab;
  if (STATE.currentTab === 'dog' && STATE.currentDog) url += '/' + STATE.currentDog;
  if (STATE.currentTab === 'litter' && STATE.currentLitter) url += '/' + STATE.currentLitter;
  return url;
}

function goTab(tab, opts) {
  opts = opts || {};
  setActiveTabUI(tab);
  if (!opts.fromPopState) {
    const url = buildHashURL();
    if (location.hash !== url) {
      try { history.pushState({ tab, dog: STATE.currentDog, litter: STATE.currentLitter }, '', url); } catch(e){}
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderAll();
  // Re-run stat counter animation when overview shows
  if (tab === 'overview') animateStats();
}

function openDogDetail(id) {
  STATE.currentDog = id;
  goTab('dog');
}

function openLitterDetail(id) {
  STATE.currentLitter = id;
  goTab('litter');
}

// Parse URL hash and restore state
function restoreFromHash() {
  const hash = (location.hash || '').slice(1).replace(/^\//, '');
  if (!hash) { setActiveTabUI('overview'); return; }
  const parts = hash.split('/');
  const tab = parts[0];
  const id = parts[1];
  if (['overview','litters','docs','coi'].includes(tab)) {
    setActiveTabUI(tab);
  } else if (tab === 'dog' && id && DOGS.find(d => d.id === id)) {
    STATE.currentDog = id;
    setActiveTabUI('dog');
  } else if (tab === 'litter' && id && LITTERS.find(l => l.id === id)) {
    STATE.currentLitter = id;
    setActiveTabUI('litter');
  } else {
    setActiveTabUI('overview');
  }
}

// Cache-busting version for photo URLs (bump when photos change)
const PHOTO_V = 'v4';
function photoURL(item) {
  if (!item || !item.photo || !item.photo.startsWith('demo/')) return null;
  return item.photo + '?' + PHOTO_V;
}

// Helper: render avatar with photo + fallback emoji
function avatar(item, size) {
  const cls = 'dav';
  const fb = item.photoFallback || '🐕';
  const url = photoURL(item);
  if (url) {
    // Name goes through a data attribute, not a JS string literal — names with
    // quotes/apostrophes must never reach the JS parser inside onclick.
    const nameAttr = escapeHtml(item.name || '');
    return `<div class="${cls}"><img src="${url}" data-lbname="${nameAttr}" alt="${nameAttr}" loading="lazy" decoding="async" onclick="openLightbox(this.getAttribute('src'),this.dataset.lbname,event)" style="cursor:zoom-in" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="dav-fb" style="display:none">${fb}</div></div>`;
  }
  return `<div class="${cls}">${fb}</div>`;
}

function avatarSmall(item) {
  const fb = item.photoFallback || '🐶';
  const url = photoURL(item);
  if (url) {
    const nameAttr = escapeHtml(item.name || '');
    return `<div class="pliav"><img src="${url}" data-lbname="${nameAttr}" alt="" loading="lazy" decoding="async" onclick="openLightbox(this.getAttribute('src'),this.dataset.lbname,event)" style="cursor:zoom-in" onerror="this.style.display='none';this.parentNode.innerHTML='${fb}'"/></div>`;
  }
  return `<div class="pliav">${fb}</div>`;
}

function avatarLarge(item) {
  const fb = item.photoFallback || '🐕';
  const url = photoURL(item);
  if (url) {
    const nameAttr = escapeHtml(item.name || '');
    return `<div class="dxa"><img src="${url}" data-lbname="${nameAttr}" alt="${nameAttr}" loading="lazy" decoding="async" onclick="openLightbox(this.getAttribute('src'),this.dataset.lbname,event)" style="cursor:zoom-in" onerror="this.outerHTML='<div class=&quot;dxa&quot;>${fb}</div>'"/></div>`;
  }
  return `<div class="dxa">${fb}</div>`;
}

// === Info hints — small (i) icons next to specific labels (COI, ZTP, HD/ED,
// Welpen-Paket QR, Privacy mode). Click toggles a small popover. Wording is
// educational, not salesy, per GPT UX review.
const HINTS = {
  coi: {
    label: { de: 'COI (Inzuchtkoeffizient)', en: 'COI (inbreeding coefficient)', ru: 'COI (коэф. инбридинга)' },
    text: { de: 'Der Inzuchtkoeffizient zeigt, wie eng zwei Linien verwandt sind. WurfKit macht den Wert sichtbar, damit Verpaarungen nachvollziehbar dokumentiert werden können.',
            en: 'The inbreeding coefficient shows how closely two lines are related. WurfKit makes this value visible so matings can be documented transparently.',
            ru: 'Коэффициент инбридинга показывает насколько близкородственны две линии. WurfKit делает значение видимым, чтобы вязки документировались прозрачно.' }
  },
  ztp: {
    label: { de: 'ZTP (Zuchtzulassung)', en: 'ZTP (breeding eligibility)', ru: 'ZTP (допуск к разведению)' },
    text: { de: 'Die Zuchtzulassung zeigt, ob ein Hund nach den Regeln des Vereins zur Zucht eingesetzt werden darf. Hier sehen Sie den Status direkt im Hundeprofil.',
            en: 'Breeding eligibility shows whether a dog may be used for breeding according to the club rules. You see the status here directly in the dog profile.',
            ru: 'Допуск к разведению показывает можно ли использовать собаку в племенной работе по правилам клуба. Статус виден прямо в профиле.' }
  },
  hded: {
    label: { de: 'HD/ED', en: 'HD/ED', ru: 'HD/ED' },
    text: { de: 'Gesundheitsauswertungen wie HD (Hüftdysplasie) und ED (Ellbogendysplasie) gehören zu den wichtigsten Nachweisen in vielen Rassen. WurfKit sammelt die Werte dort, wo auch Stammbaum, Würfe und Dokumente liegen.',
            en: 'Health evaluations like HD (hip dysplasia) and ED (elbow dysplasia) are among the most important records in many breeds. WurfKit keeps these values together with pedigree, litters and documents.',
            ru: 'Оценки здоровья — HD (дисплазия таза) и ED (дисплазия локтей) — одни из важнейших записей во многих породах. WurfKit хранит их вместе с родословной, помётами и документами.' }
  },
  paket: {
    label: { de: 'Welpen-Paket + QR-Code', en: 'Welpen-Paket + QR code', ru: 'Welpen-Paket + QR-код' },
    text: { de: 'Dieses Demo zeigt die Übergabeübersicht als Beispiel-PDF. In der angemeldeten Beta können private Originalanlagen als ZIP ergänzt werden. Ein QR-Code erscheint nur bei ausdrücklich freigegebener Welpenseite.',
            en: 'This demo shows a sample handover PDF. In the signed-in beta, private original attachments can be added as a ZIP. A QR code appears only for an explicitly published puppy page.',
            ru: 'Демо показывает пример PDF с обзором передачи. В авторизованной бете приватные оригиналы можно включить в ZIP. QR-код появляется только для явно опубликованной страницы щенка.' }
  },
  privacy: {
    label: { de: 'Sichtbarkeit (Privat / Link / Öffentlich)', en: 'Visibility (Private / Link / Public)', ru: 'Видимость (Приват / Ссылка / Публично)' },
    text: { de: 'Sie entscheiden pro Inhalt, ob er privat bleibt, nur per Link sichtbar ist oder öffentlich geteilt werden kann. Keine Inhalte werden ohne Ihre Freigabe öffentlich.',
            en: 'You decide per item whether it stays private, is link-only, or may be publicly shared. Nothing becomes public without your approval.',
            ru: 'Для каждого элемента вы сами выбираете: остаётся приватным, доступен только по ссылке или может быть публичным. Ничего не становится публичным без вашего согласия.' }
  }
};
function openHint(key, ev) {
  if (ev) { ev.stopPropagation(); }
  const h = HINTS[key]; if (!h) return;
  // Reuse settings-modal? No — make own light dialog from existing ancestor-modal
  // To keep things simple: use a transient floating popover attached to body
  closeHint(); // make sure only one open at a time
  const L = STATE.lang;
  const pop = document.createElement('div');
  pop.className = 'hint-pop';
  pop.id = 'hint-pop';
  pop.setAttribute('role', 'dialog');
  pop.innerHTML =
    `<button class="hint-x" aria-label="${L === 'de' ? 'Schließen' : L === 'en' ? 'Close' : 'Закрыть'}" onclick="closeHint()">✕</button>
     <div class="hint-h">${h.label[L] || h.label.de}</div>
     <div class="hint-t">${h.text[L] || h.text.de}</div>`;
  document.body.appendChild(pop);
  // Position near the icon if event provided
  if (ev && ev.currentTarget) {
    const r = ev.currentTarget.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 220, r.bottom + 8);
    const left = Math.max(12, Math.min(window.innerWidth - 330, r.left - 140));
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }
  setTimeout(() => {
    document.addEventListener('click', _hintOutsideClick, { capture: true });
  }, 10);
}
function _hintOutsideClick(e) {
  const pop = document.getElementById('hint-pop');
  if (pop && !pop.contains(e.target)) closeHint();
}
function closeHint() {
  document.removeEventListener('click', _hintOutsideClick, { capture: true });
  const pop = document.getElementById('hint-pop');
  if (pop) pop.remove();
}
window.openHint = openHint;
window.closeHint = closeHint;

// === Image lightbox — opens a larger view of clicked photos ===
function openLightbox(url, caption, ev) {
  if (ev) { ev.stopPropagation(); }
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const img = document.getElementById('lb-img');
  const cap = document.getElementById('lb-cap');
  if (img) { img.src = url; img.alt = caption || ''; }
  if (cap) { cap.textContent = caption || ''; }
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const x = lb.querySelector('.mx'); if (x) x.focus(); }, 50);
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  const img = document.getElementById('lb-img');
  if (img) img.src = '';
  document.body.style.overflow = '';
}
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Animate stat counter from 0 to value
// Animate stat counters from 0 → target on first overview view only.
// Re-running on every goTab('overview') used to race with the previous
// animation and could leave intermediate values (2/0/4/2 instead of
// 3/1/5/3) visible during transitions. After the first run the final
// value is locked via dataset.animated and the guard skips re-anim.
function animateStats() {
  document.querySelectorAll('.stn').forEach(el => {
    const target = parseInt(el.dataset.target || el.textContent, 10);
    if (isNaN(target)) return;
    el.dataset.target = target;
    // Already animated once — keep final value, do not re-animate
    if (el.dataset.animated === '1') {
      el.textContent = target;
      return;
    }
    const start = performance.now();
    const dur = 800;
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
        el.dataset.animated = '1';
      }
    }
    requestAnimationFrame(step);
  });
}

// Confetti effect
function confetti() {
  const colors = ['#2D6A4F', '#52B788', '#74C69D', '#FCD34D', '#F59E0B'];
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[i % colors.length];
    c.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
    c.style.top = '50%';
    document.body.appendChild(c);
    const angle = (Math.random() * Math.PI * 2);
    const vel = 200 + Math.random() * 200;
    const dx = Math.cos(angle) * vel;
    const dy = Math.sin(angle) * vel - 200;
    c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px,${dy + 400}px) scale(.5) rotate(${Math.random()*720}deg)`, opacity: 0 }
    ], { duration: 1400 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => c.remove();
  }
}

function statusBadge(p) {
  const map = {
    available: { cls: 'ok', label: t('status.available') },
    reserved: { cls: 'warn', label: t('status.reserved') },
    sold: { cls: 'muted', label: t('status.sold') },
    kept_by_breeder: { cls: 'info', label: t('status.kept_by_breeder') }
  };
  const m = map[p.status] || map.available;
  return `<span class="bg ${m.cls}">${m.label}</span>`;
}

// ===== Render Übersicht =====
function renderOverview() {
  const list = document.getElementById('dog-list');
  if (!list) return;
  list.innerHTML = DOGS.map(d => {
    const badge = `<span class="bg ${d.statusBadge.type}">${d.statusBadge[STATE.lang] || d.statusBadge.de}</span>`;
    return `
      <div class="card clk dc" onclick="openDogDetail('${d.id}')">
        ${avatar(d)}
        <div class="di">
          <div class="dnm">${d.fullName}</div>
          <div class="dmt"><span>${d.breed}</span> · <span>${formatAge(d.birth)}</span> · <span>${t('sex.' + d.sex)}</span></div>
        </div>
        <div class="bd">${badge}</div>
      </div>
    `;
  }).join('');
}

// ===== Render Dog Detail =====
function renderDogDetail() {
  const dog = DOGS.find(d => d.id === STATE.currentDog);
  if (!dog) return;
  const c = document.getElementById('dog-detail');
  const litters = LITTERS.filter(l => l.damId === dog.id || l.sireId === dog.id);

  // Build Zuchtprüfung if pedigree exists
  let zuchtSection = '';
  if (dog.id === 'luna' || (dog.hd && dog.formwert && dog.ztp)) {
    const items = ZUCHTPRUEFUNG_LUNA.map(it => {
      const cls = it.status === 'ok' ? 'ok' : it.status === 'err' ? 'err' : 'warn';
      const icon = it.status === 'ok' ? '✓' : it.status === 'err' ? '✗' : '!';
      return `<div class="chkr"><div class="chki ${cls}">${icon}</div><div class="chkl">${it.label[STATE.lang] || it.label.de}</div><div class="chks">${it.detail}</div></div>`;
    }).join('');
    const allOk = ZUCHTPRUEFUNG_LUNA.every(it => it.status === 'ok');
    const totalCls = allOk ? 'ok' : 'warn';
    const totalLbl = allOk
      ? { de: '✓ Angaben vollständig — Verein prüft', en: '✓ Details complete — breed club reviews', ru: '✓ Данные заполнены — проверяет клуб' }
      : { de: '! Angaben unvollständig — Verein entscheidet', en: '! Details incomplete — breed club decides', ru: '! Данные неполные — решение за клубом' };
    zuchtSection = `
      <div class="sec">
        <div class="sech">${t('common.breeding')}</div>
        <div class="chk">${items}</div>
        <div class="zst ${totalCls}">${totalLbl[STATE.lang] || totalLbl.de}</div>
      </div>
    `;
  }

  // Litters section
  let lSection = '';
  if (litters.length) {
    lSection = `
      <div class="sec">
        <div class="sech">${dog.sex === 'female' ? (STATE.lang==='de'?'Würfe als Mutter':STATE.lang==='en'?'Litters as dam':'Помёты как мать') : (STATE.lang==='de'?'Würfe als Vater':STATE.lang==='en'?'Litters as sire':'Помёты как отец')}</div>
        ${litters.map(l => `
          <div class="pli" onclick="openLitterDetail('${l.id}')">
            <div class="pliav">🐾</div>
            <div class="plii"><div class="plin">${l.name}</div><div class="plis">${formatDateDE(l.birthDate)} · ${l.wurfStaerke.total} ${t('common.welpen')}</div></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  c.innerHTML = `
    <div class="ddh">
      ${avatarLarge(dog)}
      <div>
        <div class="dxn">${dog.fullName}</div>
        <div class="dxs">${dog.breed} · ${t('sex.' + dog.sex)} · ${formatAge(dog.birth)}</div>
        <div class="dxbg"><span class="bg ${dog.statusBadge.type}">${dog.statusBadge[STATE.lang] || dog.statusBadge.de}</span></div>
      </div>
    </div>

    <div class="sec">
      <div class="sech">${STATE.lang === 'de' ? 'Stammdaten' : STATE.lang === 'en' ? 'Basic data' : 'Основные данные'}</div>
      <div class="kv">
        <div class="kvr"><span class="kvk">${t('common.breed')}</span><span class="kvv">${dog.breed}</span></div>
        <div class="kvr"><span class="kvk">${t('common.sex_')}</span><span class="kvv">${t('sex.' + dog.sex)}</span></div>
        <div class="kvr"><span class="kvk">${t('common.birth')}</span><span class="kvv">${formatDateDE(dog.birth)}</span></div>
        <div class="kvr"><span class="kvk">${t('common.color')}</span><span class="kvv">${dog.color}</span></div>
        <div class="kvr"><span class="kvk">${t('common.microchip')}</span><span class="kvv" style="font-family:monospace;font-size:.82rem">${dog.microchip}</span></div>
        <div class="kvr"><span class="kvk">${t('common.zbNr')}</span><span class="kvv">${dog.zbNr}</span></div>
      </div>
    </div>

    <div class="sec">
      <div class="sech">${t('common.health')}</div>
      <div class="kv">
        <div class="kvr"><span class="kvk">HD <button type="button" class="info-i" onclick="openHint('hded',event)" aria-label="Was bedeuten HD/ED?">i</button></span><span class="kvv">${dog.hd}</span></div>
        <div class="kvr"><span class="kvk">ED</span><span class="kvv">${dog.ed}</span></div>
        <div class="kvr"><span class="kvk">${t('common.formwert')}</span><span class="kvv">${dog.formwert}</span></div>
        <div class="kvr"><span class="kvk">${t('common.ztp')} <button type="button" class="info-i" onclick="openHint('ztp',event)" aria-label="Was ist ZTP?">i</button></span><span class="kvv">${dog.ztp ? '✓ ' + formatDateDE(dog.ztpDate) : '—'}</span></div>
        ${dog.eyes ? `<div class="kvr"><span class="kvk">${t('common.eyes')}</span><span class="kvv">${dog.eyes.result} (${formatDateDE(dog.eyes.date)})</span></div>` : ''}
        ${dog.workTitles ? `<div class="kvr"><span class="kvk">${t('common.titles')}</span><span class="kvv">${dog.workTitles.join(', ')}</span></div>` : ''}
      </div>
    </div>

    ${zuchtSection}
    ${lSection}

    ${dog.notes ? `<div class="sec"><div class="sech">${t('common.notes')}</div><p style="font-size:.92rem;color:var(--t2);line-height:1.65">${dog.notes}</p></div>` : ''}
  `;
}

// ===== Render Litters =====
function renderLitters() {
  const list = document.getElementById('litter-list');
  if (!list) return;
  list.innerHTML = LITTERS.map(l => {
    const dam = DOGS.find(d => d.id === l.damId);
    const sireName = l.externalSire ? l.externalSire.name : (DOGS.find(d => d.id === l.sireId) || {}).fullName || '—';
    const damPhoto = dam.photo && dam.photo.startsWith('demo/') ? `<img src="${dam.photo}?${PHOTO_V}" alt="${escapeHtml(dam.name)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : '🐾';
    return `
      <div class="card clk li" onclick="openLitterDetail('${l.id}')">
        <div class="dav">${damPhoto}</div>
        <div>
          <div class="lim">${l.name}</div>
          <div class="lis">${dam.fullName} × ${sireName}</div>
          <div class="lis">${formatDateDE(l.birthDate)} · ${l.wurfStaerke.total} ${t('common.welpen')} (${l.wurfStaerke.male} ${STATE.lang === 'de' ? 'R' : STATE.lang === 'en' ? 'M' : 'К'} / ${l.wurfStaerke.female} ${STATE.lang === 'de' ? 'H' : STATE.lang === 'en' ? 'F' : 'С'})</div>
        </div>
        <div class="bd"><span class="bg info">${STATE.lang === 'de' ? 'Wurfabnahme ✓' : STATE.lang === 'en' ? 'Inspected ✓' : 'Осмотрен ✓'}</span></div>
      </div>
    `;
  }).join('');
}

// ===== Render Litter Detail =====
function renderLitterDetail() {
  const litter = LITTERS.find(l => l.id === STATE.currentLitter);
  if (!litter) return;
  const c = document.getElementById('litter-detail');
  const dam = DOGS.find(d => d.id === litter.damId);
  const sire = litter.externalSire;
  const puppies = PUPPIES.filter(p => p.litterId === litter.id);

  c.innerHTML = `
    <div class="ddh">
      <div class="dxa">🐾</div>
      <div>
        <div class="dxn">${litter.name}</div>
        <div class="dxs">${litter.breed} · ${formatDateDE(litter.birthDate)} · ${litter.weeks} ${STATE.lang === 'de' ? 'Wochen' : STATE.lang === 'en' ? 'weeks' : 'недель'}</div>
        <div class="dxbg"><span class="bg info">${STATE.lang === 'de' ? 'Wurfbuchstabe' : STATE.lang === 'en' ? 'Litter letter' : 'Буква помёта'} ${litter.litterLetter}</span><span class="bg ok">${litter.wurfStaerke.alive} ${STATE.lang === 'de' ? 'lebend' : STATE.lang === 'en' ? 'alive' : 'живы'}</span></div>
      </div>
    </div>

    <div class="sec">
      <div class="sech">${t('common.parents')}</div>
      <div class="kv">
        <div class="kvr"><span class="kvk">${t('common.dam')}</span><span class="kvv">${dam.fullName} (${dam.zbNr}, HD ${dam.hd})</span></div>
        <div class="kvr"><span class="kvk">${t('common.sire')}</span><span class="kvv">${sire.name} (${sire.zbNr}, HD ${sire.hd})</span></div>
        <div class="kvr"><span class="kvk">${t('common.deckdate')}</span><span class="kvv">${formatDateDE(litter.deckDate)}</span></div>
        <div class="kvr"><span class="kvk">${t('common.wurfdate')}</span><span class="kvv">${formatDateDE(litter.birthDate)}</span></div>
        <div class="kvr"><span class="kvk">${t('common.wurfstaerke')}</span><span class="kvv">${litter.wurfStaerke.total} (${litter.wurfStaerke.male} ${STATE.lang === 'de' ? 'R' : STATE.lang === 'en' ? 'M' : 'К'} / ${litter.wurfStaerke.female} ${STATE.lang === 'de' ? 'H' : STATE.lang === 'en' ? 'F' : 'С'})</span></div>
        <div class="kvr"><span class="kvk">${t('common.wurfabnahme')}</span><span class="kvv">${formatDateDE(litter.wurfabnahmeDate)} ✓</span></div>
        <div class="kvr"><span class="kvk">${t('common.wurfmeldung')}</span><span class="kvv">${litter.wurfmeldungSubmitted ? '✓ ' + formatDateDE(litter.wurfmeldungDate) : '—'}</span></div>
      </div>
    </div>

    <div class="sec">
      <div class="sech">${STATE.lang === 'de' ? 'Welpen' : STATE.lang === 'en' ? 'Puppies' : 'Щенки'}</div>
      <div class="pl">
        ${puppies.map(p => `
          <div class="pli" onclick="openPuppy('${p.id}')">
            ${avatarSmall(p)}
            <div class="plii">
              <div class="plin">${p.name} <span style="color:var(--t3);font-weight:400">— ${p.fullName}</span></div>
              <div class="plis">${t('sex.' + p.sex)} · ${p.color} · ${(p.weights[p.weights.length-1].g/1000).toFixed(1)} kg</div>
            </div>
            <div>${statusBadge(p)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sec">
      <div class="sech">${t('common.weight')}</div>
      <div class="chrt"><canvas id="weight-chart"></canvas></div>
    </div>

    <div class="btn-row">
      <button class="btn primary" onclick="openPDFPreview('wurfmeldung','${litter.id}')">📋 ${STATE.lang === 'de' ? 'Wurfmeldung-Datenblatt' : STATE.lang === 'en' ? 'Litter Reg. data sheet' : 'Лист данных Wurfmeldung'}</button>
      <button class="btn secondary" onclick="goTab('coi')">🧬 ${STATE.lang === 'de' ? 'COI Rechner' : STATE.lang === 'en' ? 'COI Calculator' : 'COI Калькулятор'}</button>
    </div>
  `;

  // Init weight chart
  setTimeout(() => initWeightChart(puppies), 0);
}

async function initWeightChart(puppies) {
  const ctx = document.getElementById('weight-chart');
  if (!ctx) return;
  try { await ChartLib(); } catch (e) { console.warn('Chart.js load failed:', e); return; }
  if (typeof Chart === 'undefined') return;
  if (weightChart) weightChart.destroy();
  const colors = ['#2D6A4F', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'];
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: puppies[0].weights.map(w => w.week + ' ' + (STATE.lang === 'de' ? 'Wo' : STATE.lang === 'en' ? 'wk' : 'нед')),
      datasets: puppies.map((p, i) => ({
        label: p.name,
        data: p.weights.map(w => w.g / 1000),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '22',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.parsed.y.toFixed(2) + ' kg' } }
      },
      scales: {
        x: { title: { display: true, text: t('common.age_weeks'), font: { size: 11 } }, grid: { display: false } },
        y: { title: { display: true, text: t('common.weight_kg'), font: { size: 11 } }, beginAtZero: true }
      }
    }
  });
}

// ===== Puppy detail modal =====
function openPuppy(id) {
  const p = PUPPIES.find(x => x.id === id);
  if (!p) return;
  const litter = LITTERS.find(l => l.id === p.litterId);
  const c = document.getElementById('puppy-detail');
  c.innerHTML = `
    <div class="mh">
      <div class="mt">${p.fullName}</div>
      <div class="mss">${litter.breed} · ${t('sex.' + p.sex)} · ${p.color}</div>
    </div>
    <div class="mb">
      <div class="kv" style="margin-bottom:1rem">
        <div class="kvr"><span class="kvk">${t('common.microchip')}</span><span class="kvv" style="font-family:monospace;font-size:.82rem">${p.microchip}</span></div>
        <div class="kvr"><span class="kvk">${STATE.lang === 'de' ? 'Geburtsgewicht' : STATE.lang === 'en' ? 'Birth weight' : 'Вес при рождении'}</span><span class="kvv">${p.birthWeight} g</span></div>
        <div class="kvr"><span class="kvk">${STATE.lang === 'de' ? 'Aktuelles Gewicht' : STATE.lang === 'en' ? 'Current weight' : 'Текущий вес'}</span><span class="kvv">${(p.weights[p.weights.length-1].g/1000).toFixed(2)} kg (${p.weights[p.weights.length-1].week} ${STATE.lang === 'de' ? 'Wo' : STATE.lang === 'en' ? 'wk' : 'нед'})</span></div>
        <div class="kvr"><span class="kvk">Status</span><span class="kvv">${statusBadge(p)}</span></div>
        ${p.salePrice ? `<div class="kvr"><span class="kvk">${t('common.saleprice')}</span><span class="kvv">${formatPrice(p.salePrice)}</span></div>` : ''}
        ${p.saleDate ? `<div class="kvr"><span class="kvk">${t('common.saledate')}</span><span class="kvv">${formatDateDE(p.saleDate)}</span></div>` : ''}
      </div>
      ${p.buyer ? `
        <h3>${t('common.buyer')}</h3>
        <div class="kv" style="margin-bottom:1rem">
          <div class="kvr"><span class="kvk">${STATE.lang === 'de' ? 'Name' : STATE.lang === 'en' ? 'Name' : 'Имя'}</span><span class="kvv">${p.buyer.name}</span></div>
          <div class="kvr"><span class="kvk">${STATE.lang === 'de' ? 'Anschrift' : STATE.lang === 'en' ? 'Address' : 'Адрес'}</span><span class="kvv">${p.buyer.address}</span></div>
          <div class="kvr"><span class="kvk">${STATE.lang === 'de' ? 'Telefon' : STATE.lang === 'en' ? 'Phone' : 'Телефон'}</span><span class="kvv">${p.buyer.phone}</span></div>
          <div class="kvr"><span class="kvk">E-Mail</span><span class="kvv">${p.buyer.email}</span></div>
        </div>
      ` : ''}
      <div class="btn-row">
        <button class="btn primary" onclick="openPDFPreview('kaufvertrag','${p.id}'); closePuppy()">📄 ${STATE.lang === 'de' ? 'Kaufvertrag' : STATE.lang === 'en' ? 'Purchase Contract' : 'Договор'}</button>
        <button class="btn primary" onclick="openPDFPreview('welpenpaket','${p.id}'); closePuppy()">📦 ${t('docs.welpenpaket')}</button>
        <button class="btn secondary" onclick="closePuppy()">${t('common.close')}</button>
      </div>
    </div>
  `;
  const m = document.getElementById('puppy-modal');
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const x = m.querySelector('.mx'); if (x) x.focus(); trapFocus(m); }, 50);
}

function closePuppy() {
  const m = document.getElementById('puppy-modal');
  releaseTrap(m);
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ===== Documents tab =====
function renderDocs() {
  const list = document.getElementById('doc-list');
  if (!list) return;
  // Show all puppies — for each: Kaufvertrag + Welpenpaket actions
  // Plus Wurfmeldung for litter
  const items = [];

  LITTERS.forEach(l => {
    items.push({
      icon: '📋',
      title: STATE.lang === 'de' ? 'Wurfmeldung-Datenblatt' : STATE.lang === 'en' ? 'Litter Registration data sheet' : 'Лист данных Wurfmeldung',
      sub: `${STATE.lang === 'de' ? 'Wurf' : STATE.lang === 'en' ? 'Litter' : 'Помёт'} «${l.litterLetter}» · ${l.breed}`,
      desc: t('docs.wurfmeldung_desc'),
      action: () => openPDFPreview('wurfmeldung', l.id)
    });
  });

  PUPPIES.forEach(p => {
    if (p.buyer) {
      items.push({
        icon: '📄',
        title: `Kaufvertrag — ${p.name}`,
        sub: `${p.fullName} → ${p.buyer.name.split(' ').pop()}`,
        desc: t('docs.kaufvertrag_desc'),
        action: () => openPDFPreview('kaufvertrag', p.id)
      });
    }
    items.push({
      icon: '📦',
      title: `${t('docs.welpenpaket')} — ${p.name}`,
      sub: p.fullName,
      desc: t('docs.welpenpaket_desc'),
      action: null,
      actionId: { type: 'welpenpaket', id: p.id }
    });
  });

  list.innerHTML = items.map((it, i) => `
    <button type="button" class="card dcd" data-i="${i}" onclick="docAction(${i})" style="text-align:left;font:inherit;color:inherit;cursor:pointer">
      <div class="dch">
        <div class="dci">${it.icon}</div>
        <div><div class="dct">${it.title}</div><div class="dcs">${it.sub}</div></div>
      </div>
      <p>${it.desc}</p>
    </button>
  `).join('');

  window._docActions = items;
}

function docAction(i) {
  const it = window._docActions[i];
  if (it.action) it.action();
  else if (it.actionId) openPDFPreview(it.actionId.type, it.actionId.id);
}

// ===== PDF preview =====
// Skip-preview preference (per-browser, persists across sessions).
// Toggled via checkbox in the PDF modal footer; reset by ticking it off again.
function getSkipPreview() {
  try { return localStorage.getItem('wk-skip-pdf-preview') === '1'; } catch (e) { return false; }
}
function setSkipPreview(checked) {
  try { localStorage.setItem('wk-skip-pdf-preview', checked ? '1' : '0'); } catch (e) {}
}
window.setSkipPreview = setSkipPreview;

async function openPDFPreview(type, id) {
  STATE.currentPDF = { type, id };
  const previewModal = document.getElementById('pdf-modal');
  const trigger = document.activeElement;
  if (!previewModal.contains(trigger)) previewModal._returnFocus = trigger;

  // Skip-preview shortcut: jump straight to download without opening the modal
  if (getSkipPreview()) {
    try { await PDFLibs(); } catch (e) { console.warn('PDF libs load failed:', e); }
    if (typeof downloadPDF === 'function') await downloadPDF();
    return;
  }

  const m = document.getElementById('pdf-modal');
  const titles = {
    kaufvertrag: { de: 'Welpen-Kaufvertrag', en: 'Puppy Purchase Contract', ru: 'Договор купли-продажи' },
    wurfmeldung: { de: 'Wurfmeldung-Datenblatt', en: 'Litter Registration', ru: 'Регистрация помёта' },
    welpenpaket: { de: 'Welpen-Paket', en: 'Puppy Packet', ru: 'Пакет щенка' }
  };
  document.getElementById('pdf-mt').textContent = titles[type][STATE.lang] || titles[type].de;
  document.getElementById('pdf-mss').textContent = STATE.lang === 'de' ? 'Aktueller Beta-Entwurf · Beispieldaten · PDF mit auswählbarem Text' : STATE.lang === 'en' ? 'Current beta draft · sample data · PDF with selectable text' : 'Текущий черновик беты · примеры данных · PDF с выделяемым текстом';

  // Restore skip-preview checkbox state from localStorage so the user sees their current setting
  const skipBox = document.getElementById('pdf-skip-prev');
  if (skipBox) skipBox.checked = getSkipPreview();

  const loadingTxt = STATE.lang === 'de' ? 'Lade Vorschau…' : STATE.lang === 'en' ? 'Loading preview…' : 'Загрузка превью…';
  document.getElementById('pdf-prev').innerHTML = '<div style="padding:80px 40px;text-align:center;color:#888;font-size:14px">' + loadingTxt + '</div>';
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { if (!m.classList.contains('open')) return; const x = m.querySelector('.mx'); if (x) x.focus(); trapFocus(m); }, 50);

  try { await PDFLibs(); } catch (e) { console.warn('PDF libs load failed:', e); }
  // Never leave the modal stuck on the loading spinner if a template builder throws
  try {
    document.getElementById('pdf-prev').innerHTML = buildPreviewHTML(type, id);
  } catch (e) {
    console.error('Preview build failed:', e);
    const errTxt = STATE.lang === 'de' ? 'Vorschau konnte nicht erstellt werden.' : STATE.lang === 'en' ? 'Preview could not be generated.' : 'Не удалось построить превью.';
    document.getElementById('pdf-prev').innerHTML = '<div style="padding:80px 40px;text-align:center;color:#888;font-size:14px">' + errTxt + '</div>';
  }
}

// === Account & Settings modal — opens from header "Mein Konto" button ===
function openSettings() {
  const m = document.getElementById('settings-modal');
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const x = m.querySelector('.mx'); if (x) x.focus(); trapFocus(m); }, 50);
}
function closeSettings() {
  const m = document.getElementById('settings-modal');
  if (!m) return;
  releaseTrap(m);
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function saveSettings() {
  const el = document.getElementById('set-saved');
  if (!el) return;
  const L = STATE.lang;
  el.textContent = L === 'de' ? '✓ Im Live-Produkt würden Ihre Änderungen jetzt mit Ihrem Konto gespeichert.'
                 : L === 'en' ? '✓ In the live product your changes would now be saved to your account.'
                              : '✓ В live-продукте ваши изменения сейчас сохранились бы в вашем аккаунте.';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;

// === Ancestor info modal — opens from pedigree SVG cell click ===
// Lookup ANCESTORS by zbNr (the cell stores zbNr as identifier).
function findAncestorByZbNr(zbNr) {
  if (!zbNr) return null;
  for (const k in ANCESTORS) {
    if (ANCESTORS[k] && ANCESTORS[k].zbNr === zbNr) return ANCESTORS[k];
  }
  return null;
}
function openAncestorModal(zbNr) {
  const a = findAncestorByZbNr(zbNr);
  const m = document.getElementById('ancestor-modal');
  if (!m) return;
  const L = STATE.lang;
  const labels = {
    color: { de: 'Farbe', en: 'Color', ru: 'Окрас' },
    birth: { de: 'Wurftag', en: 'Birth date', ru: 'Дата рождения' },
    titles: { de: 'Titel', en: 'Titles', ru: 'Титулы' },
    hd: { de: 'HD', en: 'HD', ru: 'HD' },
    ed: { de: 'ED', en: 'ED', ru: 'ED' },
    formwert: { de: 'Formwert', en: 'Conformation', ru: 'Экстерьер' },
    notFound: { de: 'Daten zu diesem Vorfahren sind in der Demo nicht hinterlegt.', en: 'Demo data for this ancestor is not stored.', ru: 'Данные об этом предке в демо отсутствуют.' },
    demoNote: { de: 'In der Demo sind Vorfahren statische Beispieldaten. Im Live-Produkt: vollständiges Profil mit Fotos, Würfen, Gesundheits-Dokumenten und Verbindungen zu anderen Hunden Ihres Zwingers.', en: 'In the demo, ancestors are static sample data. In the live product: full profile with photos, litters, health documents and links to other dogs in your kennel.', ru: 'В демо предки — статические тестовые данные. В live-продукте: полный профиль с фотографиями, помётами, документами о здоровье и связями с другими собаками вашего питомника.' }
  };
  const get = (k) => labels[k][L] || labels[k].de;

  document.getElementById('anc-name').textContent = (a && a.name) ? a.name : (zbNr || '—');
  document.getElementById('anc-zbnr').textContent = (a && a.zbNr) ? a.zbNr : '';

  let body = '';
  if (!a) {
    body = `<p style="font-size:.85rem;color:var(--t3);line-height:1.6">${get('notFound')}</p>`;
  } else {
    const rows = [];
    if (a.color)    rows.push([get('color'), a.color]);
    if (a.birth)    rows.push([get('birth'), formatDateDE ? formatDateDE(a.birth) : a.birth]);
    if (a.titles && a.titles.length) rows.push([get('titles'), a.titles.join(' · ')]);
    if (a.hd)       rows.push([get('hd'), a.hd]);
    if (a.ed)       rows.push([get('ed'), a.ed]);
    if (a.formwert) rows.push([get('formwert'), a.formwert]);
    body = '<div class="ku" style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:.88rem;margin-bottom:1rem">'
      + rows.map(r => `<b style="color:var(--t3);font-weight:500">${r[0]}</b><span>${escapeHtml(String(r[1]))}</span>`).join('')
      + '</div>'
      + `<div style="font-size:.75rem;color:var(--t3);line-height:1.55;padding-top:.85rem;border-top:1px dashed var(--b);font-style:italic">${get('demoNote')}</div>`;
  }
  document.getElementById('anc-body').innerHTML = body;

  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const x = m.querySelector('.mx'); if (x) x.focus(); trapFocus(m); }, 50);
}
function closeAncestor() {
  const m = document.getElementById('ancestor-modal');
  if (!m) return;
  releaseTrap(m);
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
window.openAncestorModal = openAncestorModal;
window.closeAncestor = closeAncestor;

function closePDF() {
  const m = document.getElementById('pdf-modal');
  releaseTrap(m);
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  STATE.currentPDF = null;
  const trigger = m._returnFocus;
  const target = trigger?.isConnected && trigger.getClientRects().length
    ? trigger : document.querySelector('nav.tabs .tb.active');
  if (target) target.focus({ preventScroll: true });
  delete m._returnFocus;
}

// ===== COI Rechner =====
function renderCOI() {
  const sireSel = document.getElementById('coi-sire');
  const damSel = document.getElementById('coi-dam');
  if (!sireSel || !damSel) return;

  // Sire options: external sire from litter + male dogs
  const sireOpts = [
    { val: 'apollo_external', label: 'Apollo vom Sonnenhof (DRC 20-09876, HD A1)' },
    { val: 'rex', label: 'Rex vom Waldberg (DSH, HD A1, IGP3)' }
  ];
  const damOpts = DOGS.filter(d => d.sex === 'female').map(d => ({ val: d.id, label: `${d.fullName} (${d.zbNr}, HD ${d.hd})` }));

  sireSel.innerHTML = sireOpts.map(o => `<option value="${o.val}">${o.label}</option>`).join('');
  damSel.innerHTML = damOpts.map(o => `<option value="${o.val}">${o.label}</option>`).join('');
  sireSel.value = 'apollo_external';
  damSel.value = 'luna';

  calcCOI();
}

function calcCOI() {
  const sireVal = document.getElementById('coi-sire').value;
  const damVal = document.getElementById('coi-dam').value;

  let sireDog;
  if (sireVal === 'apollo_external') {
    const litter = LITTERS[0];
    sireDog = {
      ...litter.externalSire,
      fullName: litter.externalSire.name,
      zbNr: litter.externalSire.zbNr,
      pedigree: litter.externalSire.pedigree
    };
  } else {
    sireDog = DOGS.find(d => d.id === sireVal);
  }
  const damDog = DOGS.find(d => d.id === damVal);

  if (!sireDog || !damDog || !sireDog.pedigree || !damDog.pedigree) {
    document.getElementById('coi-value').textContent = 'N/A';
    document.getElementById('coi-status').className = 'coist warn';
    document.getElementById('coi-status').innerHTML = STATE.lang === 'de' ? 'Stammbaum nur in dieser Demo unvollständig' : STATE.lang === 'en' ? 'Pedigree incomplete in this demo' : 'В этом демо родословная неполная';
    // Explain rather than show empty space — clarify the demo-data limit
    const sireName = sireDog && (sireDog.fullName || sireDog.name) || (STATE.lang === 'ru' ? 'выбранный кобель' : 'selected sire');
    const damName = damDog && (damDog.fullName || damDog.name) || (STATE.lang === 'ru' ? 'выбранная сука' : 'selected dam');
    const ph = STATE.lang === 'de'
      ? `<div class="pedempty"><div class="pedempty-ic">🌳</div><div class="pedempty-h">Für diese Kombination ist in der Demo kein Stammbaum hinterlegt</div><div class="pedempty-t">Nur das Pärchen <b>Apollo vom Sonnenhof × Luna vom Waldberg</b> hat in dieser Demo eine vollständige 3-Generationen-Ahnentafel. Im Live-Produkt importieren Sie Ahnentafeln als PDF oder Foto — unsere KI füllt das Diagramm automatisch.</div></div>`
      : STATE.lang === 'en'
      ? `<div class="pedempty"><div class="pedempty-ic">🌳</div><div class="pedempty-h">No pedigree stored for this combination in the demo</div><div class="pedempty-t">Only the pair <b>Apollo vom Sonnenhof × Luna vom Waldberg</b> has a full 3-generation tree in this demo. In the live product you upload Ahnentafels as PDF or photo — our AI fills the diagram automatically.</div></div>`
      : `<div class="pedempty"><div class="pedempty-ic">🌳</div><div class="pedempty-h">Для этой комбинации в демо родословная не загружена</div><div class="pedempty-t">Только пара <b>Apollo vom Sonnenhof × Luna vom Waldberg</b> имеет полное 3-поколенное дерево в этом демо. В live-продукте вы загружаете родословные в PDF или на фото — наш AI заполняет диаграмму автоматически.</div></div>`;
    document.getElementById('ped-svg').innerHTML = ph;
    // Reset the bars to a neutral state so they don't lie about a number
    const barThis = document.getElementById('bar-this');
    if (barThis) { barThis.style.width = '0%'; }
    const bv = document.getElementById('bar-this-v'); if (bv) bv.textContent = '—';
    return;
  }

  const result = calculateCOI(sireDog, damDog, ANCESTORS);
  const coi = result.coi;
  document.getElementById('coi-value').textContent = coi.toFixed(2) + '%';
  const status = coiStatus(coi);
  const statusEl = document.getElementById('coi-status');
  statusEl.className = 'coist ' + status.class;
  statusEl.textContent = coiStatusLabel(status, STATE.lang);

  // Update bars
  const breed = damDog.breed || 'Golden Retriever';
  const breedAvg = BREED_AVG_COI[breed] || 7.1;
  const barThis = document.getElementById('bar-this');
  barThis.style.width = Math.min(coi / 25 * 100, 100) + '%';
  barThis.style.background = status.class === 'ok' ? 'var(--p)' : status.class === 'warn' ? 'var(--warn)' : 'var(--err)';
  document.getElementById('bar-this-v').textContent = coi.toFixed(2) + '%';
  document.getElementById('bar-avg-v').textContent = breedAvg.toFixed(1) + '%';

  // Render pedigree
  renderPedigreeSVG(sireDog, damDog, ANCESTORS, document.getElementById('ped-svg'));
}

// ===== Master render =====
function renderAll() {
  renderOverview();
  if (STATE.currentDog) renderDogDetail();
  renderLitters();
  if (STATE.currentLitter) renderLitterDetail();
  renderDocs();
  renderCOI();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
  setLang(STATE.lang);
  restoreFromHash();
  renderAll();
  setTimeout(animateStats, 100);
});

// Browser back/forward support
window.addEventListener('popstate', function(e) {
  const s = e.state;
  if (s) {
    STATE.currentDog = s.dog;
    STATE.currentLitter = s.litter;
    setActiveTabUI(s.tab);
  } else {
    restoreFromHash();
  }
  renderAll();
});

// Close modals on Escape — but NOT when user is typing in a field
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
  // Close in priority order — closest to user gets closed first
  if (document.getElementById('lightbox')?.classList.contains('open')) { closeLightbox(); return; }
  if (document.getElementById('ancestor-modal')?.classList.contains('open')) { closeAncestor(); return; }
  if (document.getElementById('settings-modal')?.classList.contains('open')) { closeSettings(); return; }
  if (document.getElementById('pdf-modal')?.classList.contains('open')) { closePDF(); return; }
  if (document.getElementById('puppy-modal')?.classList.contains('open')) { closePuppy(); return; }
});

// Focus trap helper for modals
function trapFocus(modalEl) {
  if (!modalEl) return;
  const focusable = modalEl.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  modalEl._trapHandler = function(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  modalEl.addEventListener('keydown', modalEl._trapHandler);
}
function releaseTrap(modalEl) {
  if (modalEl && modalEl._trapHandler) {
    modalEl.removeEventListener('keydown', modalEl._trapHandler);
    delete modalEl._trapHandler;
  }
}

// Wrap downloadPDF to ensure PDF libs are loaded + fire confetti on success
const _origDownload = window.downloadPDF;
window.downloadPDF = async function() {
  if (typeof _origDownload === 'function') {
    await PDFLibs();
    await _origDownload();
    confetti();
  }
};
