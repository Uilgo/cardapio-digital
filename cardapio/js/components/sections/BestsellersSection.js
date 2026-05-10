/**
 * BestsellersSection.js — Seção "Mais Vendidos"
 *
 * Exibe os produtos com destaque: true em lista horizontal.
 * Emite 'product:select' e 'product:add' propagados dos BestsellerCards.
 */

import { Component } from "../base/Component.js";
import { BestsellerCard } from "./BestsellerCard.js";
import { Skeleton } from "../ui/Skeleton.js";
import { getBestsellers } from "../../services/data.js";

export class BestsellersSection extends Component {
  render() {
    const bestsellers = getBestsellers();
    if (!bestsellers.length) return "<div></div>";

    return `
      <section class="bestsellers-section" aria-labelledby="bestsellers-title">
        <div class="bestsellers-section__header">
          <div class="section-icon-box section-icon-box--yellow" aria-hidden="true"><i data-lucide="star" style="width: 20px; height: 20px; color: white;"></i></div>
          <div>
            <h2 class="bestsellers-section__title" id="bestsellers-title">Mais Vendidos</h2>
            <p class="bestsellers-section__subtitle">Os favoritos dos clientes</p>
          </div>
        </div>
        <div class="bestsellers-section__list" id="bestsellers-list">
          ${Skeleton.productCards(Math.min(bestsellers.length, 4))}
        </div>
      </section>
    `;
  }

  afterMount() {
    const list = this.$("#bestsellers-list");
    if (!list) return;

    const bestsellers = getBestsellers();
    list.innerHTML = "";

    const fragment = document.createDocumentFragment();

    bestsellers.forEach((product) => {
      const card = new BestsellerCard({ product });
      const wrapper = document.createElement("div");
      card.mount(wrapper);

      wrapper.addEventListener("product:select", (e) =>
        this.emit("product:select", e.detail),
      );
      wrapper.addEventListener("product:add", (e) =>
        this.emit("product:add", e.detail),
      );

      fragment.appendChild(wrapper.firstElementChild ?? wrapper);
    });

    list.appendChild(fragment);
  }
}
