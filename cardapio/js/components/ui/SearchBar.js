/**
 * SearchBar.js — Barra de busca com filtros
 *
 * Contém o input de busca e ícones de ordenação/filtros que abrem um menu dropdown.
 */

import { Component } from "../base/Component.js";

export class SearchBar extends Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      activeDropdown: null, // 'sort', 'filter' ou null
      searchQuery: "",
      sort: "relevance",
      filters: {
        featured: false,
        promo: false,
      },
    };
  }

  emit(eventName, detail = null) {
    if (!this.el) return;
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    this.el.dispatchEvent(event);
    window.dispatchEvent(event);
  }

  render() {
    const { activeDropdown, searchQuery, sort, filters } = this.state;

    // Mapeamento de labels para ordenação
    const sortLabels = {
      "price-asc": "Menor preço",
      "price-desc": "Maior preço",
      "name-asc": "A-Z",
      "name-desc": "Z-A",
    };
    const currentSortLabel = sortLabels[sort] || "";

    // Lógica para label de filtros
    const activeFilters = [];
    if (filters.featured) activeFilters.push("Destaques");
    if (filters.promo) activeFilters.push("Promo");
    
    let currentFilterLabel = "";
    if (activeFilters.length === 1) {
      currentFilterLabel = activeFilters[0];
    } else if (activeFilters.length > 1) {
      currentFilterLabel = `${activeFilters.length} filtros`;
    }

    return `
      <div class="search-bar-container">
        <div class="search-bar__body">
          <!-- Input de Busca -->
          <div class="search-bar__input-wrapper">
            <input 
              type="text" 
              class="input search-bar__input" 
              id="search-input"
              placeholder="Buscar..." 
              value="${searchQuery}"
              aria-label="Buscar produtos"
            >
          </div>
 
          <!-- Botão Ordenação -->
          <div style="position: relative;">
            <button type="button" id="sort-toggle" class="search-bar__filter-btn ${activeDropdown === "sort" || sort !== "relevance" ? "search-bar__filter-btn--active" : ""}" title="Ordenar">
              <i data-lucide="arrow-up-down" style="width: 20px; height: 20px;"></i>
              ${currentSortLabel ? `<span class="search-bar__btn-label">${currentSortLabel}</span>` : ""}
            </button>

            <!-- Dropdown Ordenação -->
            <div id="sort-dropdown" class="search-dropdown" style="display: ${activeDropdown === "sort" ? "block" : "none"};">
              <button class="search-dropdown__item ${sort === "price-asc" ? "search-dropdown__item--active" : ""}" data-sort="price-asc">
                <span class="search-dropdown__icon"><i data-lucide="arrow-down-narrow-wide" style="width: 18px; height: 18px;"></i></span>
                Menor preço
              </button>
              <button class="search-dropdown__item ${sort === "price-desc" ? "search-dropdown__item--active" : ""}" data-sort="price-desc">
                <span class="search-dropdown__icon"><i data-lucide="arrow-up-wide-narrow" style="width: 18px; height: 18px;"></i></span>
                Maior preço
              </button>
              <button class="search-dropdown__item ${sort === "name-asc" ? "search-dropdown__item--active" : ""}" data-sort="name-asc">
                <span class="search-dropdown__icon"><i data-lucide="a-arrow-down" style="width: 18px; height: 18px;"></i></span>
                A-Z
              </button>
              <button class="search-dropdown__item ${sort === "name-desc" ? "search-dropdown__item--active" : ""}" data-sort="name-desc">
                <span class="search-dropdown__icon"><i data-lucide="a-arrow-up" style="width: 18px; height: 18px;"></i></span>
                Z-A
              </button>
              
              ${sort !== "relevance" ? `
                <div class="search-dropdown__divider"></div>
                <button class="search-dropdown__item search-dropdown__item--clear" id="clear-sort">
                  <span class="search-dropdown__icon"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></span>
                  Limpar Ordenação
                </button>
              ` : ""}
            </div>
          </div>

          <!-- Botão Filtro -->
          <div style="position: relative;">
            <button type="button" id="filter-toggle" class="search-bar__filter-btn ${activeDropdown === "filter" || currentFilterLabel ? "search-bar__filter-btn--active" : ""}" title="Filtrar">
              <i data-lucide="filter" style="width: 20px; height: 20px;"></i>
              ${currentFilterLabel ? `<span class="search-bar__btn-label">${currentFilterLabel}</span>` : ""}
            </button>

            <!-- Dropdown Filtro -->
            <div id="filter-dropdown" class="search-dropdown" style="display: ${activeDropdown === "filter" ? "block" : "none"};">
              <button class="search-dropdown__item ${filters.featured ? "search-dropdown__item--selected" : ""}" data-filter="featured">
                <span class="search-dropdown__icon"><i data-lucide="star" style="width: 18px; height: 18px;"></i></span>
                <span class="search-dropdown__checkbox"></span>
                Destaques
              </button>
              <button class="search-dropdown__item ${filters.promo ? "search-dropdown__item--selected" : ""}" data-filter="promo">
                <span class="search-dropdown__icon"><i data-lucide="tag" style="width: 18px; height: 18px;"></i></span>
                <span class="search-dropdown__checkbox"></span>
                Em promoção
              </button>

              ${filters.featured || filters.promo ? `
                <div class="search-dropdown__divider"></div>
                <button class="search-dropdown__item search-dropdown__item--clear" id="clear-filters">
                  <span class="search-dropdown__icon"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></span>
                  Limpar Filtros
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  afterMount() {
    const sortToggle = this.$("#sort-toggle");
    const filterToggle = this.$("#filter-toggle");
    const searchInput = this.$("#search-input");

    // Toggles
    if (sortToggle) {
      this._addListener(sortToggle, "click", (e) => {
        e.stopPropagation();
        this.setState({ activeDropdown: this.state.activeDropdown === "sort" ? null : "sort" });
      });
    }

    if (filterToggle) {
      this._addListener(filterToggle, "click", (e) => {
        e.stopPropagation();
        this.setState({ activeDropdown: this.state.activeDropdown === "filter" ? null : "filter" });
      });
    }

    // Itens de Ordenação
    this.$$("[data-sort]").forEach((btn) => {
      this._addListener(btn, "click", (e) => {
        e.stopPropagation();
        const newSort = btn.dataset.sort;
        this.emit("search:sort", newSort);
        this.setState({ sort: newSort, activeDropdown: null });
      });
    });

    // Itens de Filtro
    this.$$("[data-filter]").forEach((btn) => {
      this._addListener(btn, "click", (e) => {
        e.stopPropagation();
        const filterKey = btn.dataset.filter;
        const newFilters = { ...this.state.filters, [filterKey]: !this.state.filters[filterKey] };
        this.emit("search:filter", newFilters);
        this.setState({ filters: newFilters });
      });
    });

    // Limpar Ordenação
    const clearSortBtn = this.$("#clear-sort");
    if (clearSortBtn) {
      this._addListener(clearSortBtn, "click", (e) => {
        e.stopPropagation();
        const defaultSort = "relevance";
        this.emit("search:sort", defaultSort);
        this.setState({ sort: defaultSort, activeDropdown: null });
      });
    }

    // Limpar Filtros
    const clearFiltersBtn = this.$("#clear-filters");
    if (clearFiltersBtn) {
      this._addListener(clearFiltersBtn, "click", (e) => {
        e.stopPropagation();
        const resetFilters = { featured: false, promo: false };
        this.emit("search:filter", resetFilters);
        this.setState({ filters: resetFilters, activeDropdown: null });
      });
    }

    // Busca com Debounce (simulado)
    if (searchInput) {
      this._addListener(searchInput, "input", (e) => {
        this.state.searchQuery = e.target.value;
        this.emit("search:query", this.state.searchQuery);
      });
    }

    // Fechar ao clicar fora
    this._addListener(document, "click", (e) => {
      if (this.state.activeDropdown && !this.el.contains(e.target)) {
        this.setState({ activeDropdown: null });
      }
    });
  }
}
