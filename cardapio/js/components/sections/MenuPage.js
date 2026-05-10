/**
 * MenuPage.js — Componente "Página" principal
 *
 * Orquestrador central. Renderiza Header, Nav, Ofertas, Mais Vendidos,
 * lista de categorias/produtos, carrinho e modais.
 *
 * Filtro de categoria:
 *   - activeCategory === null → mostra todas as seções (ofertas, mais vendidos, todas as categorias)
 *   - activeCategory === 'cat-X' → esconde seções especiais e mostra só a categoria selecionada
 */

import { Component } from "../base/Component.js";
import { getCategories, getProductsByCategory } from "../../services/data.js";
import { addToCart } from "../../services/cart.js";
import { isMobile, escapeHtml } from "../../utils.js";
import { MOBILE_BREAKPOINT_PX } from "../../config/app.config.js";
import { Toast } from "../ui/Toast.js";
import { getState } from "../../state.js";
import { Header } from "../layout/Header.js";
import { CategoryNav } from "../layout/CategoryNav.js";
import { SearchBar } from "../ui/SearchBar.js";
import { OffersSection } from "./OffersSection.js";
import { BestsellersSection } from "./BestsellersSection.js";
import { ProductCard } from "./ProductCard.js";
import { Cart } from "./Cart.js";
import { MobileCartBar } from "./MobileCartBar.js";
import { ProductDrawer } from "./ProductDrawer.js";
import { ProductBottomSheet } from "./ProductBottomSheet.js";
import { StoreInfoDrawer } from "./StoreInfoDrawer.js";
import { StoreInfoBottomSheet } from "./StoreInfoBottomSheet.js";

export class MenuPage extends Component {
  constructor(props = {}) {
    super(props);
    this.children = {};
    this._activeCategory = null;
    this._searchState = {
      query: "",
      sort: "relevance",
      filters: { featured: false, promo: false },
    };
  }

  render() {
    return `
      <div class="app-layout">
        <div class="app-body">
          <!-- Coluna Principal -->
          <div class="app-content">
            <div id="mount-header"></div>
            <div id="mount-category-nav"></div>
            <div id="mount-search-bar"></div>
            <div id="mount-offers"></div>
            <div id="mount-bestsellers"></div>
            <div id="mount-categories-list"></div>
          </div>
          <!-- Carrinho Desktop -->
          <div class="app-cart-column" id="mount-cart-column"></div>
        </div>
      </div>
    `;
  }

  afterMount() {
    this._mountChildren();
    this._renderCategorySections();
    this._bindEvents();
  }

  // ── Montagem dos filhos ───────────────────────────────────────────────────

  _mountChildren() {
    this.children.header = new Header();
    this.children.header.mount(this.$("#mount-header"));

    this.children.categoryNav = new CategoryNav();
    this.children.categoryNav.mount(this.$("#mount-category-nav"));

    this.children.searchBar = new SearchBar();
    this.children.searchBar.mount(this.$("#mount-search-bar"));

    this.children.offers = new OffersSection();
    this.children.offers.mount(this.$("#mount-offers"));

    this.children.bestsellers = new BestsellersSection();
    this.children.bestsellers.mount(this.$("#mount-bestsellers"));

    this.children.cartColumn = new Cart({ layout: "column" });
    this.children.cartColumn.mount(this.$("#mount-cart-column"));

    // Modais de Produto (Responsivos em tempo real)
    this.children.productDrawer = new ProductDrawer();
    this.children.productBottomSheet = new ProductBottomSheet();

    let productModalContainer = document.getElementById("mount-product-modal");
    if (!productModalContainer) {
      productModalContainer = document.createElement("div");
      productModalContainer.id = "mount-product-modal";
      document.body.appendChild(productModalContainer);
    }
    
    // Montamos ambos, a lógica de abertura decidirá qual mostrar
    const drawerContainer = document.createElement("div");
    const bottomSheetContainer = document.createElement("div");
    productModalContainer.appendChild(drawerContainer);
    productModalContainer.appendChild(bottomSheetContainer);
    
    this.children.productDrawer.mount(drawerContainer);
    this.children.productBottomSheet.mount(bottomSheetContainer);

    // Modais de Informação da Loja
    this.children.storeInfoDrawer = new StoreInfoDrawer();
    this.children.storeInfoBottomSheet = new StoreInfoBottomSheet();

    let storeInfoContainer = document.getElementById("mount-store-info-modal");
    if (!storeInfoContainer) {
      storeInfoContainer = document.createElement("div");
      storeInfoContainer.id = "mount-store-info-modal";
      document.body.appendChild(storeInfoContainer);
    }
    
    const storeDrawerContainer = document.createElement("div");
    const storeBSContainer = document.createElement("div");
    storeInfoContainer.appendChild(storeDrawerContainer);
    storeInfoContainer.appendChild(storeBSContainer);

    this.children.storeInfoDrawer.mount(storeDrawerContainer);
    this.children.storeInfoBottomSheet.mount(storeBSContainer);

    // Componentes Globais (Modais e Barra Mobile)
    this.children.cartBottomSheet = new Cart({ layout: "bottom-sheet" });
    let cartBSContainer = document.getElementById("mount-cart-bottom-sheet");
    if (!cartBSContainer) {
      cartBSContainer = document.createElement("div");
      cartBSContainer.id = "mount-cart-bottom-sheet";
      document.body.appendChild(cartBSContainer);
    }
    this.children.cartBottomSheet.mount(cartBSContainer);

    this.children.mobileCartBar = new MobileCartBar();
    const cartBarContainer = document.createElement("div");
    cartBarContainer.id = "mount-mobile-cart-bar";
    document.body.appendChild(cartBarContainer);
    this.children.mobileCartBar.mount(cartBarContainer);
  }

