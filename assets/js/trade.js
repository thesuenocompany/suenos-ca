(() => {
  'use strict';

  const form = document.querySelector('[data-trade-form]');
  if (!form) return;

  const config = window.SUENOS_CONFIG || {};
  const endpoint = config.tradeInquiryEndpoint;
  const anonKey = config.supabaseAnonKey;
  const steps = Array.from(form.querySelectorAll('[data-trade-step]'));
  const progressItems = Array.from(document.querySelectorAll('[data-trade-progress]'));
  const backButton = form.querySelector('[data-trade-back]');
  const nextButton = form.querySelector('[data-trade-next]');
  const submitButton = form.querySelector('[data-trade-submit]');
  const formWrap = document.querySelector('[data-trade-form-wrap]');
  const status = document.querySelector('[data-trade-status]');
  const stepStatus = document.querySelector('[data-trade-step-status]');
  const resultPanel = document.querySelector('[data-trade-result]');
  const resultKicker = resultPanel?.querySelector('[data-trade-result-kicker]');
  const resultTitle = resultPanel?.querySelector('[data-trade-result-title]');
  const resultMessage = resultPanel?.querySelector('[data-trade-result-message]');
  const resultRepresentative = resultPanel?.querySelector('[data-trade-representative]');
  const resultActions = resultPanel?.querySelector('[data-trade-result-actions]');
  const turnstileWrap = form.querySelector('[data-turnstile-wrap]');
  const preferredContactInputs = Array.from(form.querySelectorAll('input[name="preferredContactMethod"]'));
  const phoneField = form.elements.phone;
  const honeypotField = form.querySelector('input[name="hp_check"]');

  const stepNames = ['Business', 'Location', 'Contact', 'What You Need'];
  const requiredMessages = {
    businessType: 'Select a business type.',
    businessName: 'Enter the business name.',
    province: 'Select a province or territory.',
    firstName: 'Enter your first name.',
    lastName: 'Enter your last name.',
    email: 'Enter a valid email address.',
    phone: 'Enter a phone number when phone is your preferred contact method.',
    inquiryType: 'Select an inquiry type.',
    supportRequested: 'Select the support you need.',
    consentToContact: 'Please agree to be contacted about this trade inquiry.',
    postalCode: 'Enter a Canadian postal code in the format A1A 1A1.',
    numberOfLocations: 'Enter a whole number of 1 or more.',
    turnstileToken: 'Please complete the spam-protection check.'
  };

  let currentStep = 0;
  let submitting = false;

  const track = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  };

  const clean = value => typeof value === 'string' ? value.trim() : value;
  const optional = value => {
    const cleaned = clean(value);
    return cleaned === '' || cleaned == null ? undefined : cleaned;
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  const formatPostalCode = value => {
    const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
  };

  const phoneHref = value => `tel:${String(value || '').replace(/[^+\d]/g, '')}`;

  const getPreferredContactMethod = () =>
    preferredContactInputs.find(input => input.checked)?.value || 'email';

  const getTurnstileToken = () =>
    clean(form.querySelector('[name="cf-turnstile-response"]')?.value || '');

  const setStatus = (message = '', type = '') => {
    if (!status) return;
    status.textContent = message;
    status.className = 'trade-form-status';
    if (type) status.classList.add(`is-${type}`);
  };

  const errorNodeFor = name => form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);

  const fieldForName = name => {
    if (name === 'turnstileToken') return turnstileWrap;
    const element = form.elements.namedItem(name);
    if (element instanceof RadioNodeList) return element[0] || null;
    return element || null;
  };

  const clearFieldError = name => {
    const node = errorNodeFor(name);
    if (node) node.textContent = '';
    const field = fieldForName(name);
    if (field?.removeAttribute) field.removeAttribute('aria-invalid');
  };

  const setFieldError = (name, message) => {
    const node = errorNodeFor(name);
    if (node) node.textContent = message;
    const field = fieldForName(name);
    if (field?.setAttribute) field.setAttribute('aria-invalid', 'true');
  };

  const clearAllErrors = () => {
    form.querySelectorAll('[data-error-for]').forEach(node => { node.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
  };

  const validationMessageFor = field => {
    if (!field?.name) return 'Check this field.';
    if (field.name === 'postalCode' && field.validity.patternMismatch) return requiredMessages.postalCode;
    if (field.name === 'email' && field.validity.typeMismatch) return requiredMessages.email;
    if (field.name === 'numberOfLocations' && (field.validity.rangeUnderflow || field.validity.stepMismatch || field.validity.badInput)) return requiredMessages.numberOfLocations;
    return requiredMessages[field.name] || field.validationMessage || 'Check this field.';
  };

  const validateCurrentStep = () => {
    const panel = steps[currentStep];
    if (!panel) return true;

    let firstInvalid = null;
    const fields = Array.from(panel.querySelectorAll('input, select, textarea'))
      .filter(field => field.type !== 'hidden' && field.name !== 'hp_check');

    fields.forEach(field => {
      clearFieldError(field.name);
      if (!field.checkValidity()) {
        setFieldError(field.name, validationMessageFor(field));
        firstInvalid ||= field;
      }
    });

    if (currentStep === 2 && getPreferredContactMethod() === 'phone' && !clean(phoneField.value)) {
      setFieldError('phone', requiredMessages.phone);
      phoneField.setAttribute('aria-invalid', 'true');
      firstInvalid ||= phoneField;
    }

    if (currentStep === 3 && !getTurnstileToken()) {
      setFieldError('turnstileToken', requiredMessages.turnstileToken);
      turnstileWrap?.setAttribute('aria-invalid', 'true');
      firstInvalid ||= turnstileWrap;
    }

    if (firstInvalid) {
      setStatus('Please check the highlighted fields before continuing.', 'error');
      firstInvalid.focus?.();
      firstInvalid.scrollIntoView?.({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return false;
    }

    setStatus('');
    return true;
  };

  const showStep = (index, focusHeading = true) => {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== currentStep; });
    progressItems.forEach((item, itemIndex) => {
      if (itemIndex === currentStep) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('is-complete', itemIndex < currentStep);
    });
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    if (stepStatus) stepStatus.textContent = `Step ${currentStep + 1} of ${steps.length}: ${stepNames[currentStep]}`;
    if (focusHeading) steps[currentStep].querySelector('legend')?.focus();
    track('trade_form_step_view', { step: currentStep + 1, step_name: stepNames[currentStep] });
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    showStep(currentStep + 1);
  };

  const goBack = () => {
    setStatus('');
    showStep(currentStep - 1);
  };

  const normalizeServerFields = fields => {
    if (!Array.isArray(fields)) return [];
    return fields.map(item => {
      if (typeof item === 'string') return item;
      return item?.field || item?.name || item?.path || '';
    }).filter(Boolean);
  };

  const focusServerField = fieldNames => {
    const first = fieldNames.map(fieldForName).find(Boolean);
    if (!first) return;
    const stepIndex = steps.findIndex(step => step.contains(first));
    if (stepIndex >= 0) showStep(stepIndex, false);
    requestAnimationFrame(() => first.focus?.());
  };

  const resetTurnstile = () => {
    try {
      if (window.turnstile?.reset) window.turnstile.reset();
    } catch (error) {
      // The widget will refresh itself on the next page load if reset is unavailable.
    }
  };

  const resultCopyForScenario = scenario => {
    switch (scenario) {
      case 'not_distributed':
        return { kicker: 'DETAILS SAVED', title: 'Not in Your Area Yet' };
      case 'manual_review':
        return { kicker: 'INQUIRY RECEIVED', title: 'Our Trade Team Has It' };
      case 'local':
      case 'provincial':
      case 'national':
      default:
        return { kicker: 'INQUIRY RECEIVED', title: 'You’re in the Right Place' };
    }
  };

  const renderRepresentative = representative => {
    if (!resultRepresentative) return;
    if (!representative) {
      resultRepresentative.innerHTML = '';
      return;
    }

    const name = escapeHtml(representative.name || 'Sueños Trade Team');
    const title = representative.title ? `<p>${escapeHtml(representative.title)}</p>` : '';
    const email = representative.email ? `<p><a href="mailto:${escapeHtml(representative.email)}">${escapeHtml(representative.email)}</a></p>` : '';
    const phone = representative.phone ? `<p><a href="${phoneHref(representative.phone)}">${escapeHtml(representative.phone)}</a></p>` : '';
    const initials = escapeHtml((representative.name || 'ST').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase());
    const photo = representative.photoUrl
      ? `<img class="trade-rep-photo" src="${escapeHtml(representative.photoUrl)}" alt="${name}">`
      : `<div class="trade-rep-placeholder" aria-hidden="true">${initials}</div>`;

    resultRepresentative.innerHTML = `
      <article class="trade-rep-card" aria-label="Your Sueños representative">
        ${photo}
        <div>
          <h3>${name}</h3>
          ${title}${email}${phone}
        </div>
      </article>`;
  };

  const renderSuccess = result => {
    const scenario = result?.scenario || 'manual_review';
    const copy = resultCopyForScenario(scenario);
    if (resultKicker) resultKicker.textContent = copy.kicker;
    if (resultTitle) resultTitle.textContent = copy.title;
    if (resultMessage) {
      resultMessage.textContent = result?.confirmationMessage || 'Thank you. Your inquiry is with the Sueños trade team and someone will be in touch shortly.';
    }
    renderRepresentative(result?.representative || null);

    if (resultActions) {
      resultActions.innerHTML = '';
      const sellSheet = result?.sellSheet;
      if (sellSheet?.sellSheetUrl) {
        const link = document.createElement('a');
        link.className = 'orange-btn';
        link.href = sellSheet.sellSheetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = sellSheet.sellSheetName ? `Download ${sellSheet.sellSheetName}` : 'Download Sell Sheet';
        resultActions.appendChild(link);
      }
      const home = document.createElement('a');
      home.className = 'text-button';
      home.href = '../index.html';
      home.textContent = 'Return to Sueños';
      resultActions.appendChild(home);
    }

    formWrap.hidden = true;
    resultPanel.hidden = false;
    resultPanel.focus();
    resultPanel.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    track('trade_form_submit_success', { scenario, province: result?.province || '' });
    window.SuenosConsent?.trackMeta?.('Lead');
  };

  const renderError = (code, payload = {}) => {
    clearAllErrors();
    let message = 'Something went wrong. Please try again or email trade@suenos.ca.';
    let fieldNames = [];

    switch (code) {
      case 'validation_error':
        fieldNames = normalizeServerFields(payload.fields);
        fieldNames.forEach(name => setFieldError(name, requiredMessages[name] || 'Please check this field.'));
        message = 'Please review the highlighted fields and try again.';
        focusServerField(fieldNames);
        break;
      case 'consent_required':
        fieldNames = ['consentToContact'];
        setFieldError('consentToContact', requiredMessages.consentToContact);
        message = 'Please check the consent box so our trade team may respond.';
        focusServerField(fieldNames);
        break;
      case 'spam_rejected':
        fieldNames = ['turnstileToken'];
        setFieldError('turnstileToken', 'The spam-protection check could not be verified. Please complete it again.');
        message = 'The spam-protection check expired or failed. Please complete it again and retry.';
        showStep(3, false);
        resetTurnstile();
        turnstileWrap?.focus();
        break;
      case 'rate_limited': {
        const seconds = Number(payload.retryAfter);
        const wait = Number.isFinite(seconds) && seconds > 0 ? ` Please wait about ${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? '' : 's'} before trying again.` : ' Please wait a few minutes before trying again.';
        message = `Too many inquiries were submitted from this connection.${wait}`;
        break;
      }
      case 'duplicate_submission':
        message = 'We already received this inquiry. There is no need to submit it again; a confirmation email should arrive shortly.';
        setStatus(message, 'info');
        track('trade_form_duplicate', {});
        return;
      case 'server_error':
      default:
        message = 'Something went wrong while sending your inquiry. Please try again or email trade@suenos.ca.';
        break;
    }

    setStatus(message, 'error');
    status?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    track('trade_form_submit_error', { error_code: code || 'server_error' });
  };

  const buildPayload = () => {
    const data = new FormData(form);
    const params = new URLSearchParams(window.location.search);
    const locationsValue = optional(data.get('numberOfLocations'));

    return {
      inquiryType: clean(data.get('inquiryType')),
      businessType: clean(data.get('businessType')),
      businessName: clean(data.get('businessName')),
      numberOfLocations: locationsValue ? Number.parseInt(locationsValue, 10) : undefined,
      firstName: clean(data.get('firstName')),
      lastName: clean(data.get('lastName')),
      jobTitle: optional(data.get('jobTitle')),
      email: clean(data.get('email')),
      phone: optional(data.get('phone')),
      preferredContactMethod: getPreferredContactMethod(),
      province: clean(data.get('province')),
      city: optional(data.get('city')),
      postalCode: optional(formatPostalCode(data.get('postalCode'))),
      address: optional(data.get('address')),
      website: optional(data.get('website')),
      supportRequested: clean(data.get('supportRequested')),
      productsInterestedIn: data.getAll('productsInterestedIn').map(clean).filter(Boolean),
      notes: optional(data.get('notes')),
      consentToContact: data.get('consentToContact') === 'on',
      marketingOptIn: data.get('marketingOptIn') === 'on',
      sourcePage: window.location.href,
      referrer: optional(document.referrer),
      utmSource: optional(params.get('utm_source')),
      utmMedium: optional(params.get('utm_medium')),
      utmCampaign: optional(params.get('utm_campaign')),
      utmContent: optional(params.get('utm_content')),
      utmTerm: optional(params.get('utm_term')),
      turnstileToken: getTurnstileToken(),
      company_website_hp: honeypotField?.checked ? '1' : ''
    };
  };

  const setLoading = loading => {
    submitting = loading;
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.textContent = loading ? 'Sending your inquiry…' : 'Send Trade Inquiry';
    nextButton.disabled = loading;
    backButton.disabled = loading;
  };

  const submit = async event => {
    event.preventDefault();
    if (submitting || !validateCurrentStep()) return;

    if (!endpoint || !anonKey) {
      renderError('server_error');
      return;
    }

    setLoading(true);
    setStatus('Sending your inquiry…', 'info');
    const payload = buildPayload();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        const error = new Error(data.code || 'server_error');
        error.payload = data;
        throw error;
      }

      setStatus('');
      renderSuccess(data.result || {});
    } catch (error) {
      renderError(error?.message || 'server_error', error?.payload || {});
    } finally {
      setLoading(false);
    }
  };

  nextButton.addEventListener('click', goNext);
  backButton.addEventListener('click', goBack);
  form.addEventListener('submit', submit);

  progressItems.forEach((item, index) => item.addEventListener('click', () => {
    if (index < currentStep) {
      setStatus('');
      showStep(index);
    }
  }));

  preferredContactInputs.forEach(input => input.addEventListener('change', () => {
    if (getPreferredContactMethod() !== 'phone') clearFieldError('phone');
  }));

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => {
      if (field.name === 'postalCode') field.value = formatPostalCode(field.value);
      clearFieldError(field.name);
    });
    field.addEventListener('change', () => clearFieldError(field.name));
  });

  showStep(0, false);
})();
