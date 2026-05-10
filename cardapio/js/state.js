/**
 * state.js — Store global reativo via Pub/Sub
 *
 * Implementação minimalista do padrão Observer.
 * Sem dependências externas. ~60 linhas.
 *
 * Slices de estado disponíveis:
 *   - 'config'          → Object  — configurações do restaurante
 *   - 'menu'            → Object  — categorias, produtos, ofertas
 *   - 'cart'            → Object  — itens, total, contagem
 *   - 'activeCategory'  → string  — id da categoria ativa no nav
 *   - 'ui.loading'      → boolean — carregamento inicial
 *   - 'ui.searchQuery'  → string  — texto da busca ativa
 */

/** Estado interno — nunca acessado diretamente de fora */
const _state = {};

/** Mapa de callbacks por chave: { 'cart': [fn1, fn2], ... } */
const _subscribers = {};

/**
 * Retorna o valor atual de uma chave do estado.
 * @param {string} key - Chave do slice de estado
 * @returns {*} Valor atual
 */
export function getState(key) {
  return _state[key];
}

/**
 * Atualiza o valor de uma chave e notifica os subscribers.
 * @param {string} key   - Chave do slice de estado
 * @param {*}      value - Novo valor
 */
export function setState(key, value) {
  _state[key] = value;
  _notifySubscribers(key, value);
}

/**
 * Registra um callback para ser chamado quando o estado da chave mudar.
 * Retorna uma função de unsubscribe para limpeza (evitar memory leaks).
 *
 * @param   {string}   key - Chave do slice de estado
 * @param   {Function} cb  - Callback chamado com o novo valor
 * @returns {Function}     - Função que cancela a inscrição
 *
 * @example
 *   const unsub = subscribe('cart', (cart) => renderCart(cart));
 *   // Para cancelar: unsub();
 */
export function subscribe(key, cb) {
  // Inicializa array de subscribers para a chave se não existir
  if (!_subscribers[key]) {
    _subscribers[key] = [];
  }

  _subscribers[key].push(cb);

  // Retorna função de unsubscribe (padrão cleanup)
  return () => _unsubscribe(key, cb);
}

/**
 * Remove um callback específico de uma chave.
 * Chamado internamente pela função retornada por subscribe().
 *
 * @param {string}   key - Chave do slice de estado
 * @param {Function} cb  - Callback a remover
 */
function _unsubscribe(key, cb) {
  if (!_subscribers[key]) return;
  _subscribers[key] = _subscribers[key].filter((fn) => fn !== cb);
}

/**
 * Notifica todos os callbacks registrados para uma chave.
 * Chamado internamente por setState().
 *
 * @param {string} key   - Chave alterada
 * @param {*}      value - Novo valor
 */
function _notifySubscribers(key, value) {
  const callbacks = _subscribers[key] || [];
  callbacks.forEach((cb) => cb(value));
}
