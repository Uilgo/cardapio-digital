/**
 * Cart.js — Componente Unificado de Carrinho
 *
 * Gerencia tanto a Coluna Lateral (Desktop) quanto o Bottom Sheet (Mobile).
 * Mantém a lógica de negócio centralizada (DRY).
 */

import { Component } from "../base/Component.js";
import {
  getCart,
  removeFromCart,
  updateItemQuantity,
  clearCart,
} from "../../services/cart.js";
import { formatCurrency } from "../../services/formatter.js";
import { subscribe, getState } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import { MAX_ITEM_QUANTITY } from "../../config/app.config.js";
import { navigate } from "../../router.js";
import { APP_BASE_PATH } from "../../config/app.config.js";
import {
  calcularTaxaEntrega,
  getSelectedNeighborhood,
  setSelectedNeighborhood,
} from "../../services/checkout.js";

export class Cart extends Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      isOpen: false, // Usado apenas no modo bottom-sheet
      cart: getCart(),
      layout: props.layout || "column", // 'column' ou 'bottom-sheet'
      confirmingItemId: null, // ID do item aguardando confirmação de remoção
      isConfirmingClear: false, // Status de confirmação para limpar carrinho
    };
  }

  open() {
    if (this.state.layout === "bottom-sheet") {
      this.setState({ isOpen: true });
      document.body.classList.add("modal-open");
    }
  }

  close() {
    if (this.state.layout === "bottom-sheet") {
      this.setState({ isOpen: false });
      document.body.classList.remove("modal-open");
    }
  }

  render() {
    const { isOpen, cart, layout } = this.state;
    const { items, itemCount, total } = cart;

    const config = getState("config") ?? {};
    const tipoTaxa = config.tipo_taxa_entrega ?? 'taxa_unica';
    const bairroSelecionado = getSelectedNeighborhood();
    const { taxa: deliveryFee, label: deliveryLabel, bairroEncontrado } =
      itemCount > 0
        ? calcularTaxaEntrega(config, bairroSelecionado)
        : { taxa: 0, label: 'Grátis', bairroEncontrado: true };

    const minimumOrder = config.valor_minimo_pedido ?? config.minimumOrder ?? 0;
    const grandTotal = total + deliveryFee;

    // Bairros disponíveis para o select (apenas taxa_localizacao)
    const bairros = tipoTaxa === 'taxa_localizacao'
      ? (config.taxas_por_localizacao ?? []).filter(b => b.status === 'ativado' && b.nome && !b._doc_status)
      : [];

    const belowMinimum =
      minimumOrder > 0 && total < minimumOrder && itemCount > 0;
    const remaining = minimumOrder - total;

    const cartItemsHtml = items
      .map((item) => {
        const atMax = item.quantity >= MAX_ITEM_QUANTITY;
        const temAdicionais = item.adicionais?.length > 0;
        const podeAlterarQuantidade = !temAdicionais;

        return `
        <div class="cart-item" data-id="${item.cartItemId}">
          <!-- Linha 1: Imagem + Info -->
          <div class="cart-item__main">
            <div class="cart-item__image-container">
              ${
                item.imagem
                  ? `<img src="${item.imagem}" alt="${escapeHtml(item.nome)}" class="cart-item__image">`
                  : '<div class="cart-item__image-placeholder"><i data-lucide="image" width="20" height="20"></i></div>'
              }
            </div>
            
            <div class="cart-item__info">
              <h4 class="cart-item__name">${escapeHtml(item.nome)}</h4>
              <div class="cart-item__price-group">
                <p class="cart-item__unit-price">${formatCurrency(item.precoUnit)} cada</p>
                <div class="cart-item__total">${formatCurrency(item.totalPrice)}</div>
              </div>
            </div>
          </div>

          <!-- Rodapé do Item -->
          <div class="cart-item__footer">
            ${
              this.state.confirmingItemId === item.cartItemId
                ? `
              <div class="cart-item__confirm-overlay">
                <button type="button" class="cart-confirm-btn cart-confirm-btn--cancel" data-action="cancel-remove">
                  Cancelar
                </button>
                <button type="button" class="cart-confirm-btn cart-confirm-btn--confirm" data-action="remove" data-id="${item.cartItemId}">
                  <i data-lucide="trash-2"></i>
                  Remover
                </button>
              </div>
            `
                : `
              <div class="cart-item__actions-row">
                ${
                  podeAlterarQuantidade
                    ? `
                  <div class="cart-item__quantity">
                    <button type="button" class="cart-item__quantity-btn" data-action="decrease" data-id="${item.cartItemId}" aria-label="Diminuir" ${item.quantity <= 1 ? "disabled" : ""}>
                      <i data-lucide="minus" width="14" height="14"></i>
                    </button>
                    <span class="cart-item__quantity-value">${item.quantity}</span>
                    <button type="button" class="cart-item__quantity-btn" data-action="increase" data-id="${item.cartItemId}" aria-label="Aumentar" ${atMax ? "disabled" : ""}>
                      <i data-lucide="plus" width="14" height="14"></i>
                    </button>
                  </div>
                `
                    : `
                  <div class="cart-item__locked">
                    <div class="cart-item__locked-badge">
                      <i data-lucide="lock" width="12" height="12"></i>
                      <span>${item.quantity}x</span>
                    </div>
                  </div>
                `
                }

                ${
                  this.state.confirmingItemId !== item.cartItemId
                    ? `
                  <button type="button" class="cart-item__remove" data-action="ask-remove" data-id="${item.cartItemId}" aria-label="Remover item">
                    <i data-lucide="trash-2" width="20" height="20"></i>
                  </button>
                `
                    : ""
                }
              </div>
            `
            }
          </div>

          <!-- Adicionais -->
          ${
            temAdicionais
              ? `
            <div class="cart-item__section">
              <div class="cart-item__additions-list">
                ${item.adicionais
                  .map(
                    (a) =>
                      `<span class="cart-item__addition-badge">+ ${escapeHtml(a.nome)}</span>`,
                  )
                  .join("")}
              </div>
            </div>`
              : ""
          }

          <!-- Observações -->
          ${
            item.observation
              ? `
            <div class="cart-item__section">
              <p class="cart-item__observation-text">
                <i data-lucide="message-square" width="12" height="12"></i>
                <span>${escapeHtml(item.observation)}</span>
              </p>
            </div>`
              : ""
          }
        </div>
      `;
      })
      .join("");

    const innerContent = `
      <!-- Header -->
      <div class="${layout === "bottom-sheet" ? "bottom-sheet__header" : "cart-header"}">
        ${
          layout === "bottom-sheet"
            ? `
          <div class="cart-header__content" style="width: 100%;">
            <div class="cart-header__main" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 class="product-detail__title" style="margin-bottom: 0;">Seu Pedido</h2>
                <span class="badge" style="margin-top: 0; padding: 4px 10px;">${itemCount}</span>
              </div>
              <button class="bottom-sheet__close-btn" data-action="close" style="margin-top: 0;"><i data-lucide="x"></i></button>
            </div>
          </div>
        `
            : `
          <div class="cart-header__content">
            <div class="cart-header__icon-box">
              <i data-lucide="shopping-cart" width="20" height="20"></i>
            </div>
            <h2 class="cart-header__title">Seu Pedido</h2>
            <span class="badge" ${itemCount === 0 ? 'style="display:none"' : ""}>${itemCount}</span>
          </div>
        `
        }
      </div>

      <!-- Conteúdo -->
      <div class="${layout === "bottom-sheet" ? "bottom-sheet__body" : "cart-content"}">
        ${
          itemCount === 0
            ? `<div class="cart-empty" style="${layout === "bottom-sheet" ? "padding: 40px 0;" : ""}">
              <span class="cart-empty__icon">🛒</span>
              <p class="cart-empty__text">Seu carrinho está vazio.<br>Adicione itens do cardápio!</p>
             </div>`
            : `<div class="cart-items">${cartItemsHtml}</div>`
        }
      </div>

      <!-- Footer -->
      <div class="${layout === "bottom-sheet" ? "bottom-sheet__footer" : "cart-footer"}">
        
        <!-- 1. Detalhes Financeiros (Resumo rápido) -->
        <div class="cart-footer__financials">
           <div class="cart-footer__badge cart-footer__badge--subtotal">
              <span class="cart-footer__badge-label">SUBTOTAL</span>
              <span class="cart-footer__badge-value">${formatCurrency(total)}</span>
           </div>
           <div class="cart-footer__badge cart-footer__badge--delivery">
              <span class="cart-footer__badge-label">ENTREGA</span>
              <span class="cart-footer__badge-value ${deliveryFee === 0 && bairroEncontrado ? "cart-footer__badge-value--free" : ""}">
                ${deliveryLabel === 'Grátis'
                  ? 'Grátis'
                  : deliveryLabel === 'Selecione o bairro'
                    ? `<span class="cart-footer__badge-value--hint">Selecione</span>`
                    : deliveryLabel === 'Bairro não atendido'
                      ? `<span class="cart-footer__badge-value--hint">Não atendido</span>`
                      : deliveryLabel === 'A calcular'
                        ? `<span class="cart-footer__badge-value--hint">A calcular</span>`
                        : formatCurrency(deliveryFee)
                }
              </span>
           </div>
        </div>

        ${tipoTaxa === 'taxa_localizacao' && itemCount > 0 ? `
        <!-- Select customizado de bairro -->
        <div class="nbhd-select" data-nbhd-select>
          <button type="button" class="nbhd-select__trigger" data-action="toggle-neighborhood-dropdown" aria-haspopup="listbox" aria-expanded="false">
            <span class="nbhd-select__trigger-left">
              <i data-lucide="map-pin" width="14" height="14"></i>
              <span class="nbhd-select__trigger-text">
                ${bairroSelecionado
                  ? escapeHtml(bairroSelecionado)
                  : '<span class="nbhd-select__placeholder">Selecione seu bairro...</span>'
                }
              </span>
            </span>
            <span class="nbhd-select__trigger-right">
              ${bairroSelecionado ? `
                <span class="nbhd-select__trigger-taxa ${deliveryFee === 0 ? 'nbhd-select__trigger-taxa--free' : ''}">
                  ${deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee)}
                </span>
              ` : ''}
              <i data-lucide="chevron-down" width="14" height="14" class="nbhd-select__chevron"></i>
            </span>
          </button>
          <div class="nbhd-select__dropdown" role="listbox" aria-label="Selecione o bairro">
            <div class="nbhd-select__dropdown-inner">
              ${bairros.map(b => `
                <button type="button"
                  class="nbhd-select__option ${bairroSelecionado === b.nome ? 'nbhd-select__option--selected' : ''}"
                  data-action="select-neighborhood"
                  data-value="${escapeHtml(b.nome)}"
                  role="option"
                  aria-selected="${bairroSelecionado === b.nome}">
                  <span class="nbhd-select__option-name">${escapeHtml(b.nome)}</span>
                  <span class="nbhd-select__option-taxa ${b.taxa_valor === 0 ? 'nbhd-select__option-taxa--free' : ''}">
                    ${b.taxa_valor === 0 ? 'Grátis' : formatCurrency(b.taxa_valor)}
                  </span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}

        <!-- 2. Total do Pedido -->
        <div class="cart-footer__total-row">
          <div class="cart-footer__total-info">
            <div class="cart-footer__total-icon">
              <i data-lucide="shopping-bag" width="20" height="20"></i>
            </div>
            <div class="cart-footer__total-stack">
              <span class="cart-footer__total-label">TOTAL DO</span>
              <span class="cart-footer__total-label">PEDIDO</span>
            </div>
          </div>
          <p class="cart-footer__total-value">${formatCurrency(grandTotal)}</p>
        </div>

        ${
          belowMinimum
            ? `
          <div class="cart-footer__minimum-warning">
            <i data-lucide="alert-circle"></i>
            <span>Faltam ${formatCurrency(remaining)} para o pedido mínimo</span>
          </div>`
            : ""
        }

        <!-- 3. Ações -->
        <div class="cart-footer__actions">
          ${
            this.state.isConfirmingClear
              ? `
            <div class="cart-confirm-clear-overlay">
              <button type="button" class="cart-confirm-btn cart-confirm-btn--cancel" data-action="cancel-clear">
                Cancelar
              </button>
              <button type="button" class="cart-confirm-btn cart-confirm-btn--confirm" data-action="clear">
                <i data-lucide="alert-triangle"></i>
                Limpar Carrinho
              </button>
            </div>
          `
              : `
            <div class="cart-actions-group">
              <button type="button" class="btn btn--primary cart-checkout-btn" 
                data-action="checkout"
                ${itemCount === 0 || belowMinimum ? "disabled" : ""}>
                <i data-lucide="shopping-cart"></i>
                <span>Finalizar</span>
              </button>
              
              <button type="button" class="cart-clear-btn" data-action="ask-clear">
                <i data-lucide="trash-2"></i>
                <span>Limpar</span>
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    if (layout === "bottom-sheet") {
      return `
        <div class="drawer-host">
          <div class="overlay ${isOpen ? "overlay--visible" : ""}" data-action="close" aria-hidden="${!isOpen}"></div>
          <div class="bottom-sheet ${isOpen ? "bottom-sheet--open" : ""}" id="cart-bottom-sheet" aria-hidden="${!isOpen}" role="dialog">
            <div class="bottom-sheet__handle" data-action="close"></div>
            ${innerContent}
          </div>
        </div>
      `;
    }

    return `
      <aside class="cart-column" aria-label="Carrinho de compras">
        ${innerContent}
      </aside>
    `;
  }

  afterMount() {
    if (window.lucide) {
      window.lucide.createIcons({
        root: this.el,
        attrs: { class: "lucide-icon" },
      });
    }

    const unsub = subscribe("cart", (newCart) => {
      this.setState({ cart: newCart });
    });
    this._addSubscription(unsub);

    this._addListener(this.el, "click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const item = this.state.cart.items.find((i) => i.cartItemId === id);

      switch (action) {
        case "close":
          this.close();
          break;
        case "increase":
        case "decrease":
          // Resetar estados de confirmação ao alterar quantidade
          this.setState({ confirmingItemId: null, isConfirmingClear: false });
          if (action === "increase" && item && item.quantity < MAX_ITEM_QUANTITY) {
            updateItemQuantity(id, item.quantity + 1);
          } else if (action === "decrease" && item) {
            updateItemQuantity(id, item.quantity - 1);
          }
          break;
        case "ask-remove":
          this.setState({ confirmingItemId: id, isConfirmingClear: false });
          break;
        case "cancel-remove":
          this.setState({ confirmingItemId: null });
          break;
        case "remove":
          this.setState({ confirmingItemId: null });
          removeFromCart(id);
          break;
        case "ask-clear":
          this.setState({ isConfirmingClear: true, confirmingItemId: null });
          break;
        case "cancel-clear":
          this.setState({ isConfirmingClear: false });
          break;
        case "clear":
          this.setState({ isConfirmingClear: false });
          clearCart();
          break;
        case "add-new":
          window.dispatchEvent(
            new CustomEvent("product:reopen", {
              detail: btn.dataset.productId,
            }),
          );
          if (this.state.layout === "bottom-sheet") this.close();
          break;
        case "checkout":
          this._handleCheckout();
          break;
      }
    });

    // Select customizado de bairro
    const nbhdTrigger = this.$('[data-action="toggle-neighborhood-dropdown"]');
    if (nbhdTrigger) {
      this._addListener(nbhdTrigger, 'click', (e) => {
        e.stopPropagation();
        const select = nbhdTrigger.closest('[data-nbhd-select]');
        const dropdown = select.querySelector('.nbhd-select__dropdown');
        const isOpen = select.classList.contains('nbhd-select--open');

        // Fecha todos os outros selects abertos
        this.$$('[data-nbhd-select]').forEach(s => s.classList.remove('nbhd-select--open', 'nbhd-select--up', 'nbhd-select--down'));

        if (!isOpen) {
          // Detecta espaço disponível abaixo e acima
          const triggerRect = nbhdTrigger.getBoundingClientRect();
          const dropdownHeight = Math.min(dropdown.scrollHeight || 220, 220);
          const spaceBelow = window.innerHeight - triggerRect.bottom;
          const spaceAbove = triggerRect.top;

          const openUp = spaceBelow < dropdownHeight + 16 && spaceAbove > spaceBelow;

          select.classList.add('nbhd-select--open', openUp ? 'nbhd-select--up' : 'nbhd-select--down');
          dropdown.classList.toggle('nbhd-select__dropdown--up', openUp);
          dropdown.classList.toggle('nbhd-select__dropdown--down', !openUp);
          nbhdTrigger.setAttribute('aria-expanded', 'true');
        } else {
          nbhdTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Fechar ao clicar fora
    this._addListener(document, 'click', () => {
      this.$$('[data-nbhd-select]').forEach(s => s.classList.remove('nbhd-select--open'));
      const trigger = this.$('[data-action="toggle-neighborhood-dropdown"]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });

    // Selecionar bairro
    this.$$('[data-action="select-neighborhood"]').forEach(btn => {
      this._addListener(btn, 'click', (e) => {
        e.stopPropagation();
        const value = btn.dataset.value;
        setSelectedNeighborhood(value);
        this.setState({});
      });
    });

    if (this.state.layout === "bottom-sheet") {
      this._setupSwipe();
    }
  }

  _setupSwipe() {
    const sheet = this.$("#cart-bottom-sheet");
    const handle = this.$(".bottom-sheet__handle");
    if (!sheet || !handle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      sheet.style.transition = "none";
      isDragging = true;
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        if (e.cancelable) e.preventDefault(); // Impede a rolagem da página por trás
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;

      sheet.style.transition = ""; // Restaura transição CSS

      if (deltaY > 100) {
        this.close();
      } else {
        sheet.style.transform = ""; // Volta ao normal
      }

      // Limpa valores
      startY = 0;
      currentY = 0;
    };

    // Adiciona ao handle e ao header para facilitar o gesto
    const triggerArea = this.$(".bottom-sheet__header");
    [handle, triggerArea].forEach((el) => {
      if (!el) return;
      this._addListener(el, "touchstart", onTouchStart, { passive: true });
      this._addListener(el, "touchmove", onTouchMove, { passive: false }); // Precisamos de false para preventDefault()
      this._addListener(el, "touchend", onTouchEnd);
    });
  }

  _handleCheckout() {
    navigate(`${APP_BASE_PATH}/checkout`);
    if (this.state.layout === "bottom-sheet") this.close();
  }
}
