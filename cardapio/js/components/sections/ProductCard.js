/**
 * ProductCard.js — Card de produto horizontal
 *
 * HTML e classes idênticos ao cardapio-antigo/render.js (createProductCard).
 * Usa as classes .product-card__* para consistência total.
 */

import { Component } from "../base/Component.js";
import { formatCurrency } from "../../services/formatter.js";
import { getPrecoBase } from "../../services/data.js";
import { escapeHtml } from "../../utils.js";

export class ProductCard extends Component {
  render() {
    const { product } = this.props;
    const { preco, precoOriginal, temPromocao } = getPrecoBase(product);
    const unavailable = !product.disponivel;

    const hasOffer = product.emOferta && temPromocao;
    const discount = hasOffer
      ? Math.round((1 - preco / precoOriginal) * 100)
      : 0;

    const badgesHtml = [
      hasOffer
        ? `<span class="product-card__badge product-card__badge--offer">🔥 Promoção</span>`
        : "",
      product.destaque
        ? `<span class="product-card__badge product-card__badge--featured">☆ Destaque</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const temMultiplasVariacoes =
      (product.variacoes?.filter((v) => v.ativo).length ?? 0) > 1;

    const pricingHtml = hasOffer
      ? `<span class="product-card__original-price">${formatCurrency(precoOriginal)}</span>
         <div class="product-card__price-group">
           ${temMultiplasVariacoes ? `<span class="product-card__from">A partir de</span>` : ""}
           <span class="product-card__price">${formatCurrency(preco)}</span>
         </div>`
      : `<div class="product-card__price-group">
           ${temMultiplasVariacoes ? `<span class="product-card__from">A partir de</span>` : ""}
           <span class="product-card__price">${formatCurrency(preco)}</span>
         </div>`;

    return `
      <article
        class="product-card ${unavailable ? "product-card--unavailable" : ""}"
        data-product-id="${escapeHtml(product.id)}"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(product.nome)}, a partir de ${formatCurrency(preco)}"
      >
        <div class="product-card__image-wrap">
          <img
            src="${escapeHtml(product.imagem ?? "")}"
            alt="${escapeHtml(product.nome)}"
            class="product-card__image"
            width="120"
            height="120"
            loading="lazy"
            onerror="this.src='https://placehold.co/110x110/dee2e6/6c757d?text=Sem+Foto'"
          >
          ${discount > 0 ? `<span class="product-card__discount">-${discount}%</span>` : ""}
        </div>
        <div class="product-card__body">
          <span class="product-card__name">${escapeHtml(product.nome)}</span>
          ${badgesHtml ? `<div class="product-card__badges">${badgesHtml}</div>` : ""}
          <p class="product-card__description">${escapeHtml(product.descricao ?? "")}</p>
          <div class="product-card__pricing">
            <div class="product-card__price-stack">
              ${pricingHtml}
            </div>
            ${
              unavailable
                ? `<span class="product-card__unavailable-label">Indisponível</span>`
                : `<button
                    class="product-card__add-btn"
                    data-action="add"
                    type="button"
                    aria-label="Adicionar ${escapeHtml(product.nome)} ao carrinho"
                  ><i data-lucide="plus" width="18" height="18" aria-hidden="true"></i></button>`
            }
          </div>
        </div>
      </article>
    `;
  }

  afterMount() {
    const { product } = this.props;

    this._addListener(this.el, "click", (event) => {
      if (event.target.closest('[data-action="add"]')) return;
      window.dispatchEvent(new CustomEvent("product:select", { detail: product }));
    });

    this._addListener(this.el, "keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("product:select", { detail: product }));
      }
    });

    const addBtn = this.$('[data-action="add"]');
    if (addBtn) {
      this._addListener(addBtn, "click", (event) => {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("product:add", { detail: product }));
      });
    }
  }
}
