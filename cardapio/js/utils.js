/**
 * utils.js — Utilitários globais reutilizáveis
 *
 * Funções puras sem side effects. Não importam outros módulos do projeto.
 * Podem ser importadas por qualquer camada (services, components, pages).
 */

/**
 * Cria uma versão "debounced" de uma função.
 * A função só é executada após o delay ser concluído sem novas chamadas.
 *
 * @param   {Function} fn       - Função a ser debounced
 * @param   {number}   delay    - Delay em milissegundos
 * @returns {Function}          - Versão debounced
 *
 * @example
 *   const debouncedSearch = debounce(handleSearch, 300);
 *   inputEl.addEventListener('input', debouncedSearch);
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Cria uma versão "throttled" de uma função.
 * A função é executada no máximo uma vez por intervalo.
 *
 * @param   {Function} fn       - Função a ser throttled
 * @param   {number}   interval - Intervalo mínimo em ms entre execuções
 * @returns {Function}
 */
export function throttle(fn, interval) {
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Gera um ID único simples (não é UUID, é suficiente para uso interno).
 * Combina timestamp + random para evitar colisões.
 *
 * @returns {string} ID único (ex: 'id_1714200000000_a3f9')
 */
export function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Aguarda um número de milissegundos (promessa).
 * Útil para animações e feedbacks visuais temporários.
 *
 * @param   {number} ms - Tempo de espera em milissegundos
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifica se a tela está em modo mobile (abaixo do breakpoint).
 *
 * @param   {number} breakpointPx - Breakpoint em px (padrão: 768)
 * @returns {boolean}
 */
export function isMobile(breakpointPx = 768) {
  return window.innerWidth < breakpointPx;
}

/**
 * Escapa caracteres especiais de HTML para evitar XSS.
 * Usar sempre ao inserir dados do usuário no DOM via innerHTML.
 *
 * @param   {string} str - String a escapar
 * @returns {string}     - String escapada
 */
export function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Capitaliza a primeira letra de uma string.
 *
 * @param   {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Verifica se o elemento está visível na viewport.
 * Útil para scroll spy (CategoryNav ativa).
 *
 * @param   {HTMLElement} el      - Elemento a verificar
 * @param   {number}      offset  - Offset em px do topo (default: 120)
 * @returns {boolean}
 */
export function isElementInView(el, offset = 120) {
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  return rect.top <= offset && rect.bottom > offset;
}

/**
 * Faz scroll suave até um elemento com offset (para compensar headers fixos).
 *
 * @param {HTMLElement} el     - Elemento alvo
 * @param {number}      offset - Offset em px (default: 130 — header + nav)
 */
export function scrollToElement(el, offset = 130) {
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Adiciona e remove uma classe CSS depois de um delay.
 * Útil para animações de "bump" em badges, toasts, etc.
 *
 * @param {HTMLElement} el        - Elemento alvo
 * @param {string}      className - Classe CSS a adicionar/remover
 * @param {number}      duration  - Duração em ms (default: 400)
 */
export function animateOnce(el, className, duration = 400) {
  if (!el) return;

  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), duration);
}

/**
 * Retorna o emoji do ícone de categoria pelo id.
 * Fallback para '🍽️' se não encontrado.
 *
 * @param   {string} categoryId
 * @param   {Array}  categories - Lista de categorias do menu
 * @returns {string} Emoji
 */
export function getCategoryIcon(categoryId, categories = []) {
  const category = categories.find((c) => c.id === categoryId);
  return category?.icon ?? '🍽️';
}
