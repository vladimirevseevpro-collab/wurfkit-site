// Public, synthetic PDFs generated offline from the current beta templates.
(function () {
  function sample(type, id) { return (window.WK_PDF_SAMPLES || {})[type + ':' + id]; }
  function lang() { return STATE.lang === 'ru' ? 'ru' : STATE.lang === 'en' ? 'en' : 'de'; }
  const labels = {
    de: { missing: 'Für diese Vorschau ist zuerst eine Käuferzuordnung erforderlich. Im Demo können Sie die Unterlagen von Aaron, Ben oder Diego öffnen.', note: 'Beispieldaten · aktueller Beta-Entwurf zur Prüfung. Die PDF enthält auswählbaren Text. Private Anlagen sind in diesem öffentlichen Beispiel nicht enthalten.', open: 'PDF in neuem Tab öffnen', page: 'Dokumentseite', failed: 'Die PDF konnte nicht geladen werden. Bitte versuchen Sie es erneut.' },
    en: { missing: 'This document needs an assigned buyer. In the demo, open the documents for Aaron, Ben or Diego.', note: 'Sample data · current beta draft for review. The PDF has selectable text. Private attachments are not included in this public example.', open: 'Open PDF in a new tab', page: 'Document page', failed: 'The PDF could not be loaded. Please try again.' },
    ru: { missing: 'Для этого документа нужно назначить покупателя. В демо доступны документы Aaron, Ben и Diego.', note: 'Примеры данных · текущий черновик беты для проверки. В PDF можно выделять текст. Приватные вложения в публичный пример не включены.', open: 'Открыть PDF в новой вкладке', page: 'Страница документа', failed: 'Не удалось загрузить PDF. Попробуйте ещё раз.' }
  };
  window.buildPreviewHTML = function (type, id) {
    const entry = sample(type, id), copy = labels[lang()];
    const button = document.getElementById('pdf-dl');
    if (button) button.disabled = !entry;
    if (!entry) return '<p role="status" style="padding:2rem">' + copy.missing + '</p>';
    return '<div class="sample-preview"><p>' + copy.note + '</p><a href="' + entry.pdf + '" target="_blank" rel="noopener">' + copy.open + '</a>' + entry.previews.map((url, index) => '<img src="' + url + '" alt="' + copy.page + ' ' + (index + 1) + ' / ' + entry.pages + '" loading="lazy" style="display:block;width:100%;height:auto;margin:1rem 0;border:1px solid #dce5dc"/>').join('') + '</div>';
  };
  window.downloadPDF = async function () {
    if (!STATE.currentPDF) return;
    const entry = sample(STATE.currentPDF.type, STATE.currentPDF.id), copy = labels[lang()];
    if (!entry) { alert(copy.missing); return; }
    const button = document.getElementById('pdf-dl');
    if (button) button.disabled = true;
    try {
      const response = await fetch(entry.pdf, { credentials: 'omit' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('missing PDF');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'WurfKit-DEMO-' + entry.pdf.split('/').pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { alert(copy.failed); }
    finally { if (button) button.disabled = false; }
  };
})();
