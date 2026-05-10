/**
 * StoreInfoBottomSheet.js — Bottom Sheet (Mobile) com informações da loja
 */

import { Component } from "../base/Component.js";
import { getConfig } from "../../services/data.js";
import { renderStoreInfoContent, storeInfoAfterMount } from "./StoreInfoContent.js";

export class StoreInfoBottomSheet extends Component {
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
        <aside class="bottom-sheet ${isOpen ? "bottom-sheet--open" : ""}" id="store-info-bottom-sheet"
          aria-hidden="${!isOpen}" role="dialog" aria-labelledby="bs-info-title">

          <div class="bottom-sheet__handle" data-action="close"></div>

          <header class="bottom-sheet__header">
            <div class="cart-header__content" style="width:100%;">
              <div class="cart-header__main" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <h2 class="product-detail__title" style="margin-bottom:0;" id="bs-info-title">Sobre o Estabelecimento</h2>
                <button class="bottom-sheet__close-btn" data-action="close" style="margin-top:0;">
                  <i data-lucide="x"></i>
                </button>
              </div>
            </div>
          </header>

          <div class="bottom-sheet__body store-info-body">
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
    this._setupSwipe();
  }

  _setupSwipe() {
    const sheet = this.$(".bottom-sheet");
    const handle = this.$(".bottom-sheet__handle");
    if (!sheet || !handle) return;

    let startY = 0, currentY = 0, isDragging = false;

    const onStart = e => { startY = e.touches[0].clientY; sheet.style.transition = "none"; isDragging = true; };
    const onMove  = e => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const d = currentY - startY;
      if (d > 0) { if (e.cancelable) e.preventDefault(); sheet.style.transform = `translateY(${d}px)`; }
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = "";
      if (currentY - startY > 100) this.close();
      else sheet.style.transform = "";
      startY = currentY = 0;
    };

    const header = this.$(".bottom-sheet__header");
    [handle, header].forEach(el => {
      if (!el) return;
      this._addListener(el, "touchstart", onStart, { passive: true });
      this._addListener(el, "touchmove",  onMove,  { passive: false });
      this._addListener(el, "touchend",   onEnd);
    });
  }

  open()  { this.setState({ isOpen: true });  document.body.classList.add("modal-open"); }
  close() { this.setState({ isOpen: false }); document.body.classList.remove("modal-open"); }
}
