/**
 * Toast.js — Sistema de notificações premium
 *
 * Gerencia a exibição de toasts elegantes e modernos.
 * Singleton: apenas um container de toasts é criado na página.
 * Usa Lucide Icons e animações suaves.
 */

import { TOAST_DURATION_MS } from '../../config/app.config.js';

/** Container singleton dos toasts */
let _container = null;

/** Mapeamento de tipos para ícones Lucide */
const TOAST_CONFIG = {
  success: { icon: 'check-circle', class: 'toast--success' },
  error:   { icon: 'alert-circle', class: 'toast--error' },
  warning: { icon: 'alert-triangle', class: 'toast--warning' },
  info:    { icon: 'info',           class: 'toast--info' },
  default: { icon: 'bell',           class: 'toast--default' },
};

export class Toast {
  /**
   * Exibe um toast na tela.
   *
   * @param {string} message  - Mensagem a exibir
   * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Tempo em ms antes de sumir (default: TOAST_DURATION_MS)
   */
  static show(message, type = 'default', duration = TOAST_DURATION_MS) {
    const container = Toast._getOrCreateContainer();
    const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.default;
    
    const toastEl = Toast._createToastElement(message, config);
    container.appendChild(toastEl);

    // Inicializa ícone Lucide para o novo toast
    if (window.lucide) {
      window.lucide.createIcons({
        root: toastEl,
        attrs: { class: 'toast__icon-svg' }
      });
    }

    // Remove após a duração com animação de saída
    const removeTimer = setTimeout(() => Toast._dismiss(toastEl), duration);

    // Permite fechar manualmente ao clicar
    toastEl.addEventListener('click', () => {
      clearTimeout(removeTimer);
      Toast._dismiss(toastEl);
    });
  }

  /** Atalhos semânticos */
  static success(message, duration) { Toast.show(message, 'success', duration); }
  static error(message, duration)   { Toast.show(message, 'error',   duration); }
  static warning(message, duration) { Toast.show(message, 'warning', duration); }
  static info(message, duration)    { Toast.show(message, 'info',    duration); }

  // ── Privados ────────────────────────────────────────────────────────────────

  /**
   * Retorna (ou cria) o container de toasts no DOM.
   * @returns {HTMLElement}
   */
  static _getOrCreateContainer() {
    if (_container && document.body.contains(_container)) {
      return _container;
    }

    _container = document.createElement('div');
    _container.className  = 'toast-container';
    _container.setAttribute('aria-live', 'polite');
    _container.setAttribute('aria-label', 'Notificações');
    _container.setAttribute('role',       'status');

    document.body.appendChild(_container);
    return _container;
  }

  /**
   * Cria o elemento HTML do toast.
   */
  static _createToastElement(message, config) {
    const toast = document.createElement('div');

    toast.className = `toast ${config.class}`;
    toast.setAttribute('role', 'alert');
    
    toast.innerHTML = `
      <div class="toast__content">
        <div class="toast__icon-wrapper">
          <i data-lucide="${config.icon}"></i>
        </div>
        <div class="toast__body">
          <span class="toast__message">${message}</span>
        </div>
        <button class="toast__close" aria-label="Fechar">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="toast__progress"></div>
    `;

    return toast;
  }

  /**
   * Anima a saída do toast e o remove do DOM.
   * @param {HTMLElement} toastEl
   */
  static _dismiss(toastEl) {
    if (!toastEl || !toastEl.isConnected) return;

    toastEl.classList.add('toast--exit');

    // Remove após a animação de saída terminar (definida no CSS)
    toastEl.addEventListener('animationend', (e) => {
      // Garantir que estamos ouvindo o evento de animação de saída
      if (e.animationName === 'toast-out' || toastEl.classList.contains('toast--exit')) {
        toastEl.remove();
        // Se o container estiver vazio, removemos ele também para manter o DOM limpo
        if (_container && _container.children.length === 0) {
          _container.remove();
          _container = null;
        }
      }
    }, { once: true });
    
    // Fallback caso a animação falhe por algum motivo
    setTimeout(() => {
        if (toastEl.isConnected) toastEl.remove();
    }, 400);
  }
}
