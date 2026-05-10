/**
 * OfferCard.js — Card compacto de oferta para o carrossel
 *
 * Portado de CardapioOfertaCard.vue (projeto-antigo).
 * Inclui: imagem com zoom, overlay no hover, badge de desconto animado,
 * preço original riscado, preço promocional, botão +.
 *
 * Props:
 *   - product {Object} - Objeto produto do menu (com emOferta: true)
 */

import { Component } from "../base/Component.js";
import { formatCurrency, formatDiscount } from "../../services/formatter.js";
import { getPrecoBase } from "../../services/data.js";
import { escapeHtml } from "../../utils.js";

export class OfferCard extends Component {
  render() {
    const { product } = this.props;
    const { preco, precoOriginal, temPromocao } = getPrecoBase(product);
    const discountLabel = temPromocao
      ? formatDiscount(precoOriginal, preco)
      : null;

    const discountBadge = discountLabel
      ? `<div class="oferta-card__discount-badge">
           <span>%</span> ${discountLabel}
         </div>`
      : "";

    const imagemHtml = product.imagem
      ? `<img
           class="oferta-card__img"
           src="${escapeHtml(product.imagem)}"
           alt="${escapeHtml(product.nome)}"
           loading="lazy"
           onerror="this.classList.add('oferta-card__img--hidden');this.nextElementSibling.classList.remove('oferta-card__img-fallback--hidden')"
         >
         <div class="oferta-card__img-fallback oferta-card__img-fallback--hidden" aria-hidden="true"><i data-lucide="utensils" style="width: 24px; height: 24px;"></i></div>`
      : `<div class="oferta-card__img-fallback" aria-hidden="true"><i data-lucide="utensils" style="width: 24px; height: 24px;"></i></div>`;

    const precoOriginalHtml = temPromocao
      ? `<span class="oferta-card__price-original">${formatCurrency(precoOriginal)}</span>`
      : "";

    return `
      <div
        class="oferta-card"
        data-product-id="${escapeHtml(product.id)}"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(product.nome)}: ${formatCurrency(preco)}"
      >
        <!-- Imagem com zoom e overlay -->
        <div class="oferta-card__image-wrapper">
          ${imagemHtml}
          ${discountBadge}
          <div class="oferta-card__overlay" aria-hidden="true"></div>
        </div>

        <!-- Informações -->
        <div class="oferta-card__body">
          <h4 class="oferta-card__name">${escapeHtml(product.nome)}</h4>

          <div class="oferta-card__footer">
            <div class="oferta-card__prices">
              ${precoOriginalHtml}
              <span class="oferta-card__price">${formatCurrency(preco)}</span>
            </div>
            <button
              type="button"
              class="oferta-card__add-btn"
              data-action="add"
              aria-label="Adicionar ${escapeHtml(product.nome)}"
            ><i data-lucide="plus" style="width: 16px; height: 16px;"></i></button>
          </div>
        </div>
      </div>`;
  }

  afterMount() {
    const { product } = this.props;

    this._addListener(this.el, "click", (event) => {
      if (event.target.closest('[data-action="add"]')) return;
      this.emit("product:select", product);
    });

    this._addListener(this.el, "keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.emit("product:select", product);
      }
    });

    const addBtn = this.$('[data-action="add"]');
    if (addBtn) {
      this._addListener(addBtn, "click", (event) => {
        event.stopPropagation();
        this.emit("product:add", product);
      });
    }
  }
}
