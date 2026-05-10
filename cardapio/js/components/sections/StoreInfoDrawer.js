/**
 * StoreInfoDrawer.js — Drawer lateral (Desktop) com informações da loja
 */

import { Component } from "../base/Component.js";
import { getConfig } from "../../services/data.js";
import { escapeHtml } from "../../utils.js";
import { isStoreOpen } from "../../services/checkout.js";
import { renderStoreInfoContent, storeInfoAfterMount } from "./StoreInfoContent.js";

export class StoreInfoDrawer extends Component {
  constructor(props = {}) {
    super(props);
    this.state = { isOpen: false };
  }

  render() {
    const { isOpen } = this.state;
    const config = getConfig();
    if (!config) return `<div></div>`;

    return `
      <div class="drawer-host">
        <div class="overlay ${isOpen ? "overlay--visible" : ""}" data-action="close" aria-hidden="${!isOpen}"></div>
        <aside class="drawer ${isOpen ? "drawer--open" : ""}" id="store-info-drawer"
          aria-hidden="${!isOpen}" role="dialog" aria-labelledby="drawer-info-title">

          <header class="drawer__header">
            <h2 class="product-detail__title" id="drawer-info-title">Sobre o Estabelecimento</h2>
            <button class="drawer__close-btn" data-action="close" aria-label="Fechar" type="button">
              <i data-lucide="x"></i>
            </button>
          </header>

          <div class="drawer__body store-info-body">
            ${renderStoreInfoContent(config)}
          </div>

        </aside>
      </div>`;
  }

  afterMount() {
    if (window.lucide) window.lucide.createIcons({ root: this.el });

    this.$$('[data-action="close"]').forEach(el =>
      this._addListener(el, "click", () => this.close())
    );

    storeInfoAfterMount(this);
  }

  open()  { this.setState({ isOpen: true });  document.body.classList.add("modal-open"); }
  close() { this.setState({ isOpen: false }); document.body.classList.remove("modal-open"); }
}
