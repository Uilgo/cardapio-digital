/**
 * app.config.js — Constantes globais da aplicação
 *
 * Centraliza todas as configurações fixas do sistema.
 * Valores que mudam por ambiente devem usar variáveis de ambiente
 * (não disponíveis em vanilla sem bundler, então usamos constantes).
 */

/** URL base onde os dados JSON estão servidos */
export const DATA_BASE_URL = '/data';

/** Endpoints dos dados */
export const ENDPOINTS = {
  config: `${DATA_BASE_URL}/config.json`,
  menu:   `${DATA_BASE_URL}/menu.json`,
};

/** Base path da aplicação no servidor */
export const APP_BASE_PATH = '/cardapio';

/** Versão do app (para cache busting futuro) */
export const APP_VERSION = '1.0.0';

/** Tempo máximo de espera de uma requisição (ms) */
export const REQUEST_TIMEOUT_MS = 8000;

/** Tempo do debounce na busca (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Tempo de exibição padrão dos toasts (ms) */
export const TOAST_DURATION_MS = 3500;

/** Chave do localStorage para persistência do carrinho */
export const CART_STORAGE_KEY = 'cardapio:cart';

/** Número máximo de itens iguais no carrinho */
export const MAX_ITEM_QUANTITY = 20;

/** Número mínimo de itens no carrinho */
export const MIN_ITEM_QUANTITY = 1;

/** Número de skeletons exibidos durante o carregamento */
export const SKELETON_COUNT = 5;

/** Número de ofertas exibidas no carrossel */
export const MAX_OFFERS = 5;

/** Número de mais vendidos na seção */
export const MAX_BESTSELLERS = 5;

/** Breakpoint em px para separar mobile e desktop */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Mapeamento de identificadores de badge para exibição
 * Chave: id usado no JSON, Valor: { label, icon }
 */
export const BADGE_MAP = {
  'vegetariano': { label: 'Vegetariano', icon: '🌱' },
  'vegano':      { label: 'Vegano',      icon: '🌿' },
  'picante':     { label: 'Picante',     icon: '🌶️' },
  'destaque':    { label: 'Destaque',    icon: '⭐' },
  'novidade':    { label: 'Novidade',    icon: '🆕' },
  'sem-gluten':  { label: 'Sem Glúten', icon: '🌾' },
  'promo':       { label: 'Promoção',   icon: '🔥' },
};
