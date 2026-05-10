/**
 * OffersSection.js — Carrossel "Ofertas Imperdíveis"
 *
 * Renderiza produtos com emOferta: true em scroll horizontal.
 * Emite 'product:select' e 'product:add' ao interagir com os cards.
 */

import { Component } from "../base/Component.js";
import { OfferCard } from "./OfferCard.js";
import { Skeleton } from "../ui/Skeleton.js";
import { getOffers } from "../../services/data.js";

export class OffersSection extends Component {
  render() {
    const offers = getOffers();
    if (!offers.length) return "<div></div>";

    return `
      <section class="offers-section" aria-labelledby="offers-title">
        <div class="offers-section__header">
          <div class="section-icon-box section-icon-box--red" aria-hidden="true"><i data-lucide="flame" style="width: 20px; height: 20px; color: white;"></i></div>
          <div>
            <h2 class="offers-section__title" id="offers-title">Ofertas Imperdíveis</h2>
            <p class="offers-section__subtitle">Promoções por tempo limitado</p>
          </div>
        </div>
        <div class="offers-section__carousel" id="offers-carousel" role="list" aria-label="Ofertas imperdíveis">
          ${Skeleton.offerCards(Math.min(offers.length, 3))}
        </div>
      </section>
    `;
  }

  afterMount() {
    const carousel = this.$("#offers-carousel");
    if (!carousel) return;

    const offers = getOffers();
    carousel.innerHTML = "";

    const fragment = document.createDocumentFragment();

    offers.forEach((product) => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("role", "listitem");

      const card = new OfferCard({ product });
      card.mount(wrapper);

      wrapper.addEventListener("product:select", (event) => {
        this.emit("product:select", event.detail);
      });

      wrapper.addEventListener("product:add", (event) => {
        this.emit("product:add", event.detail);
      });

      fragment.appendChild(wrapper);
    });

    carousel.appendChild(fragment);
  }
}
