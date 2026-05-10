/**
 * CategoryNav.js — Menu de categorias com seta direita de navegação
 * Sem inline styles — tudo controlado por classes CSS.
 */

import { Component } from "../base/Component.js";
import { getCategories } from "../../services/data.js";

export class CategoryNav extends Component {
  constructor(props = {}) {
    super(props);
    this.state = { activeId: null };
    this._updateArrow = this._updateArrow.bind(this);
  }

  render() {
    const categories = getCategories();
    const { activeId } = this.state;

    const todosBtn = `
      <button class="cat-nav__item ${activeId === null ? "cat-nav__item--active" : ""}"
        data-category-id="__todos__" aria-pressed="${activeId === null}" type="button">
        <span class="cat-nav__icon" aria-hidden="true">🍽️</span>
        Todos
      </button>`;

    const items = categories
      .map(
        (cat) => `
      <button class="cat-nav__item ${cat.id === activeId ? "cat-nav__item--active" : ""}"
        data-category-id="${cat.id}" aria-pressed="${cat.id === activeId}" type="button">
        <span class="cat-nav__icon" aria-hidden="true">${cat.icone}</span>
        ${cat.nome}
      </button>`,
      )
      .join("");

    return `
      <nav class="cat-nav" id="category-nav" aria-label="Filtrar por categoria">
        <div class="cat-nav__track">
          <button class="cat-nav__arrow cat-nav__arrow--left cat-nav__arrow--hidden" id="arrow-left"
            type="button" aria-label="Rolar para a esquerda"><i data-lucide="chevron-left" style="width: 20px; height: 20px;"></i></button>
          <div class="cat-nav__inner" id="cat-nav-inner" role="list">
            ${todosBtn}
            ${items}
          </div>
          <button class="cat-nav__arrow cat-nav__arrow--right cat-nav__arrow--hidden" id="arrow-right"
            type="button" aria-label="Rolar para a direita"><i data-lucide="chevron-right" style="width: 20px; height: 20px;"></i></button>
        </div>
      </nav>`;
  }

  afterMount() {
    const inner = this.$("#cat-nav-inner");
    const arrowRight = this.$("#arrow-right");
    const arrowLeft = this.$("#arrow-left");

    if (arrowRight) {
      this._addListener(arrowRight, "click", () =>
        inner?.scrollBy({ left: 200, behavior: "smooth" }),
      );
    }

    if (arrowLeft) {
      this._addListener(arrowLeft, "click", () =>
        inner?.scrollBy({ left: -200, behavior: "smooth" }),
      );
    }

    if (inner) {
      this._addListener(inner, "scroll", this._updateArrow, { passive: true });
      // Múltiplos checks para garantir que o layout está calculado
      setTimeout(() => this._updateArrow(), 100);
      setTimeout(() => this._updateArrow(), 300);
    }

    this._addListener(this.el, "click", (event) => {
      const btn = event.target.closest("[data-category-id]");
      if (!btn) return;

      const raw = btn.dataset.categoryId;
      const activeId = raw === "__todos__" ? null : raw;
      if (activeId === this.state.activeId) return;

      this.state.activeId = activeId;

      this.$$("[data-category-id]").forEach((b) => {
        const isActive = b.dataset.categoryId === raw;
        b.classList.toggle("cat-nav__item--active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      const inner = this.$("#cat-nav-inner");
      if (inner) {
        const scrollTarget =
          btn.offsetLeft - inner.offsetWidth / 2 + btn.offsetWidth / 2;
        inner.scrollTo({ left: scrollTarget, behavior: "smooth" });
      }

      this.emit("category:filter", activeId);
    });
  }

  _updateArrow() {
    const inner = this.$("#cat-nav-inner");
    const arrowRight = this.$("#arrow-right");
    const arrowLeft = this.$("#arrow-left");
    if (!inner || !arrowRight || !arrowLeft) return;

    const scrollLeft = Math.max(0, inner.scrollLeft);
    const scrollWidth = inner.scrollWidth;
    const clientWidth = inner.clientWidth;

    const hasOverflow = scrollWidth > clientWidth + 4;
    const atEnd = scrollLeft >= scrollWidth - clientWidth - 10;
    const atStart = scrollLeft <= 20;

    if (!hasOverflow || atEnd) {
      arrowRight.classList.add("cat-nav__arrow--hidden");
    } else {
      arrowRight.classList.remove("cat-nav__arrow--hidden");
    }

    if (!hasOverflow || atStart) {
      arrowLeft.classList.add("cat-nav__arrow--hidden");
    } else {
      arrowLeft.classList.remove("cat-nav__arrow--hidden");
    }
  }
}
