/**
 * Component.js — Classe base abstrata para todos os componentes de UI
 */

export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.el = null;
    this._listeners = [];
    this._subscriptions = [];
  }

  // ── API obrigatória ───────────────────────────────────────────────────────

  render() {
    throw new Error(
      `[${this.constructor.name}] O método render() é obrigatório.`,
    );
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  mount(container, position = "append") {
    if (!container) {
      console.error(
        `[${this.constructor.name}] mount() recebeu container inválido`,
      );
      return;
    }

    const html = this.render();
    const template = document.createElement("div");
    template.innerHTML = html.trim();
    this.el = template.firstElementChild;

    if (!this.el) {
      console.error(
        `[${this.constructor.name}] render() não retornou HTML válido`,
      );
      return;
    }

    if (position === "replace") {
      container.replaceWith(this.el);
    } else if (position === "prepend") {
      container.prepend(this.el);
    } else {
      container.appendChild(this.el);
    }

    if (window.lucide) {
      window.lucide.createIcons({ root: this.el });
    }

    this.afterMount();
  }

  afterMount() {}

  unmount() {
    this._listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    this._listeners = [];

    this._subscriptions.forEach((unsub) => unsub());
    this._subscriptions = [];

    this.el?.remove();
    this.el = null;
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };

    if (!this.el) return;

    const parent = this.el.parentElement;
    const next = this.el.nextSibling;

    this._listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    this._listeners = [];

    const html = this.render();
    const template = document.createElement("div");
    template.innerHTML = html.trim();
    const newEl = template.firstElementChild;

    if (!newEl || !parent) return;

    if (next) {
      parent.insertBefore(newEl, next);
    } else {
      parent.appendChild(newEl);
    }

    this.el?.remove();
    this.el = newEl;

    if (window.lucide) {
      window.lucide.createIcons({ root: this.el });
    }

    this.afterMount();
  }

  // ── Event system ──────────────────────────────────────────────────────────

  _addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  _addSubscription(unsubscribeFn) {
    this._subscriptions.push(unsubscribeFn);
  }

  emit(eventName, detail = null) {
    if (!this.el) return;
    this.el.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  on(eventName, handler) {
    if (!this.el) return;
    this._addListener(this.el, eventName, handler);
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  /** querySelector — retorna um único elemento ou null */
  $(selector) {
    return this.el?.querySelector(selector) ?? null;
  }

  /** querySelectorAll — retorna Array (não NodeList) */
  $$(selector) {
    return Array.from(this.el?.querySelectorAll(selector) ?? []);
  }
}
