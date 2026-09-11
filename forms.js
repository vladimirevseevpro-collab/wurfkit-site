(function () {
  'use strict';
  var messages = {
    de: { sending: 'Wird gesendet …', failed: 'Die Speicherung konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut.', invalid: 'Bitte prüfen Sie Ihre E-Mail-Adresse und die Eingaben.', busy: 'Der Dienst ist gerade ausgelastet. Bitte versuchen Sie es gleich erneut.' },
    en: { sending: 'Sending …', failed: 'We could not confirm that your entry was saved. Your input is still here. Please try again.', invalid: 'Please check your email address and the form fields.', busy: 'The service is busy. Please try again shortly.' },
    ru: { sending: 'Отправляем …', failed: 'Не удалось подтвердить сохранение. Ваши данные остались в форме. Попробуйте ещё раз.', invalid: 'Проверьте email и заполненные поля.', busy: 'Сервис сейчас занят. Попробуйте чуть позже.' }
  };
  var pending = new WeakSet();
  function language() {
    return messages[document.documentElement.lang] ? document.documentElement.lang : 'de';
  }
  async function submit(form, endpoint) {
    if (pending.has(form) || !form.reportValidity()) return;
    var status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.tabIndex = -1;
      form.appendChild(status);
    }
    var lang = language();
    var button = form.querySelector('button[type="submit"]');
    var params = new URLSearchParams();
    new FormData(form).forEach(function (value, key) {
      if (typeof value === 'string') params.append(key, value);
    });
    params.set('lang', lang);
    pending.add(form);
    if (button) button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = messages[lang].sending;
    status.classList.remove('is-error');
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var url = new URL(endpoint);
      // Keep the existing Apps Script GET routing until its POST deployment is
      // independently verified. A readable JSON response is required for success.
      url.search = params.toString();
      var response = await fetch(url.href, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('unconfirmed');
      var result = await response.json();
      if (!result || result.status !== 'ok') {
        throw new Error(result && (result.status === 'invalid' || result.status === 'busy') ? result.status : 'unconfirmed');
      }
      window.location.assign('danke.html');
    } catch (error) {
      var reason = error && error.message;
      status.textContent = messages[language()][reason === 'invalid' || reason === 'busy' ? reason : 'failed'];
      status.classList.add('is-error');
      status.focus();
    } finally {
      clearTimeout(timeout);
      pending.delete(form);
      form.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  }
  window.WurfKitForms = {
    init: function (endpoint) {
      document.querySelectorAll('form[name="waitlist"], form[name="waitlist-cta"], form[name="contact"]').forEach(function (form) {
        if (form.dataset.confirmedSubmit === 'true') return;
        form.dataset.confirmedSubmit = 'true';
        form.addEventListener('submit', function (event) { event.preventDefault(); void submit(form, endpoint); });
      });
    }
  };
})();
