/**
 * data.js — Acesso aos dados JSON (config e menu)
 *
 * Responsabilidade: carregar, cachear e expor getters dos dados.
 * Os dados são carregados 1x por sessão e armazenados no state global.
 *
 * Fluxo:
 *   main.js → loadAllData() → setState('config') + setState('menu')
 *   Componentes → getProducts(), getCategories(), etc. (sync, de memória)
 */

import { setState, getState } from "../state.js";
import { ENDPOINTS, REQUEST_TIMEOUT_MS } from "../config/app.config.js";

// ── Fetching ──────────────────────────────────────────────────────────────────

async function _fetchJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`HTTP ${response.status} ao carregar ${url}`);
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(`Timeout ao carregar ${url} (>${timeoutMs}ms)`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Carregamento principal ────────────────────────────────────────────────────

/**
 * Carrega config.json e menu.json em paralelo e popula o state global.
 * @returns {Promise<void>}
 */
export async function loadAllData() {
  const [config, menu] = await Promise.all([
    _fetchJson(ENDPOINTS.config),
    _fetchJson(ENDPOINTS.menu),
  ]);

  setState("config", config);
  setState("menu", menu);
}

// ── Getters ───────────────────────────────────────────────────────────────────

/** @returns {Object|null} */
export function getConfig() {
  return getState("config") ?? null;
}

/**
 * Retorna categorias ativas, ordenadas pelo campo 'ordem'.
 * @returns {Array}
 */
export function getCategories() {
  const menu = getState("menu");
  if (!menu?.categorias) return [];

  return [...menu.categorias]
    .filter((c) => c.ativo)
    .sort((a, b) => a.ordem - b.ordem);
}

/**
 * Retorna uma categoria pelo id.
 * @param {string} categoriaId
 * @returns {Object|undefined}
 */
export function getCategoryById(categoriaId) {
  const menu = getState("menu");
  return menu?.categorias?.find((c) => c.id === categoriaId);
}

/**
 * Retorna todos os produtos ativos e disponíveis, ordenados por 'ordem'.
 * @returns {Array}
 */
export function getAvailableProducts() {
  const menu = getState("menu");
  if (!menu?.produtos) return [];

  return [...menu.produtos]
    .filter((p) => p.ativo && p.disponivel)
    .sort((a, b) => a.ordem - b.ordem);
}

/**
 * Retorna produtos de uma categoria específica.
 * @param {string} categoriaId
 * @returns {Array}
 */
export function getProductsByCategory(categoriaId) {
  return getAvailableProducts().filter((p) => p.categoriaId === categoriaId);
}

/**
 * Retorna todos os produtos ativos de categorias que pertencem ao mesmo grupo.
 * Ex: Se a categoria é "Pizzas Tradicionais" (Grupo "Pizzas"), retorna produtos de "Pizzas Doces", "Especiais", etc.
 * @param {string} categoriaId
 * @returns {Array}
 */
export function getProductsByGroup(categoriaId) {
  const categoriaOriginal = getCategoryById(categoriaId);
  if (!categoriaOriginal?.grupo) return getProductsByCategory(categoriaId);

  const categoriasDoGrupo = getCategories().filter((c) => c.grupo === categoriaOriginal.grupo);
  const ids = categoriasDoGrupo.map((c) => c.id);

  return getAvailableProducts().filter((p) => ids.includes(p.categoriaId));
}

/**
 * Busca um produto pelo id (independente de disponibilidade).
 * @param {string} produtoId
 * @returns {Object|undefined}
 */
export function getProductById(produtoId) {
  const menu = getState("menu");
  return menu?.produtos?.find((p) => p.id === produtoId);
}

/**
 * Retorna produtos com destaque: true (seção "Mais Vendidos").
 * @returns {Array}
 */
export function getBestsellers() {
  return getAvailableProducts().filter((p) => p.destaque);
}

/**
 * Retorna produtos em oferta (seção "Ofertas Imperdíveis").
 * Filtra por emOferta: true — a promoção é calculada na renderização via getPrecoBase().
 * @returns {Array}
 */
export function getOffers() {
  return getAvailableProducts().filter((p) => p.emOferta);
}

/**
 * Retorna um grupo de adicionais pelo id.
 * @param {string} grupoId
 * @returns {Object|undefined}
 */
export function getAdditionGroupById(grupoId) {
  const menu = getState("menu");
  return menu?.gruposAdicionais?.find((g) => g.id === grupoId);
}

/**
 * Retorna os grupos de adicionais de um produto.
 * @param {Object} produto
 * @returns {Array}
 */
export function getAdditionGroupsForProduct(produto) {
  if (!produto?.gruposAdicionaisIds?.length) return [];
  return produto.gruposAdicionaisIds
    .map((id) => getAdditionGroupById(id))
    .filter(Boolean);
}

/**
 * Filtra produtos pelo nome ou descrição (busca case-insensitive).
 * @param {string} query
 * @returns {Array}
 */
export function searchProducts(query) {
  if (!query?.trim()) return getAvailableProducts();

  const normalized = query.trim().toLowerCase();

  return getAvailableProducts().filter(
    (p) =>
      p.nome.toLowerCase().includes(normalized) ||
      p.descricao?.toLowerCase().includes(normalized),
  );
}

// ── Promoções ─────────────────────────────────────────────────────────────────

/**
 * Resolve a promoção efetiva de uma variação seguindo a hierarquia:
 *   variacao.promocao → produto.promocao → categoria.promocao
 *
 * Regras:
 *   - Campo ausente (undefined) → herda do nível acima
 *   - null explícito            → cancela herança, sem promoção
 *   - { tipo, valor }           → usa esse desconto
 *
 * @param {Object}      variacao  - Objeto de variação do produto
 * @param {Object}      produto   - Objeto do produto
 * @param {Object|null} categoria - Objeto da categoria (ou null)
 * @returns {{ tipo: string, valor: number }|null}
 */
export function resolvePromocao(variacao, produto, categoria) {
  if (variacao?.promocao !== undefined) return variacao.promocao;
  if (produto?.promocao !== undefined) return produto.promocao;
  if (categoria?.promocao !== undefined) return categoria.promocao;
  return null;
}

/**
 * Calcula o preço efetivo de uma variação após aplicar a promoção resolvida.
 *
 * @param {number} preco     - Preço original da variação
 * @param {Object|null} promocao - Resultado de resolvePromocao()
 * @returns {number}         - Preço com desconto (ou preço original se sem promoção)
 */
export function calcularPrecoComPromocao(preco, promocao) {
  if (!promocao) return preco;

  if (promocao.tipo === "porcentagem") {
    return preco * (1 - promocao.valor / 100);
  }

  if (promocao.tipo === "valor") {
    return Math.max(0, preco - promocao.valor);
  }

  return preco;
}

/**
 * Retorna o menor preço de um produto (primeira variação ativa),
 * já com a promoção resolvida aplicada.
 *
 * @param {Object} produto
 * @returns {{ preco: number, precoOriginal: number, temPromocao: boolean, promocao: Object|null }}
 */
export function getPrecoBase(produto) {
  const categoria = getCategoryById(produto.categoriaId);
  const variacoes = produto.variacoes?.filter((v) => v.ativo) ?? [];
  const variacao = variacoes[0];

  if (!variacao)
    return { preco: 0, precoOriginal: 0, temPromocao: false, promocao: null };

  const promocao = resolvePromocao(variacao, produto, categoria);
  const precoOriginal = variacao.preco;
  const preco = calcularPrecoComPromocao(precoOriginal, promocao);

  return {
    preco,
    precoOriginal,
    temPromocao: promocao !== null,
    promocao,
  };
}
