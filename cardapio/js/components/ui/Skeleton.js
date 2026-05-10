/**
 * Skeleton.js — Placeholders animados durante o carregamento
 *
 * Funções estáticas para renderizar skeletons de diferentes shapes.
 * Não precisa ser instanciado — use diretamente como helper de HTML.
 *
 * Uso:
 *   container.innerHTML = Skeleton.productCards(5);
 *   container.innerHTML = Skeleton.offerCards(3);
 */

import { SKELETON_COUNT } from '../../config/app.config.js';

export class Skeleton {
  /**
   * Gera N skeletons de card de produto (layout horizontal).
   *
   * @param   {number} count - Número de cards (default: SKELETON_COUNT)
   * @returns {string}       - HTML dos cards skeleton
   */
  static productCards(count = SKELETON_COUNT) {
    return Array.from({ length: count }, () => `
      <div class="product-card product-card--skeleton" aria-hidden="true">
        <div class="skeleton skeleton--image"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text-short"></div>
          <div class="skeleton skeleton--price"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Gera N skeletons de card de oferta (carrossel).
   *
   * @param   {number} count - Número de cards (default: 3)
   * @returns {string}
   */
  static offerCards(count = 3) {
    return Array.from({ length: count }, () => `
      <div class="offer-card offer-card--skeleton" aria-hidden="true">
        <div class="skeleton skeleton--offer-image" style="height:140px;width:100%;border-radius:0;"></div>
        <div class="skeleton-offer-body">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--text-short"></div>
          <div class="skeleton skeleton--price"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Gera skeleton do cabeçalho de seção (título + contador).
   * @returns {string}
   */
  static sectionHeader() {
    return `
      <div class="section-header--skeleton" aria-hidden="true">
        <div class="skeleton skeleton--section-title"></div>
        <div class="skeleton skeleton--section-count"></div>
      </div>
    `;
  }

  /**
   * Gera skeleton de um item do carrinho.
   * @returns {string}
   */
  static cartItem() {
    return `
      <div class="cart-item" aria-hidden="true" style="opacity:0.6;">
        <div class="skeleton" style="width:56px;height:56px;border-radius:var(--radius-md);flex-shrink:0;"></div>
        <div class="skeleton-body" style="gap:var(--space-2);">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--text-short"></div>
        </div>
      </div>
    `;
  }
}
