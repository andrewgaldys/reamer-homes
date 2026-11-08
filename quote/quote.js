/* Runs the step-by-step quote form. Questions and settings live in config.js. */

(() => {
  'use strict';

  const CONFIG = window.QUOTE_CONFIG;
  const STORAGE_KEY = 'reamer-quote';
  const AUTO_ADVANCE_MS = 220;
  const AD_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];

  const form = document.getElementById('quote-form');
  const result = document.getElementById('quote-result');
  const progress = document.getElementById('quote-progress');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');
  const backButton = document.getElementById('back-button');

  const steps = CONFIG.steps;
  const state = loadSaved() || { answers: {}, stepId: steps[0].id };
  let advanceTimer = null;
  let submitted = false;
  let sending = false;
  let shownEnding = CONFIG.ending;

  /* Helpers */

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === false || value === null) return;
      if (key === 'class') node.className = value;
      else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, value);
    });
    node.append(...children);
    return node;
  }

  function resolve(value) {
    return typeof value === 'function' ? value(state.answers) : value;
  }

  function loadSaved() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved && saved.answers && CONFIG.steps.some((step) => step.id === saved.stepId)) return saved;
    } catch (error) { /* Storage unavailable: start fresh. */ }
    return null;
  }

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) { /* Storage unavailable: the form still works. */ }
  }

  function clearSaved() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* Nothing to clear. */ }
  }

  function visibleSteps() {
    return steps.filter((step) => !step.showIf || step.showIf(state.answers));
  }

  function currentStep() {
    return steps.find((step) => step.id === state.stepId);
  }

  // A saved or history step can be hidden by a changed answer. Use the closest earlier step.
  function nearestVisibleId(stepId) {
    const visible = visibleSteps();
    if (visible.some((step) => step.id === stepId)) return stepId;
    const position = steps.findIndex((step) => step.id === stepId);
    const earlier = steps.slice(0, position).filter((step) => visible.includes(step));
    return earlier.length ? earlier[earlier.length - 1].id : steps[0].id;
  }

  function optionLabel(step, value) {
    const option = step.options.find((item) => item.value === value);
    return option ? option.label : value;
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  /* Building each screen */

  function buildOptions(step) {
    const inputType = step.type === 'multi' ? 'checkbox' : 'radio';
    const selected = [].concat(state.answers[step.id] || []);
    const list = el('div', { class: 'options' });

    step.options.forEach((option) => {
      const body = el('span', {}, el('span', { class: 'option-label' }, option.label));
      if (option.desc) body.append(el('span', { class: 'option-desc' }, option.desc));
      list.append(el('label', { class: 'option' },
        el('input', { type: inputType, name: step.id, value: option.value, checked: selected.includes(option.value) }),
        body,
        el('span', { class: `option-mark${step.type === 'multi' ? ' is-square' : ''}`, 'aria-hidden': 'true' }),
      ));
    });
    return list;
  }

  function buildChoiceField(field) {
    if (!state.answers[field.name] && field.default) state.answers[field.name] = field.default;
    const group = el('div', { class: 'pill-group', role: 'radiogroup', 'aria-labelledby': `label-${field.name}` });
    field.options.forEach((option) => {
      group.append(el('label', { class: 'pill' },
        el('input', { type: 'radio', name: field.name, value: option, checked: state.answers[field.name] === option }),
        el('span', {}, option),
      ));
    });
    return el('div', { class: 'field', 'data-field': field.name },
      el('span', { class: 'field-label', id: `label-${field.name}` }, field.label),
      group,
    );
  }

  function buildTextField(field) {
    const id = `field-${field.name}`;
    const label = el('label', { class: 'field-label', for: id }, field.label);
    if (!field.required) label.append(' ', el('small', {}, '(optional)'));

    const attrs = {
      id,
      name: field.name,
      autocomplete: field.autocomplete,
      inputmode: field.inputmode,
      maxlength: field.maxlength,
      required: field.required,
    };

    let control;
    if (field.type === 'textarea') {
      control = el('textarea', { ...attrs, rows: 2 });
      control.value = state.answers[field.name] || '';
    } else {
      control = el('input', { ...attrs, type: field.type || 'text' });
      control.value = state.answers[field.name] || '';
    }
    return el('div', { class: `field${field.half ? ' field-half' : ''}`, 'data-field': field.name }, label, control);
  }

  function buildFields(step) {
    const grid = el('div', { class: 'fields' });
    step.fields.forEach((field) => {
      grid.append(field.type === 'choice' ? buildChoiceField(field) : buildTextField(field));
    });
    return grid;
  }

  function buildStep(step, isLast, animate) {
    const legend = el('legend', { class: 'step-legend' },
      el('h2', { class: 'step-title', id: 'step-title', tabindex: '-1' }, resolve(step.title)),
    );
    const group = el('fieldset', { class: animate ? 'step step-animate' : 'step' }, legend);
    if (step.help) group.append(el('p', { class: 'step-help' }, resolve(step.help)));
    group.append(step.type === 'fields' ? buildFields(step) : buildOptions(step));
    group.append(el('p', { class: 'step-error', id: 'step-error', role: 'alert', hidden: true }));

    const label = step.submitLabel || (isLast ? 'Submit' : 'Continue');
    // Tap-to-pick questions move on by themselves, so their button only appears for keyboard users.
    const buttonClass = step.type === 'single' ? 'btn btn-primary keyboard-only' : 'btn btn-primary';
    group.append(el('div', { class: 'step-actions' }, el('button', { class: buttonClass, type: 'submit' }, label)));
    if (step.consent) group.append(el('p', { class: 'consent' }, step.consent));
    return group;
  }

  function render({ moveFocus = true } = {}) {
    clearTimeout(advanceTimer);
    const step = currentStep();
    const visible = visibleSteps();
    const position = visible.indexOf(step);

    form.replaceChildren(buildStep(step, position === visible.length - 1, moveFocus));
    progressText.textContent = `Step ${position + 1} of ${visible.length}`;
    progressFill.style.width = `${((position + 1) / visible.length) * 100}%`;
    backButton.hidden = position === 0;
    document.body.classList.toggle('is-started', position > 0);

    if (moveFocus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('step-title').focus({ preventScroll: true });
    }
  }

  /* Moving between screens */

  function goTo(stepId) {
    state.stepId = stepId;
    save();
    history.pushState({ stepId, depth: ((history.state && history.state.depth) || 0) + 1 }, '');
    render();
  }

  function goNext() {
    const visible = visibleSteps();
    goTo(visible[visible.indexOf(currentStep()) + 1].id);
  }

  function goBack() {
    if (history.state && history.state.depth > 0) {
      history.back();
      return;
    }
    // Reopened mid-form with no in-page history: step back without leaving the page.
    const visible = visibleSteps();
    const previous = visible[visible.indexOf(currentStep()) - 1];
    if (!previous) return;
    state.stepId = previous.id;
    save();
    history.replaceState({ stepId: previous.id, depth: 0 }, '');
    render();
  }

  /* Validation */

  function showStepError(message) {
    const error = document.getElementById('step-error');
    error.textContent = message;
    error.hidden = false;
  }

  function hideStepError() {
    const error = document.getElementById('step-error');
    if (error) error.hidden = true;
  }

  function fieldProblem(field, rawValue) {
    const value = (rawValue || '').trim();
    if (!value) {
      if (!field.required) return '';
      return field.emptyError || `Please enter your ${field.label.toLowerCase()}.`;
    }
    if (field.format === 'zip' && !/^\d{5}$/.test(value)) return 'Enter a 5-digit ZIP code.';
    if (field.format === 'phone' && value.replace(/\D/g, '').length !== 10) return 'Enter a 10-digit phone number.';
    if (field.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
    return '';
  }

  function setFieldError(field, message) {
    const wrapper = form.querySelector(`[data-field="${field.name}"]`);
    const control = wrapper.querySelector('input:not([type="radio"]), textarea');
    wrapper.classList.toggle('has-error', Boolean(message));
    const existing = wrapper.querySelector('.field-error');
    if (existing) existing.remove();
    if (control && message) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', `error-${field.name}`);
    } else if (control) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
    if (message) wrapper.append(el('p', { class: 'field-error', id: `error-${field.name}` }, message));
  }

  function validate(step) {
    if (step.type !== 'fields') {
      const answer = state.answers[step.id];
      if (answer && answer.length) return true;
      showStepError(step.required || 'Choose one to continue.');
      return false;
    }

    let firstInvalid = null;
    step.fields.forEach((field) => {
      const message = fieldProblem(field, state.answers[field.name]);
      setFieldError(field, message);
      if (message && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      form.querySelector(`[data-field="${firstInvalid.name}"] input, [data-field="${firstInvalid.name}"] textarea`).focus();
      return false;
    }
    return true;
  }

  function isComplete(step) {
    if (step.type !== 'fields') return Boolean((state.answers[step.id] || []).length);
    return step.fields.every((field) => !fieldProblem(field, state.answers[field.name]));
  }

  /* Estimate */

  function calculateEstimate() {
    const { answers } = state;
    const { pricing } = CONFIG;

    const needsReview = Object.entries(pricing.manualReview).some(([key, values]) =>
      [].concat(answers[key] || []).some((answer) => values.includes(answer)));
    if (needsReview) return null;

    const serviceStep = steps.find((step) => step.id === 'services');
    const lines = answers.services.map((service) => ({
      label: optionLabel(serviceStep, service),
      amount: pricing.services[service],
    }));
    [
      ['Home size', pricing.size[answers.size]],
      ['Number of stories', pricing.stories[answers.stories]],
      ['Roof type', pricing.roofType[answers.roofType]],
      ['Travel', pricing.county[answers.county]],
      ['Multiple inspection savings', -(pricing.bundleSavings[answers.services.length] || 0)],
    ].forEach(([label, amount]) => {
      if (amount) lines.push({ label, amount });
    });

    return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
  }

  function money(amount) {
    return `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US')}`;
  }

  /* Submitting */

  function buildPayload(ending) {
    const payload = {};
    visibleSteps().forEach((step) => {
      if (step.type === 'fields') {
        step.fields.forEach((field) => {
          const value = (state.answers[field.name] || '').trim();
          if (value) payload[field.label] = value;
        });
      } else {
        payload[step.summary] = [].concat(state.answers[step.id])
          .map((value) => optionLabel(step, value))
          .join(', ');
      }
    });

    if (ending === 'instant') {
      const estimate = calculateEstimate();
      payload['Price shown to customer'] = estimate ? money(estimate.total) : 'None, needs manual quote';
    }

    // Where the customer came from, so each lead can be traced to its ad.
    const params = new URLSearchParams(window.location.search);
    AD_PARAMS.forEach((key) => {
      if (params.get(key)) payload[key] = params.get(key);
    });
    if (document.referrer) payload.Referrer = document.referrer;
    payload.Submitted = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    return payload;
  }

  async function send() {
    if (sending) return;
    if (CONFIG.endpoint) {
      const button = form.querySelector('[type="submit"]');
      const label = button.textContent;
      sending = true;
      button.disabled = true;
      button.textContent = 'Sending…';
      hideStepError();
      try {
        const response = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildPayload(CONFIG.ending)),
        });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      } catch (error) {
        sending = false;
        button.disabled = false;
        button.textContent = label;
        showStepError(`Sorry, that didn't go through. Please try again or call ${CONFIG.phone}.`);
        return;
      }
    }
    submitted = true;
    clearSaved();
    renderResult();
  }

  /* Final screen */

  function buildPreviewNote() {
    const switcher = el('div', { class: 'preview-switch', role: 'group', 'aria-label': 'Choose which ending to preview' });
    [['email', 'Quote sent by Brian'], ['instant', 'Instant price']].forEach(([ending, label]) => {
      const button = el('button', { type: 'button', 'aria-pressed': String(shownEnding === ending) }, label);
      button.addEventListener('click', () => {
        shownEnding = ending;
        renderResult();
      });
      switcher.append(button);
    });
    return el('div', { class: 'preview-note' },
      el('strong', {}, 'Preview only. '),
      `This form isn't connected yet, so nothing was sent. To book now, call ${CONFIG.phone}.`,
      el('br'),
      switcher,
    );
  }

  function buildAnswersPreview() {
    const list = el('dl');
    Object.entries(buildPayload(shownEnding)).forEach(([label, value]) => {
      list.append(el('dt', {}, label), el('dd', {}, value));
    });
    return el('details', { class: 'answers-preview' }, el('summary', {}, 'See what Brian would receive'), list);
  }

  function buildEstimate(estimate) {
    const card = el('div', { class: 'estimate' });
    if (!CONFIG.pricing.confirmed) card.append(el('p', { class: 'estimate-sample' }, 'Sample pricing, not a real quote'));
    card.append(el('p', { class: 'estimate-total' }, money(estimate.total)));
    const lines = el('ul', { class: 'estimate-lines' });
    estimate.lines.forEach((line) => {
      lines.append(el('li', {}, el('span', {}, line.label), el('span', {}, money(line.amount))));
    });
    card.append(lines);
    return card;
  }

  function renderResult() {
    const firstName = (state.answers.firstName || '').trim();
    const estimate = shownEnding === 'instant' ? calculateEstimate() : null;
    const children = [];

    if (!CONFIG.endpoint) children.push(buildPreviewNote());

    if (estimate) {
      children.push(
        el('h2', { class: 'result-title', tabindex: '-1' }, `${firstName}, here’s your estimate`),
        buildEstimate(estimate),
        el('p', { class: 'result-lead' }, 'Brian will confirm the details with you and get you on the schedule.'),
      );
    } else {
      children.push(
        el('h2', { class: 'result-title', tabindex: '-1' }, `Thanks, ${firstName}.`),
        el('p', { class: 'result-lead' }, shownEnding === 'instant'
          ? 'Your home needs a quick look before it can be priced. Brian will follow up quickly with your quote.'
          : 'Brian has your details and will follow up quickly with your quote.'),
      );
    }

    children.push(el('div', { class: 'actions' },
      el('a', { class: 'btn btn-primary', href: CONFIG.phoneHref }, `Call ${CONFIG.phone}`),
      el('a', { class: 'btn btn-outline', href: '../' }, 'Back to Reamer Homes'),
    ));

    if (!CONFIG.endpoint) children.push(buildAnswersPreview());

    result.replaceChildren(...children);
    result.hidden = false;
    form.hidden = true;
    progress.hidden = true;
    document.body.classList.add('is-started');
    window.scrollTo({ top: 0, behavior: 'instant' });
    result.querySelector('.result-title').focus({ preventScroll: true });
  }

  /* Events */

  form.addEventListener('change', (event) => {
    const step = currentStep();
    const input = event.target;

    if (step.type === 'single') {
      state.answers[step.id] = input.value;
    } else if (step.type === 'multi') {
      const option = step.options.find((item) => item.value === input.value);
      const boxes = [...form.querySelectorAll(`input[name="${step.id}"]`)];
      if (input.checked) {
        boxes.forEach((box) => {
          const other = step.options.find((item) => item.value === box.value);
          if (box !== input && (option.exclusive || other.exclusive)) box.checked = false;
        });
      }
      state.answers[step.id] = boxes.filter((box) => box.checked).map((box) => box.value);
    } else if (input.type === 'radio') {
      state.answers[input.name] = input.value;
    }
    hideStepError();
    save();
  });

  form.addEventListener('input', (event) => {
    const step = currentStep();
    if (step.type !== 'fields' || event.target.type === 'radio') return;
    const field = step.fields.find((item) => item.name === event.target.name);
    if (field.format === 'phone') event.target.value = formatPhone(event.target.value);
    if (field.format === 'zip') event.target.value = event.target.value.replace(/\D/g, '');
    state.answers[field.name] = event.target.value;
    if (form.querySelector(`[data-field="${field.name}"]`).classList.contains('has-error')) {
      setFieldError(field, fieldProblem(field, event.target.value));
    }
    save();
  });

  // A tap on a single-choice answer moves on. Arrow keys also fire click, but on the
  // input itself, so keyboard users can move through answers without skipping ahead.
  form.addEventListener('click', (event) => {
    if (currentStep().type !== 'single') return;
    if (!event.target.closest('.option') || event.target.matches('input')) return;
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(goNext, AUTO_ADVANCE_MS);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(advanceTimer);
    const step = currentStep();
    if (!validate(step)) return;
    const visible = visibleSteps();
    if (visible.indexOf(step) < visible.length - 1) {
      goNext();
      return;
    }
    // The browser's Forward button can skip a question, so check them all before sending.
    const incomplete = visible.find((item) => !isComplete(item));
    if (incomplete) {
      goTo(incomplete.id);
      validate(incomplete);
      return;
    }
    send();
  });

  backButton.addEventListener('click', goBack);

  window.addEventListener('popstate', (event) => {
    if (submitted) {
      window.location.href = '../';
      return;
    }
    if (!event.state || !event.state.stepId) return;
    state.stepId = nearestVisibleId(event.state.stepId);
    save();
    render();
  });

  /* Start */

  state.stepId = nearestVisibleId(state.stepId);
  if (!history.state || !history.state.stepId) {
    history.replaceState({ stepId: state.stepId, depth: 0 }, '');
  }
  render({ moveFocus: false });
})();
