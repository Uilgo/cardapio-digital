/**
 * cart.js — Serviço do carrinho de compras
 *
 * Estrutura de um item no carrinho:
 * {
 *   cartItemId:  string,   // ID único dentro do carrinho
 *   productId:   string,   // ID do produto no menu
 *   variacaoId:  string,   // ID da variação selecionada
 *   nome:        string,   // Nome do produto + variação
 *   imagem:      string,
 *   precoUnit:   number,   // Preço unitário (variação com promoção + adicionais)
 *   quantity:    number,
 *   adicionais:  Array<{ id, nome, preco, grupoId? }>,
 *   observation: string,
 *   totalPrice:  number,   // precoUnit * quantity
 * }
 */

import { setState, getState } from "../state.js";
import { saveToStorage, loadFromStorage } from "./storage.js";
import { generateId } from "../utils.js";
import {
  CART_STORAGE_KEY,
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
} from "../config/app.config.js";
import {
  resolvePromocao,
  calcularPrecoComPromocao,
  getCategoryById,
} from "./data.js";

// ── Inicialização ─────────────────────────────────────────────────────────────

export function initCart() {
  const savedCart = loadFromStorage(CART_STORAGE_KEY, _emptyCart());
  setState("cart", savedCart);
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/** @returns {{ items: Array, itemCount: number, total: number }} */
export function getCart() {
  return getState("cart") ?? _emptyCart();
}

/** @returns {number} */
export function getCartItemCount() {
  return getCart().itemCount;
}

/** @returns {number} */
export function getCartTotal() {
  return getCart().total;
}

// ── Mutações ──────────────────────────────────────────────────────────────────

/**
 * Adiciona um produto ao carrinho.
 * Se o mesmo produto+variação+adicionais+observação já existir, incrementa a quantidade.
 *
 * @param {Object} params
 * @param {Object} params.product     - Produto do menu (estrutura nova)
 * @param {Object} params.variacao    - Variação selecionada (ou null para a primeira ativa)
 * @param {number} params.quantity    - Quantidade
 * @param {Array}  params.adicionais  - Adicionais selecionados [{ id, nome, preco }]
 * @param {string} params.observation - Observação do cliente
 */
export function addToCart({
  product,
  variacao = null,
  quantity = 1,
  adicionais = [],
  observation = "",
}) {
  const cart = getCart();

  // Resolve variação — usa a primeira ativa se não informada
  const variacaoResolvida =
    variacao ?? product.variacoes?.find((v) => v.ativo) ?? null;

  if (!variacaoResolvida) {
    console.warn("[cart] Produto sem variação ativa:", product.id);
    return;
  }

  // Calcula preço da variação com promoção resolvida
  const categoria = getCategoryById(product.categoriaId);
  const promocao = resolvePromocao(variacaoResolvida, product, categoria);
  const precoVariacao = calcularPrecoComPromocao(
    variacaoResolvida.preco,
    promocao,
  );

  // Preço unitário = variação (com promoção) + soma dos adicionais
  const totalAdicionais = adicionais.reduce(
    (sum, a) => sum + (a.preco ?? 0),
    0,
  );
  const precoUnit = precoVariacao + totalAdicionais;

  // Nome exibido no carrinho: "Pizza Calabresa — Média"
  const nomeExibido =
    product.variacoes?.length > 1
      ? `${product.nome} — ${variacaoResolvida.nome}`
      : product.nome;

  // Verifica se já existe item idêntico
  const existingIndex = _findExistingItemIndex(
    cart.items,
    product.id,
    variacaoResolvida.id,
    adicionais,
    observation,
  );

  if (existingIndex !== -1) {
    const existing = cart.items[existingIndex];
    const newQuantity = Math.min(
      existing.quantity + quantity,
      MAX_ITEM_QUANTITY,
    );
    cart.items[existingIndex] = _buildItem({
      ...existing,
      quantity: newQuantity,
      precoUnit,
    });
  } else {
    cart.items.push(
      _buildItem({
        cartItemId: generateId(),
        productId: product.id,
        variacaoId: variacaoResolvida.id,
        nome: nomeExibido,
        imagem: product.imagem,
        precoUnit,
        quantity,
        adicionais,
        observation,
      }),
    );
  }

  _commitCart(cart);
}

/**
 * Remove um item do carrinho pelo cartItemId.
 * @param {string} cartItemId
 */
export function removeFromCart(cartItemId) {
  const cart = getCart();
  cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
  _commitCart(cart);
}

/**
 * Atualiza a quantidade de um item. Se chegar a 0, remove.
 * @param {string} cartItemId
 * @param {number} newQuantity
 */
export function updateItemQuantity(cartItemId, newQuantity) {
  if (newQuantity < MIN_ITEM_QUANTITY) {
    removeFromCart(cartItemId);
    return;
  }

  const cart = getCart();
  const itemIndex = cart.items.findIndex(
    (item) => item.cartItemId === cartItemId,
  );
  if (itemIndex === -1) return;

  const item = cart.items[itemIndex];
  cart.items[itemIndex] = _buildItem({
    ...item,
    quantity: Math.min(newQuantity, MAX_ITEM_QUANTITY),
  });

  _commitCart(cart);
}

/** Esvazia o carrinho. */
export function clearCart() {
  _commitCart(_emptyCart());
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function _emptyCart() {
  return { items: [], itemCount: 0, total: 0 };
}

function _buildItem(data) {
  return { ...data, totalPrice: data.precoUnit * data.quantity };
}

function _commitCart(cart) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const updatedCart = { ...cart, itemCount, total };

  setState("cart", updatedCart);
  saveToStorage(CART_STORAGE_KEY, updatedCart);
}

function _findExistingItemIndex(
  items,
  productId,
  variacaoId,
  adicionais,
  observation,
) {
  return items.findIndex((item) => {
    if (item.productId !== productId) return false;
    if (item.variacaoId !== variacaoId) return false;
    if (item.observation !== observation) return false;

    const existingIds = item.adicionais
      .map((a) => a.id)
      .sort()
      .join(",");
    const newIds = adicionais
      .map((a) => a.id)
      .sort()
      .join(",");
    return existingIds === newIds;
  });
}
