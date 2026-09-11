// Demo i18n — German default
const I18N = {
  // Status labels
  status: {
    available: { de: 'Verfügbar', en: 'Available', ru: 'Доступен' },
    reserved: { de: 'Reserviert', en: 'Reserved', ru: 'Забронирован' },
    sold: { de: 'Verkauft', en: 'Sold', ru: 'Продан' },
    kept_by_breeder: { de: 'Beim Züchter', en: 'Kept by breeder', ru: 'У заводчика' }
  },
  sex: {
    male: { de: 'Rüde', en: 'Male', ru: 'Кобель' },
    female: { de: 'Hündin', en: 'Female', ru: 'Сука' }
  },
  // Common
  common: {
    edit: { de: 'Bearbeiten', en: 'Edit', ru: 'Изменить' },
    delete: { de: 'Löschen', en: 'Delete', ru: 'Удалить' },
    save: { de: 'Speichern', en: 'Save', ru: 'Сохранить' },
    cancel: { de: 'Abbrechen', en: 'Cancel', ru: 'Отмена' },
    close: { de: 'Schließen', en: 'Close', ru: 'Закрыть' },
    parents: { de: 'Eltern', en: 'Parents', ru: 'Родители' },
    sire: { de: 'Vater (Deckrüde)', en: 'Sire', ru: 'Отец' },
    dam: { de: 'Mutter (Zuchthündin)', en: 'Dam', ru: 'Мать' },
    breed: { de: 'Rasse', en: 'Breed', ru: 'Порода' },
    sex_: { de: 'Geschlecht', en: 'Sex', ru: 'Пол' },
    birth: { de: 'Wurfdatum', en: 'Birth date', ru: 'Дата рождения' },
    color: { de: 'Farbe', en: 'Color', ru: 'Окрас' },
    microchip: { de: 'Mikrochip', en: 'Microchip', ru: 'Микрочип' },
    zbNr: { de: 'Zuchtbuch-Nr.', en: 'Stud book no.', ru: 'Племенной №' },
    health: { de: 'Gesundheit', en: 'Health', ru: 'Здоровье' },
    breeding: { de: 'Zuchtzulassung', en: 'Breeding eligibility', ru: 'Допуск к разведению' },
    notes: { de: 'Notizen', en: 'Notes', ru: 'Примечания' },
    age: { de: 'Alter', en: 'Age', ru: 'Возраст' },
    pedigree: { de: 'Stammbaum', en: 'Pedigree', ru: 'Родословная' },
    welpen: { de: 'Welpen', en: 'Puppies', ru: 'Щенки' },
    yes: { de: 'Ja', en: 'Yes', ru: 'Да' },
    no: { de: 'Nein', en: 'No', ru: 'Нет' },
    deckdate: { de: 'Deckdatum', en: 'Mating date', ru: 'Дата вязки' },
    wurfdate: { de: 'Wurfdatum', en: 'Whelping date', ru: 'Дата рождения' },
    wurfabnahme: { de: 'Wurfabnahme', en: 'Litter inspection', ru: 'Осмотр помёта' },
    wurfmeldung: { de: 'Wurfmeldung', en: 'Litter registration', ru: 'Регистрация помёта' },
    wurfstaerke: { de: 'Wurfstärke', en: 'Litter size', ru: 'Размер помёта' },
    weight: { de: 'Gewichtsverlauf', en: 'Weight progression', ru: 'Динамика веса' },
    age_weeks: { de: 'Alter (Wochen)', en: 'Age (weeks)', ru: 'Возраст (недели)' },
    weight_kg: { de: 'Gewicht (kg)', en: 'Weight (kg)', ru: 'Вес (кг)' },
    buyer: { de: 'Käufer', en: 'Buyer', ru: 'Покупатель' },
    saleprice: { de: 'Kaufpreis', en: 'Price', ru: 'Цена' },
    saledate: { de: 'Verkaufsdatum', en: 'Sale date', ru: 'Дата продажи' },
    chip_id: { de: 'Chip-ID', en: 'Chip ID', ru: 'Чип' },
    eyes: { de: 'Augenuntersuchung', en: 'Eye examination', ru: 'Глаза' },
    formwert: { de: 'Formwert', en: 'Conformation', ru: 'Экстерьер' },
    ztp: { de: 'ZTP', en: 'ZTP', ru: 'ZTP' },
    titles: { de: 'Titel', en: 'Titles', ru: 'Титулы' },
    owner: { de: 'Eigentümer', en: 'Owner', ru: 'Владелец' }
  },
  // Documents
  docs: {
    generate: { de: 'Beispiel-PDF öffnen', en: 'Open sample PDF', ru: 'Открыть пример PDF' },
    welpenpaket: { de: 'Welpen-Paket', en: 'Puppy Packet', ru: 'Пакет щенка' },
    welpenpaket_desc: { de: 'Übergabeübersicht mit Checkliste. Private Originalanlagen gehören nur in das angemeldete Beta-Paket.', en: 'Handover overview with a checklist. Private original attachments belong only in the signed-in beta package.', ru: 'Обзор передачи с чек-листом. Приватные оригиналы входят только в пакет авторизованной беты.' },
    kaufvertrag_desc: { de: 'Ungeprüfte Demo-Vorlage mit automatisch übernommenen Profildaten', en: 'Unreviewed demo template with profile data filled in automatically', ru: 'Непроверенный демо-шаблон с автоматической подстановкой данных профиля' },
    wurfmeldung_desc: { de: 'Wurfmeldung-Datenblatt für Ihren Zuchtverein (Pre-Fill für Vereins-Formular)', en: 'Litter registration data sheet for your breed club (pre-fill helper)', ru: 'Лист данных Wurfmeldung для подачи в Verein (помощник pre-fill)' }
  }
};

