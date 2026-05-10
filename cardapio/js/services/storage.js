/**
 * storage.js — Helper para persistência no localStorage
 *
 * Wrapper com tratamento de erros para o localStorage.
 * O localStorage pode falhar em modo privado ou quando cheio.
 *
 * Não importa outros módulos do projeto (sem dependências circulares).
 */

/**
 * Salva um valor serializado (JSON) no localStorage.
 *
 * @param {string} key   - Chave de armazenamento
 * @param {*}      value - Valor a salvar (será serializado com JSON.stringify)
 * @returns {boolean}    - true se salvou com sucesso, false em caso de erro
 */
export function saveToStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    // localStorage pode estar cheio (QuotaExceededError) ou indisponível
    console.warn(`[storage] Falha ao salvar "${key}":`, error);
    return false;
  }
}

/**
 * Recupera e desserializa um valor do localStorage.
 * Retorna null se a chave não existir ou se o JSON for inválido.
 *
 * @param   {string} key          - Chave de armazenamento
 * @param   {*}      defaultValue - Valor padrão se a chave não existir
 * @returns {*}                   - Valor desserializado ou defaultValue
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);

    // Chave não existe
    if (item === null) return defaultValue;

    return JSON.parse(item);
  } catch (error) {
    console.warn(`[storage] Falha ao carregar "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Remove uma chave do localStorage.
 *
 * @param {string} key - Chave a remover
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] Falha ao remover "${key}":`, error);
  }
}

/**
 * Verifica se o localStorage está disponível no browser atual.
 * Útil antes de operações críticas de persistência.
 *
 * @returns {boolean}
 */
export function isStorageAvailable() {
  const testKey = '__storage_test__';
  try {
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
