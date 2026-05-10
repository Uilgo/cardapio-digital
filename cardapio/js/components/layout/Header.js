/**
 * Header.js — Cabeçalho do cardápio
 * Estrutura idêntica ao cardapio-antigo/cardapio-digital
 */

import { Component } from "../base/Component.js";
import { getConfig } from "../../services/data.js";
import { escapeHtml } from "../../utils.js";

export class Header extends Component {
  constructor(props = {}) {
    super(props);
  }

  render() {
    const config = getConfig();

    // Suporta novo campo aberto + modo_funcionamento, com fallback para isOpen
    const isOpen = config?.modo_funcionamento === 'manual'
      ? (config?.aberto ?? true)
      : (config?.aberto ?? config?.isOpen ?? true);

    const name      = config?.name  ?? "Cardápio Digital";
    const descricao = config?.slogan ?? "";
    const logo      = config?.logo  ?? null;

    // ── Banner de entrega dinâmico ────────────────────────────────────────
    const cidade   = config?.city ?? '';
    const bairros  = (config?.taxas_por_localizacao ?? [])
      .filter(b => b.status === 'ativado' && !b._doc_status)
      .map(b => escapeHtml(b.nome));

    let bannerText = '';
    if (cidade && bairros.length > 0) {
      bannerText = `<strong>Entregamos em ${escapeHtml(cidade)}</strong> • Bairros: ${bairros.join(', ')}`;
    } else if (cidade) {
      bannerText = `<strong>Entregamos em ${escapeHtml(cidade)}</strong>`;
    } else if (config?.address) {
      bannerText = escapeHtml(config.address);
    }

    const logoHtml = logo
      ? `<img src="${escapeHtml(logo)}" alt="Logo de ${escapeHtml(name)}" class="menu-header__logo" id="headerLogo" loading="eager">`
      : `<div class="menu-header__logo menu-header__logo--fallback">🍽️</div>`;

    return `<div style="display:flex; flex-direction:column; gap:var(--space-2);">
        <header class="menu-header" id="main-header" role="banner" style="margin-bottom:0;">
          ${logoHtml}
          <div class="menu-header__body">
            <div class="menu-header__identity">
              <h1 class="menu-header__name" id="headerName">${escapeHtml(name)}</h1>
              ${descricao ? `<p class="menu-header__description" id="headerDescription">${escapeHtml(descricao)}</p>` : ""}
            </div>
            <div class="menu-header__badges">
              <span class="menu-header__status ${isOpen ? "menu-header__status--open" : "menu-header__status--closed"}" id="headerStatus">                <span class="menu-header__status-dot ${isOpen ? "menu-header__status-dot--pulse" : ""}" id="headerStatusDot"></span>
                <span id="headerStatusText">${isOpen ? "Aberto" : "Fechado"}</span>
              </span>
              <button class="menu-header__more-btn" id="headerMoreBtn" data-action="ver-mais" type="button" aria-label="Ver informações da loja">
                <i data-lucide="info" width="14" height="14" aria-hidden="true"></i>
                Ver Mais
              </button>
            </div>
          </div>
        </header>
        <div class="info-banner-track">
          <button class="info-banner__arrow info-banner__arrow--left info-banner__arrow--hidden" id="info-arrow-left" type="button">
            <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
          </button>
          <div class="info-banner" id="info-banner" style="margin-top:0;">
            <span aria-hidden="true">📍</span>
            <span>${bannerText}</span>
          </div>
          <button class="info-banner__arrow info-banner__arrow--right info-banner__arrow--hidden" id="info-arrow-right" type="button">
            <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>`;
  }

  afterMount() {
    this._addListener(window, "scroll", this._onScroll.bind(this), {
      passive: true,
    });

    this._addListener(this.el, "click", (e) => {
      if (e.target.closest('[data-action="ver-mais"]')) {
        this.emit("store-info:open");
      }
    });

    // Lógica das setas da barra de informações
    const inner = this.$("#info-banner");
    const arrowLeft = this.$("#info-arrow-left");
    const arrowRight = this.$("#info-arrow-right");

    if (inner && arrowLeft && arrowRight) {
      this._addListener(arrowLeft, "click", () => {
        inner.scrollBy({ left: -150, behavior: "smooth" });
      });

      this._addListener(arrowRight, "click", () => {
        inner.scrollBy({ left: 150, behavior: "smooth" });
      });

      this._addListener(inner, "scroll", () => this._updateArrows(inner, arrowLeft, arrowRight), { passive: true });
      
      // Check inicial
      setTimeout(() => this._updateArrows(inner, arrowLeft, arrowRight), 100);
      window.addEventListener("resize", () => this._updateArrows(inner, arrowLeft, arrowRight));
    }
  }

  _updateArrows(inner, arrowLeft, arrowRight) {
    if (!inner || !arrowLeft || !arrowRight) return;

    const { scrollLeft, scrollWidth, clientWidth } = inner;
    const isScrollable = scrollWidth > clientWidth;

    if (!isScrollable) {
      arrowLeft.classList.add("info-banner__arrow--hidden");
      arrowRight.classList.add("info-banner__arrow--hidden");
      return;
    }

    arrowLeft.classList.toggle("info-banner__arrow--hidden", scrollLeft <= 0);
    arrowRight.classList.toggle("info-banner__arrow--hidden", scrollLeft + clientWidth >= scrollWidth - 5);
  }

  _onScroll() {
    this.$("#main-header")?.classList.toggle(
      "menu-header--scrolled",
      window.scrollY > 8,
    );
  }
}
