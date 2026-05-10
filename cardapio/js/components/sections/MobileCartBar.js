/**
 * MobileCartBar.js — Barra fixa inferior do carrinho (Mobile)
 *
 * Aparece apenas no mobile (< 1024px) quando há itens no carrinho.
 * Ao clicar, emite 'cart:open' para abrir o modal de checkout.
 */

import { Component } from "../base/Component.js";
import { getCart } from "../../services/cart.js";
import { formatCurrency } from "../../services/formatter.js";
import { subscribe } from "../../state.js";

export class MobileCartBar extends Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      cart: getCart(),
    };
  }

  render() {
    const { itemCount, total } = this.state.cart;

    if (itemCount === 0) {
      return '<div class="mobile-cart-bar" aria-hidden="true"></div>';
    }

    return `
      <div class="mobile-cart-bar mobile-cart-bar--visible" role="region" aria-label="Resumo do carrinho">
        <div class="mobile-cart-bar__inner">
          <div class="mobile-cart-bar__left">
            <span class="mobile-cart-bar__badge">${itemCount}</span>
          </div>
          <div class="mobile-cart-bar__center">
            <span class="mobile-cart-bar__text">Ver carrinho</span>
          </div>
          <div class="mobile-cart-bar__right">
            <span class="mobile-cart-bar__total">${formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    `;
  }

  afterMount() {
    // Escutar atualizações do carrinho
    const unsub = subscribe("cart", (newCart) => {
      this.setState({ cart: newCart });
    });
    this._addSubscription(unsub);

    // Clicar na barra inteira abre o carrinho
    this._addListener(this.el, "click", () => {
      window.dispatchEvent(new CustomEvent("cart:open"));
    });
  }
}
