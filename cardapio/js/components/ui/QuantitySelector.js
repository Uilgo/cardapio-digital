/**
 * QuantitySelector.js — Controle de quantidade +/-
 *
 * Exibe botões de incremento/decremento com o valor atual.
 * Emite evento 'quantity:change' quando o valor muda.
 *
 * Props:
 *   - quantity  {number} - Valor inicial (default: 1)
 *   - min       {number} - Mínimo permitido (default: 1)
 *   - max       {number} - Máximo permitido (default: 20)
 *   - size      {string} - '' | 'lg' (default: '')
 */

import { Component }    from '../base/Component.js';
import { MIN_ITEM_QUANTITY, MAX_ITEM_QUANTITY } from '../../config/app.config.js';

export class QuantitySelector extends Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      quantity: props.quantity ?? 1,
    };
  }

  render() {
    const { min = MIN_ITEM_QUANTITY, max = MAX_ITEM_QUANTITY, size = '' } = this.props;
    const { quantity } = this.state;

    const sizeMod  = size ? `quantity-selector--${size}` : '';
    const canDec   = quantity > min;
    const canInc   = quantity < max;

    return `
      <div class="quantity-selector ${sizeMod}" role="group" aria-label="Selecionar quantidade">
        <button
          class="quantity-selector__btn"
          data-action="decrement"
          type="button"
          aria-label="Diminuir quantidade"
          ${canDec ? '' : 'disabled'}
        >−</button>

        <span
          class="quantity-selector__value"
          aria-live="polite"
          aria-label="Quantidade atual: ${quantity}"
        >${quantity}</span>

        <button
          class="quantity-selector__btn"
          data-action="increment"
          type="button"
          aria-label="Aumentar quantidade"
          ${canInc ? '' : 'disabled'}
        >+</button>
      </div>
    `;
  }

  afterMount() {
    // Event delegation — escuta cliques nos botões do container
    this._addListener(this.el, 'click', this._onButtonClick.bind(this));
  }

  // ── Handlers privados ─────────────────────────────────────────────────────

  /**
   * Trata o clique nos botões de incremento/decremento.
   * @param {MouseEvent} event
   */
  _onButtonClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn || btn.disabled) return;

    const { min = MIN_ITEM_QUANTITY, max = MAX_ITEM_QUANTITY } = this.props;
    const action = btn.dataset.action;

    let newQuantity = this.state.quantity;

    if (action === 'increment') {
      newQuantity = Math.min(newQuantity + 1, max);
    } else if (action === 'decrement') {
      newQuantity = Math.max(newQuantity - 1, min);
    }

    if (newQuantity === this.state.quantity) return;

    // Atualiza estado e re-renderiza
    this.setState({ quantity: newQuantity });

    // Notifica o componente pai
    this.emit('quantity:change', { quantity: newQuantity });
  }

  /**
   * Retorna a quantidade atual (leitura externa).
   * @returns {number}
   */
  getQuantity() {
    return this.state.quantity;
  }
}