function t(path) {
  const parts = path.split('.');
  let v = I18N;
  for (const p of parts) v = v && v[p];
  if (!v) return path;
  return v[STATE.lang] || v.de || path;
}

function setLang(lang) {
  if (!['de', 'en', 'ru'].includes(lang)) lang = 'de';
  STATE.lang = lang;
  document.body.className = 'l-' + lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('.lb').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  const btn = document.getElementById('btn-' + lang);
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  try { localStorage.setItem('wk-demo-lang', lang); } catch(e) {}
  // Re-render current view to apply language
  if (typeof renderAll === 'function') renderAll();
}

// Initial language: localStorage or default DE
(function() {
  let lang = 'de';
  try { lang = localStorage.getItem('wk-demo-lang') || 'de'; } catch(e) {}
  if (!['de','en','ru'].includes(lang)) lang = 'de';
  STATE.lang = lang;
})();

// Format helpers
function formatDateDE(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAge(iso) {
  if (!iso) return '—';
  const birth = new Date(iso);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return months + ' ' + (STATE.lang === 'de' ? 'Mon.' : STATE.lang === 'en' ? 'mo.' : 'мес.');
  const years = Math.floor(months / 12);
  const remM = months % 12;
  const ySuf = STATE.lang === 'de' ? 'J' : STATE.lang === 'en' ? 'y' : 'г';
  const mSuf = STATE.lang === 'de' ? 'M' : STATE.lang === 'en' ? 'm' : 'м';
  return years + ' ' + ySuf + (remM ? ' ' + remM + ' ' + mSuf : '');
}

function formatPrice(eur) {
  if (eur == null) return '—';
  return eur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Convert number to German words (for Kaufvertrag)
function numberToGermanWords(num) {
  if (num === 0) return 'null';
  const ones = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
  const teens = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
  const tens = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  function under1000(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const o = n % 10, t = Math.floor(n / 10);
      if (o === 0) return tens[t];
      if (o === 1) return 'einund' + tens[t];
      return ones[o] + 'und' + tens[t];
    }
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h === 1 ? 'einhundert' : ones[h] + 'hundert') + (r ? under1000(r) : '');
  }
  if (num < 1000) return under1000(num);
  if (num < 1000000) {
    const th = Math.floor(num / 1000), r = num % 1000;
    const thStr = th === 1 ? 'eintausend' : under1000(th) + 'tausend';
    return thStr + (r ? under1000(r) : '');
  }
  return num.toString();
}
