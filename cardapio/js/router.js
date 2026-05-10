/**
 * router.js — Roteamento SPA via History API
 *
 * Dois princípios:
 *   1. Usa pushState para navegar sem recarregar a página
 *   2. Intercepta cliques em <a data-route> para evitar reload
 *
 * Uso:
 *   addRoute(/^\/$/, handler)
 *   addRoute(/^\/produto\/(.+)$/, ([, id]) => openProduct(id))
 *   initRouter()
 */

import { APP_BASE_PATH } from './config/app.config.js';

/** Lista de rotas registradas: [{ pattern: RegExp, handler: Function }] */
const _routes = [];

/**
 * Registra uma rota com seu padrão e handler.
 *
 * @param {RegExp}   pattern - Regex que casa com o path relativo
 * @param {Function} handler - Função chamada com os grupos capturados
 *
 * @example
 *   addRoute(/^\/produto\/(.+)$/, ([, id]) => openProduct(id));
 *   addRoute(/^\/$/, () => renderMenuPage());
 */
export function addRoute(pattern, handler) {
  _routes.push({ pattern, handler });
}

/**
 * Navega programaticamente para um path sem recarregar a página.
 * Usa pushState quando possível; cai para query string em servidores
 * estáticos (Live Server) que não suportam rewrite de rotas.
 *
 * @param {string} path - Path absoluto (ex: '/cardapio/checkout')
 */
export function navigate(path) {
  // Extrai o path relativo à base (ex: '/cardapio/checkout' → '/checkout')
  const relative = path.replace(new RegExp(`^${APP_BASE_PATH}`), '') || '/';

  if (relative === '/') {
    // Volta para a raiz — limpa qualquer query param
    history.pushState(null, '', APP_BASE_PATH + '/');
  } else {
    // Para sub-rotas, usa query string para compatibilidade com Live Server
    // Ex: /checkout → /cardapio/?_route=/checkout
    history.pushState(null, '', `${APP_BASE_PATH}/?_route=${encodeURIComponent(relative)}`);
  }

  _resolve();
}

/**
 * Inicializa o router:
 *   - Escuta o evento popstate (botão voltar/avançar do browser)
 *   - Resolve a rota atual no carregamento inicial
 *   - Intercepta cliques em links internos com data-route
 */
export function initRouter() {
  // Botão voltar/avançar do browser
  window.addEventListener('popstate', _resolve);

  // Intercepta cliques em <a data-route> sem reload
  document.addEventListener('click', _handleLinkClick);

  // Resolve a rota do path atual no boot
  _resolve();
}

/**
 * Retorna o path relativo à base do app.
 * Suporta tanto History API pura quanto query string (_route=).
 *
 * Ex: /cardapio/produto/123        → /produto/123
 *     /cardapio/?_route=/checkout  → /checkout
 *     /cardapio/                   → /
 *
 * @returns {string} Path relativo
 */
function _getRelativePath() {
  // Verifica se há rota via query string (modo Live Server)
  const params = new URLSearchParams(location.search);
  const queryRoute = params.get('_route');
  if (queryRoute) return queryRoute;

  // Fallback: History API pura (produção com servidor configurado)
  const fullPath = location.pathname;
  const relativePath = fullPath.replace(new RegExp(`^${APP_BASE_PATH}`), '') || '/';
  return relativePath;
}

/**
 * Encontra e executa o handler da rota que casa com o path atual.
 */
function _resolve() {
  const path = _getRelativePath();

  const matched = _routes.find((route) => route.pattern.test(path));

  if (matched) {
    const groups = path.match(matched.pattern);
    matched.handler(groups);
  }
}

/**
 * Intercepta cliques em âncoras com o atributo [data-route].
 * Previne o comportamento padrão de recarregar a página.
 *
 * @param {MouseEvent} event
 */
function _handleLinkClick(event) {
  const link = event.target.closest('a[data-route]');

  if (!link) return;

  if (event.ctrlKey || event.metaKey || event.shiftKey) return;

  event.preventDefault();

  const href = link.getAttribute('href');
  if (href) navigate(href);
}