  // ── Renderização das seções de categoria ──────────────────────────────────

  _renderCategorySections() {
    const container = this.$("#mount-categories-list");
    if (!container) return;

    // Limpa o container antes de re-renderizar
    container.innerHTML = "";

    const { query, sort, filters } = this._searchState;
    const isSearching = !!(
      query ||
      filters.featured ||
      filters.promo ||
      sort !== "relevance"
    );

    // Obtém e ORDENA as categorias baseada no critério
    let categories = getCategories();

    // Se houver uma categoria ativa no Nav, filtra apenas ela
    if (this._activeCategory) {
      categories = categories.filter((c) => c.id === this._activeCategory);
    }

    // Ordenação das CATEGORIAS (para que 'Açaí' suba se for A-Z)
    categories = this._sortCategories(categories, sort);

    const fragment = document.createDocumentFragment();

    categories.forEach((category) => {
      let products = getProductsByCategory(category.id);

      // Aplicar Busca/Filtros/Ordenação nos produtos internos
      products = this._processProducts(products);

      if (!products.length) return;

      const section = document.createElement("section");
      section.className = "category-section";
      section.id = `category-${category.id}`;
      section.dataset.categoryId = category.id;

      section.innerHTML = `
        <header class="category-section__header">
          <h2 class="category-section__title">
            ${category.icone ? `<span class="category-section__icon">${escapeHtml(category.icone)}</span>` : ""} 
            ${escapeHtml(category.nome)}
          </h2>
          <span class="category-section__count">${products.length}</span>
        </header>
        <div class="product-grid" id="grid-${category.id}"></div>
      `;

      fragment.appendChild(section);

      const grid = section.querySelector(`#grid-${category.id}`);
      products.forEach((product) => {
        const card = new ProductCard({ product });
        const wrapper = document.createElement("div");
        card.mount(wrapper);
        grid.appendChild(wrapper.firstElementChild ?? wrapper);
      });
    });

    container.appendChild(fragment);

    // Reinicializar ícones do Lucide para os novos elementos injetados no DOM
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: "lucide-icon",
        },
      });
    }

    // Ajustar visibilidade das seções especiais
    const hideSpecials = !!(this._activeCategory || isSearching);
    const offersEl = this.$("#mount-offers");
    const bestsellersEl = this.$("#mount-bestsellers");

    if (offersEl) offersEl.style.display = hideSpecials ? "none" : "";
    if (bestsellersEl) bestsellersEl.style.display = hideSpecials ? "none" : "";
  }

  /**
   * Ordena as categorias para que o topo da página reflita o critério de busca
   */
  _sortCategories(categories, sort) {
    if (sort === "relevance")
      return [...categories].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return [...categories].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.nome.localeCompare(b.nome);
        case "name-desc":
          return b.nome.localeCompare(a.nome);
        case "price-asc":
        case "price-desc":
          // Ordena categorias pelo produto mais barato/caro dentro delas
          const minPrice = (cat) => {
            const products = getProductsByCategory(cat.id);
            if (!products.length) return Infinity;
            return Math.min(
              ...products.map((p) => {
                if (!p.variacoes || !p.variacoes.length) return 0;
                return Math.min(...p.variacoes.map((v) => v.preco || 0));
              }),
            );
          };
          return sort === "price-asc"
            ? minPrice(a) - minPrice(b)
            : minPrice(b) - minPrice(a);
        default:
          return 0;
      }
    });
  }

  _renderSearchResults() {
    // Método removido em favor da listagem por categorias normal (conforme pedido)
  }

  /**
   * Filtra e Ordena a lista de produtos baseada no estado atual
   */
  _processProducts(products) {
    const { query, sort, filters } = this._searchState;

    const getBasePrice = (p) => {
      if (!p.variacoes || p.variacoes.length === 0) return 0;
      return Math.min(...p.variacoes.map((v) => v.preco || 0));
    };

    return products
      .filter((p) => {
        // Busca por texto
        if (query && !p.nome.toLowerCase().includes(query.toLowerCase()))
          return false;

        // Filtro Destaques
        if (filters.featured && p.destaque !== true) return false;

        // Filtro Promoção (Checa flag emOferta ou objeto promocao)
        if (filters.promo) {
          const hasPromo =
            p.emOferta === true || (p.promocao && p.promocao !== null);
          if (!hasPromo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Ordenação
        const priceA = getBasePrice(a);
        const priceB = getBasePrice(b);

        switch (sort) {
          case "price-asc":
            return priceA - priceB;
          case "price-desc":
            return priceB - priceA;
          case "name-asc":
            return a.nome.localeCompare(b.nome);
          case "name-desc":
            return b.nome.localeCompare(a.nome);
          default:
            return 0;
        }
      });
  }

  // ── Filtro de categoria ───────────────────────────────────────────────────

  _applyCategoryFilter(categoryId) {
    this._activeCategory = categoryId;
    this._renderCategorySections(); // Re-renderiza para aplicar contexto de busca se houver
  }

  // ── Eventos ───────────────────────────────────────────────────────────────

  _bindEvents() {
    // Busca e Filtros - Usando this._addListener para garantir limpeza automática
    this._addListener(window, "search:query", (e) => {
      this._searchState.query = e.detail;
      this._renderCategorySections();
    });

    this._addListener(window, "search:sort", (e) => {
      this._searchState.sort = e.detail;
      this._renderCategorySections();
    });

    this._addListener(window, "search:filter", (e) => {
      this._searchState.filters = e.detail;
      this._renderCategorySections();
    });

    // Filtro de categoria pelo nav
    this.on("category:filter", (event) => {
      this._applyCategoryFilter(event.detail);
    });

    // Seleciona produto (abre modal)
    this._addListener(window, "product:select", (event) => {
      if (isMobile(MOBILE_BREAKPOINT_PX)) {
        this.children.productBottomSheet?.open(event.detail);
      } else {
        this.children.productDrawer?.open(event.detail);
      }
    });

    // Reabre modal do produto a partir do carrinho (botão "Novo")
    this._addListener(window, "product:reopen", (event) => {
      const productId = event.detail;
      const menu = getState("menu");
      const product = menu?.produtos?.find((p) => p.id === productId);
      if (product) {
        if (isMobile(MOBILE_BREAKPOINT_PX)) {
          this.children.productBottomSheet?.open(product);
        } else {
          this.children.productDrawer?.open(product);
        }
      }
    });

    // Handler unificado para adição ao carrinho
    const handleAddToCart = (event) => {
      const data = event.detail;
      // Normaliza dados (ProductCard manda o produto, Modal manda objeto completo)
      const cartItem = data.product
        ? data
        : { product: data, quantity: 1, adicionais: [], observation: "" };

      addToCart(cartItem);
      Toast.success(`${cartItem.product.nome} adicionado ao carrinho!`);
    };

    // Ouve ambos os eventos mas usa o sistema de limpeza automática
    this._addListener(window, "product:add", handleAddToCart);
    this._addListener(window, "cart:add", handleAddToCart);

    // Abre carrinho (mobile)
    this._addListener(window, "cart:open", () => {
      if (isMobile(MOBILE_BREAKPOINT_PX)) {
        this.children.cartBottomSheet?.open();
      }
    });

    // Abre modal de informações do estabelecimento (vêm do Header)
    this.children.header.on("store-info:open", () => {
      if (isMobile(MOBILE_BREAKPOINT_PX)) {
        this.children.storeInfoBottomSheet?.open();
      } else {
        this.children.storeInfoDrawer?.open();
      }
    });
  }
}
