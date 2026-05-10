/**
 * CheckoutPage.js — Página de checkout com 4 etapas
 * 
 * Fluxo: Seus Dados → Entrega → Pagamento → Confirmação
 */

import { Component } from '../base/Component.js';
import { getCart } from '../../services/cart.js';
import { getConfig } from '../../services/data.js';
import { formatCurrency } from '../../services/formatter.js';
import { sendOrderViaWhatsApp } from '../../services/whatsapp.js';
import { clearCart } from '../../services/cart.js';
import { escapeHtml } from '../../utils.js';
import { navigate } from '../../router.js';
import { APP_BASE_PATH } from '../../config/app.config.js';
import { DatePicker } from '../ui/DatePicker.js';
import { TimePicker } from '../ui/TimePicker.js';
import {
  initCheckout,
  getCheckoutState,
  completeStep,
  goToStep,
  setObservation,
  clearCheckout,
  isStoreOpen,
  getNextOpenTime,
  getAvailableDays,
  getAvailableTimeSlots,
  formatSchedule,
  setSelectedNeighborhood,
  getSelectedNeighborhood,
  calcularTaxaEntrega,
} from '../../services/checkout.js';

export class CheckoutPage extends Component {
  constructor(props = {}) {
    super(props);
    
    initCheckout();
    const saved = getCheckoutState();
    
    this.state = {
      currentStep: saved.currentStep,
      completedSteps: saved.completedSteps,
      customerData: saved.customerData,
      deliveryData: saved.deliveryData,
      paymentData: saved.paymentData,
      observation: saved.observation,
      
      // Estado de validação
      errors: {},
      
      // Estado de UI
      isLoadingCEP: false,
    };
    
    this.cart = getCart();
    this.config = getConfig();
    this.isStoreOpen = isStoreOpen(this.config);
    this.nextOpenTime = getNextOpenTime(this.config);

    // Pickers de data e hora
    this._datePicker = null;
    this._timePicker = null;
  }

  /**
   * Sobrescreve setState para remontar os pickers após re-render,
   * já que eles são componentes filhos montados em containers do DOM.
   */
  setState(patch) {
    super.setState(patch);
    // Após re-render, remonta os pickers se a seção de agendamento estiver visível
    // Guarda contra loop: só remonta se não estiver já remontando
    if (this._mountingPickers) return;
    const isScheduled = this.state.deliveryData?.scheduleType === 'scheduled';
    const isStep2Active = this.state.currentStep === 2;
    if (isStep2Active && isScheduled) {
      requestAnimationFrame(() => {
        this._mountingPickers = true;
        this._mountPickers();
        this._mountingPickers = false;
      });
    }
  }

  render() {
    return `
      <div class="checkout-wrapper">
        <div class="checkout-page">
          ${this._renderHeader()}
          <div class="checkout-steps">
            ${this._renderStep1()}
            ${this._renderStep2()}
            ${this._renderStep3()}
            ${this._renderStep4()}
          </div>
        </div>
      </div>
    `;
  }

  _renderHeader() {
    return `
      <header class="checkout-header">
        <div class="checkout-header__back-row">
          <a href="${APP_BASE_PATH}/" data-route class="checkout-back-btn">
            <i data-lucide="arrow-left" width="16" height="16"></i>
            Voltar ao cardápio
          </a>
        </div>
        <div class="checkout-header__title-block">
          <h1>Finalizar Pedido</h1>
          <p>Complete seus dados para receber seu pedido</p>
        </div>
      </header>
    `;
  }

  // ── ETAPA 1: Seus Dados ────────────────────────────────────────────────────

  _renderStep1() {
    const { currentStep, completedSteps, customerData, errors } = this.state;
    const isActive = currentStep === 1;
    const isCompleted = completedSteps.includes(1);
    const isLocked = currentStep < 1;

    let stepClass = 'checkout-step';
    if (isActive) stepClass += ' checkout-step--active';
    else if (isCompleted) stepClass += ' checkout-step--completed';
    else if (isLocked) stepClass += ' checkout-step--locked';

    return `
      <div class="${stepClass}" data-step="1">
        <div class="checkout-step__header" ${isCompleted && !isActive ? 'data-action="edit-step" data-step="1"' : ''}>
          <div class="checkout-step__number">${isCompleted ? '<i data-lucide="check" width="20" height="20"></i>' : '1'}</div>
          <div class="checkout-step__title-group">
            <h2 class="checkout-step__title">Seus Dados</h2>
            ${isCompleted && !isActive ? `
              <div class="checkout-step__summary">
                ${escapeHtml(customerData.name)} • ${this._formatPhone(customerData.phone)}
              </div>
            ` : ''}
          </div>
          ${isCompleted && !isActive ? '<button class="checkout-step__edit-btn" data-action="edit-step" data-step="1">Editar</button>' : ''}
        </div>
        
        ${isActive ? `
          <div class="checkout-step__content">
            <div class="checkout-field">
              <label class="checkout-field__label checkout-field__label--required">Nome completo</label>
              <input 
                type="text" 
                class="checkout-field__input ${errors.name ? 'checkout-field__input--error' : ''}" 
                placeholder="Ex: João Silva"
                value="${escapeHtml(customerData.name)}"
                data-field="name"
                maxlength="100"
              />
              ${errors.name ? `<div class="checkout-field__error">${errors.name}</div>` : ''}
            </div>

            <div class="checkout-field">
              <label class="checkout-field__label checkout-field__label--required">Telefone/WhatsApp</label>
              <input 
                type="tel" 
                class="checkout-field__input ${errors.phone ? 'checkout-field__input--error' : ''}" 
                placeholder="(00) 00000-0000"
                value="${escapeHtml(customerData.phone)}"
                data-field="phone"
                maxlength="15"
              />
              ${errors.phone ? `<div class="checkout-field__error">${errors.phone}</div>` : ''}
            </div>

            <div class="checkout-field">
              <label class="checkout-field__label">E-mail (opcional)</label>
              <input 
                type="email" 
                class="checkout-field__input ${errors.email ? 'checkout-field__input--error' : ''}" 
                placeholder="seu@email.com"
                value="${escapeHtml(customerData.email)}"
                data-field="email"
              />
              ${errors.email ? `<div class="checkout-field__error">${errors.email}</div>` : ''}
            </div>

            <div class="checkout-field">
              <label class="checkout-field__label">CPF na nota? (opcional)</label>
              <input 
                type="text" 
                class="checkout-field__input" 
                placeholder="000.000.000-00"
                value="${escapeHtml(customerData.cpf)}"
                data-field="cpf"
                maxlength="14"
              />
            </div>

            <div class="checkout-nav">
              <button class="checkout-nav__next" data-action="next-step" data-step="1">
                Continuar
                <i data-lucide="arrow-right" width="20" height="20"></i>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── ETAPA 2: Entrega ───────────────────────────────────────────────────────

  _renderStep2() {
    const { currentStep, completedSteps, deliveryData, errors } = this.state;
    const isActive = currentStep === 2;
    const isCompleted = completedSteps.includes(2);
    const isLocked = currentStep < 2;

    let stepClass = 'checkout-step';
    if (isActive) stepClass += ' checkout-step--active';
    else if (isCompleted) stepClass += ' checkout-step--completed';
    else if (isLocked) stepClass += ' checkout-step--locked';

    const summaryText = deliveryData.type === 'delivery' 
      ? `Delivery • ${deliveryData.street}, ${deliveryData.number}`
      : 'Retirada no local';

    return `
      <div class="${stepClass}" data-step="2">
        <div class="checkout-step__header" ${isCompleted && !isActive ? 'data-action="edit-step" data-step="2"' : ''}>
          <div class="checkout-step__number">${isCompleted ? '<i data-lucide="check" width="20" height="20"></i>' : '2'}</div>
          <div class="checkout-step__title-group">
            <h2 class="checkout-step__title">Entrega</h2>
            ${isCompleted && !isActive ? `<div class="checkout-step__summary">${summaryText}</div>` : ''}
          </div>
          ${isCompleted && !isActive ? '<button class="checkout-step__edit-btn" data-action="edit-step" data-step="2">Editar</button>' : ''}
        </div>
        
        ${isActive ? `<div class="checkout-step__content">${this._renderStep2Content()}</div>` : ''}
      </div>
    `;
  }

  _renderStep2Content() {
    const { deliveryData, errors } = this.state;
    const isDelivery = deliveryData.type === 'delivery';

    return `
      <div class="delivery-toggle">
        <div class="delivery-option ${isDelivery ? 'delivery-option--selected' : ''}" data-action="select-delivery-type" data-type="delivery">
          <div class="delivery-option__icon">
            <i data-lucide="bike" width="24" height="24"></i>
          </div>
          <h3 class="delivery-option__title">Delivery</h3>
          <p class="delivery-option__subtitle">Receba em casa</p>
        </div>

        <div class="delivery-option ${!isDelivery ? 'delivery-option--selected' : ''}" data-action="select-delivery-type" data-type="pickup">
          <div class="delivery-option__icon">
            <i data-lucide="shopping-bag" width="24" height="24"></i>
          </div>
          <h3 class="delivery-option__title">Retirada</h3>
          <p class="delivery-option__subtitle">Busque no local</p>
        </div>
      </div>

      ${isDelivery ? this._renderAddressFields() : ''}
      ${this._renderScheduleSection()}

      <div class="checkout-nav">
        <button class="checkout-nav__back" data-action="prev-step">Voltar</button>
        <button class="checkout-nav__next" data-action="next-step" data-step="2">
          Continuar
          <i data-lucide="arrow-right" width="20" height="20"></i>
        </button>
      </div>
    `;
  }

  _renderAddressFields() {
    const { deliveryData, errors, isLoadingCEP } = this.state;

    return `
      <div class="checkout-field">
        <label class="checkout-field__label checkout-field__label--required">CEP</label>
        <input 
          type="text" 
          class="checkout-field__input ${errors.cep ? 'checkout-field__input--error' : ''}" 
          placeholder="00000-000"
          value="${escapeHtml(deliveryData.cep)}"
          data-field="cep"
          maxlength="9"
          ${isLoadingCEP ? 'disabled' : ''}
        />
        ${errors.cep ? `<div class="checkout-field__error">${errors.cep}</div>` : ''}
        ${isLoadingCEP ? '<div class="checkout-field__hint">Buscando endereço...</div>' : ''}
      </div>

      <div class="checkout-field">
        <label class="checkout-field__label checkout-field__label--required">Rua</label>
        <input 
          type="text" 
          class="checkout-field__input" 
          placeholder="Nome da rua"
          value="${escapeHtml(deliveryData.street)}"
          data-field="street"
        />
      </div>

      <div class="checkout-field__row">
        <div class="checkout-field">
          <label class="checkout-field__label checkout-field__label--required">Número</label>
          <input 
            type="text" 
            class="checkout-field__input" 
            placeholder="123"
            value="${escapeHtml(deliveryData.number)}"
            data-field="number"
          />
        </div>

        <div class="checkout-field">
          <label class="checkout-field__label">Complemento</label>
          <input 
            type="text" 
            class="checkout-field__input" 
            placeholder="Apto 101"
            value="${escapeHtml(deliveryData.complement)}"
            data-field="complement"
          />
        </div>
      </div>

      <div class="checkout-field">
        <label class="checkout-field__label checkout-field__label--required">Bairro</label>
        <input 
          type="text" 
          class="checkout-field__input" 
          placeholder="Nome do bairro"
          value="${escapeHtml(deliveryData.neighborhood)}"
          data-field="neighborhood"
        />
      </div>

      <div class="checkout-field__row">
        <div class="checkout-field">
          <label class="checkout-field__label checkout-field__label--required">Cidade</label>
          <input 
            type="text" 
            class="checkout-field__input" 
            placeholder="Sua cidade"
            value="${escapeHtml(deliveryData.city)}"
            data-field="city"
          />
        </div>

        <div class="checkout-field">
          <label class="checkout-field__label checkout-field__label--required">Estado</label>
          <input 
            type="text" 
            class="checkout-field__input" 
            placeholder="UF"
            value="${escapeHtml(deliveryData.state)}"
            data-field="state"
            maxlength="2"
          />
        </div>
      </div>

      <div class="checkout-field">
        <label class="checkout-field__label">Ponto de referência</label>
        <input 
          type="text" 
          class="checkout-field__input" 
          placeholder="Ex: Próximo ao mercado"
          value="${escapeHtml(deliveryData.reference)}"
          data-field="reference"
        />
      </div>
    `;
  }

  _renderScheduleSection() {
    const { deliveryData } = this.state;
    const isNow = deliveryData.scheduleType === 'now';

    return `
      <h3 style="font-size: var(--text-lg); font-weight: var(--font-bold); margin: var(--space-6) 0 var(--space-4) 0;">
        <i data-lucide="clock" width="20" height="20" style="display: inline-block; vertical-align: middle; margin-right: 8px;"></i>
        Quando você quer receber?
      </h3>

      ${!this.isStoreOpen ? `
        <div class="store-status-banner store-status-banner--closed">
          <div class="store-status-banner__icon">
            <i data-lucide="alert-circle" width="24" height="24"></i>
          </div>
          <div class="store-status-banner__text">
            <div class="store-status-banner__title">FECHADO AGORA</div>
            <div class="store-status-banner__subtitle">Abre ${this.nextOpenTime}</div>
          </div>
        </div>

        <div class="info-box">
          <div class="info-box__header">
            <i data-lucide="info" width="20" height="20" class="info-box__icon"></i>
            <h4 class="info-box__title">Sistema Inteligente Ativo:</h4>
          </div>
          <ul class="info-box__list">
            <li>📅 Estabelecimento fechado - apenas agendamento disponível</li>
            <li>📊 Calculamos automaticamente quando começar a preparar seu pedido</li>
            <li>🎯 Seu pedido chegará automaticamente no horário que você escolher</li>
            <li>🔔 Você será notificado sobre cada etapa do preparo</li>
          </ul>
        </div>
      ` : ''}

      <div class="schedule-options">
        ${this.isStoreOpen ? `
          <div class="schedule-option ${isNow ? 'schedule-option--selected' : ''}" data-action="select-schedule-type" data-type="now">
            <div class="schedule-option__radio"></div>
            <div class="schedule-option__content">
              <h4 class="schedule-option__title">RECEBER AGORA</h4>
              <p class="schedule-option__subtitle">Seu pedido será preparado imediatamente</p>
            </div>
          </div>
        ` : ''}

        <div class="schedule-option ${!isNow ? 'schedule-option--selected' : ''}" data-action="select-schedule-type" data-type="scheduled">
          <div class="schedule-option__radio"></div>
          <div class="schedule-option__content">
            <h4 class="schedule-option__title">AGENDAR PEDIDO</h4>
            <p class="schedule-option__subtitle">Escolha quando quer receber - começaremos a preparar no horário ideal</p>
          </div>
        </div>
      </div>

      ${!isNow ? `
        <div class="date-time-fields">
          <div class="checkout-field">
            <label class="checkout-field__label checkout-field__label--required">Escolha o Dia</label>
            <div id="mount-date-picker"></div>
            ${this.state.errors?.scheduledDate ? `<div class="checkout-field__error">${this.state.errors.scheduledDate}</div>` : ''}
          </div>

          <div class="checkout-field">
            <label class="checkout-field__label checkout-field__label--required">Escolha o Horário</label>
            <div id="mount-time-picker"></div>
            ${this.state.errors?.scheduledTime ? `<div class="checkout-field__error">${this.state.errors.scheduledTime}</div>` : ''}
          </div>
        </div>

        <div class="info-box info-box--success">
          <div class="info-box__header">
            <i data-lucide="check-circle" width="20" height="20" class="info-box__icon"></i>
            <h4 class="info-box__title">Como funciona o agendamento:</h4>
          </div>
          <ul class="info-box__list">
            <li>✅ Seu pedido será preparado para chegar no horário escolhido</li>
            <li>⏰ Começamos a preparar 30 minutos antes</li>
            <li>📲 Saímos para entrega com suficiente para chegar no horário</li>
            <li>🔔 Você receberá atualizações sobre cada etapa do preparo</li>
          </ul>
        </div>
      ` : ''}
    `;
  }

  // ── ETAPA 3: Pagamento ─────────────────────────────────────────────────────

  _renderStep3() {
    const { currentStep, completedSteps, paymentData } = this.state;
    const isActive = currentStep === 3;
    const isCompleted = completedSteps.includes(3);
    const isLocked = currentStep < 3;

    let stepClass = 'checkout-step';
    if (isActive) stepClass += ' checkout-step--active';
    else if (isCompleted) stepClass += ' checkout-step--completed';
    else if (isLocked) stepClass += ' checkout-step--locked';

    const methodLabels = {
      cash: 'Dinheiro',
      pix: 'PIX',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
    };

    const summaryText = paymentData.method ? `Forma: ${methodLabels[paymentData.method]}` : '';

    return `
      <div class="${stepClass}" data-step="3">
        <div class="checkout-step__header" ${isCompleted && !isActive ? 'data-action="edit-step" data-step="3"' : ''}>
          <div class="checkout-step__number">${isCompleted ? '<i data-lucide="check" width="20" height="20"></i>' : '3'}</div>
          <div class="checkout-step__title-group">
            <h2 class="checkout-step__title">Pagamento</h2>
            ${isCompleted && !isActive ? `<div class="checkout-step__summary">${summaryText}</div>` : ''}
          </div>
          ${isCompleted && !isActive ? '<button class="checkout-step__edit-btn" data-action="edit-step" data-step="3">Editar</button>' : ''}
        </div>
        
        ${isActive ? `<div class="checkout-step__content">${this._renderStep3Content()}</div>` : ''}
      </div>
    `;
  }

  _renderStep3Content() {
    const { paymentData } = this.state;
    const { total } = this.cart;
    const deliveryFee = this._getDeliveryFee();
    const grandTotal  = total + deliveryFee;

    const methods = [
      { id: 'cash', icon: 'banknote', name: 'Dinheiro', description: 'Pagar na entrega/retirada' },
      { id: 'pix', icon: 'qr-code', name: 'PIX', description: 'Enviar comprovante via WhatsApp' },
      { id: 'credit', icon: 'credit-card', name: 'Cartão de Crédito', description: 'Pagar na entrega/retirada' },
      { id: 'debit', icon: 'credit-card', name: 'Cartão de Débito', description: 'Pagar na entrega/retirada' },
    ];

    return `
      <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
        💳 Escolha como deseja pagar seu pedido
      </p>

      <div class="payment-methods">
        ${methods.map(method => `
          <div class="payment-method ${paymentData.method === method.id ? 'payment-method--selected' : ''}" data-action="select-payment" data-method="${method.id}">
            <div class="payment-method__main">
              <div class="payment-method__icon">
                <i data-lucide="${method.icon}" width="24" height="24"></i>
              </div>
              <div class="payment-method__info">
                <h4 class="payment-method__name">${method.name}</h4>
                <p class="payment-method__description">${method.description}</p>
              </div>
              <div class="payment-method__check">
                <i data-lucide="check" width="16" height="16"></i>
              </div>
            </div>

            ${method.id === 'cash' && paymentData.method === 'cash' ? `
              <div class="payment-method__sub">
                <div class="payment-sub-card">
                  <p class="payment-sub-card__title">💰 Valor total do pedido</p>
                  <p class="payment-sub-card__value">${formatCurrency(grandTotal)}</p>
                </div>
                <div class="checkout-field">
                  <label class="checkout-field__label">💵 Precisa de troco? (opcional)</label>
                  <input 
                    type="number"
                    inputmode="decimal"
                    class="checkout-field__input ${this._changeForError(grandTotal) ? 'checkout-field__input--error' : ''}"
                    placeholder="Ex: 100"
                    value="${paymentData.changeFor || ''}"
                    data-field="changeFor"
                    min="${grandTotal.toFixed(2)}"
                    step="0.01"
                  />
                  ${this._changeForError(grandTotal)
                    ? `<div class="checkout-field__error">${this._changeForError(grandTotal)}</div>`
                    : `<div class="checkout-field__hint">Valor deve ser maior que ${formatCurrency(grandTotal)}</div>`
                  }
                </div>
              </div>
            ` : ''}

            ${method.id === 'pix' && paymentData.method === 'pix' ? `
              <div class="payment-method__sub">
                <div class="payment-sub-card payment-sub-card--info">
                  <p class="payment-sub-card__text">
                    <strong>📱 Pague na próxima etapa</strong><br>
                    Ao finalizar seu pedido, você verá a chave PIX e as instruções para envio do comprovante.
                  </p>
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="checkout-nav">
        <button class="checkout-nav__back" data-action="prev-step">Voltar</button>
        <button class="checkout-nav__next" data-action="next-step" data-step="3" ${!paymentData.method ? 'disabled' : ''}>
          Continuar
          <i data-lucide="arrow-right" width="20" height="20"></i>
        </button>
      </div>
    `;
  }

  // ── ETAPA 4: Confirmação ───────────────────────────────────────────────────

  _renderStep4() {
    const { currentStep } = this.state;
    const isActive = currentStep === 4;

    if (!isActive) return '';

    return `
      <div class="checkout-step checkout-step--active" data-step="4">
        <div class="checkout-step__header">
          <div class="checkout-step__number">4</div>
          <div class="checkout-step__title-group">
            <h2 class="checkout-step__title">Confirmação do Pedido</h2>
          </div>
        </div>
        
        <div class="checkout-step__content">
          ${this._renderStep4Content()}
        </div>
      </div>
    `;
  }

  _renderStep4Content() {
    const { customerData, deliveryData, paymentData, observation } = this.state;
    const { items, total } = this.cart;
    const deliveryFee = this._getDeliveryFee();
    const grandTotal  = total + deliveryFee;

    const methodLabels = {
      cash: 'Dinheiro',
      pix: 'PIX',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
    };

    const estimatedTime = deliveryData.type === 'delivery' 
      ? this.config?.estimatedDeliveryTime || '30-60 min'
      : this.config?.estimatedPickupTime || '15-20 min';

    return `
      <div class="confirmation-section">
        <div class="confirmation-section__header">
          <h3 class="confirmation-section__title">
            <i data-lucide="user" width="20" height="20"></i>
            Seus Dados
          </h3>
          <button class="checkout-step__edit-btn" data-action="edit-step" data-step="1">Editar</button>
        </div>
        <div class="confirmation-card">
          <div class="confirmation-card__row">
            <span class="confirmation-card__label">Nome:</span>
            <span class="confirmation-card__value">${escapeHtml(customerData.name)}</span>
          </div>
          <div class="confirmation-card__row">
            <span class="confirmation-card__label">Telefone:</span>
            <span class="confirmation-card__value">${this._formatPhone(customerData.phone)}</span>
          </div>
          ${customerData.email ? `
            <div class="confirmation-card__row">
              <span class="confirmation-card__label">E-mail:</span>
              <span class="confirmation-card__value">${escapeHtml(customerData.email)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="confirmation-section">
        <div class="confirmation-section__header">
          <h3 class="confirmation-section__title">
            <i data-lucide="map-pin" width="20" height="20"></i>
            Entrega
          </h3>
          <button class="checkout-step__edit-btn" data-action="edit-step" data-step="2">Editar</button>
        </div>
        <div class="confirmation-card">
          <div class="confirmation-card__row">
            <span class="confirmation-card__label">Tipo:</span>
            <span class="confirmation-card__value">${deliveryData.type === 'delivery' ? 'Delivery' : 'Retirada no local'}</span>
          </div>
          ${deliveryData.type === 'delivery' ? `
            <div class="confirmation-card__row">
              <span class="confirmation-card__label">Endereço:</span>
              <span class="confirmation-card__value">${escapeHtml(deliveryData.street)}, ${escapeHtml(deliveryData.number)}${deliveryData.complement ? ` - ${escapeHtml(deliveryData.complement)}` : ''}, ${escapeHtml(deliveryData.neighborhood)}, ${escapeHtml(deliveryData.city)}/${escapeHtml(deliveryData.state)} — CEP: ${escapeHtml(deliveryData.cep)}</span>
            </div>
            ${deliveryData.reference ? `
              <div class="confirmation-card__row">
                <span class="confirmation-card__label">Referência:</span>
                <span class="confirmation-card__value">${escapeHtml(deliveryData.reference)}</span>
              </div>
            ` : ''}
          ` : ''}
          ${deliveryData.scheduleType === 'scheduled' ? `
            <div class="confirmation-card__row">
              <span class="confirmation-card__label">Agendado para:</span>
              <span class="confirmation-card__value">${formatSchedule(deliveryData.scheduledDate, deliveryData.scheduledTime)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="confirmation-section">
        <div class="confirmation-section__header">
          <h3 class="confirmation-section__title">
            <i data-lucide="credit-card" width="20" height="20"></i>
            Pagamento
          </h3>
          <button class="checkout-step__edit-btn" data-action="edit-step" data-step="3">Editar</button>
        </div>
        <div class="confirmation-card">
          <div class="confirmation-card__row">
            <span class="confirmation-card__label">Forma:</span>
            <span class="confirmation-card__value">${methodLabels[paymentData.method]}</span>
          </div>
          ${paymentData.method === 'cash' && paymentData.changeFor ? `
            <div class="confirmation-card__row">
              <span class="confirmation-card__label">Troco para:</span>
              <span class="confirmation-card__value">${escapeHtml(paymentData.changeFor)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="confirmation-section">
        <h3 class="confirmation-section__title">
          <i data-lucide="shopping-bag" width="20" height="20"></i>
          Itens do Pedido (${items.length})
        </h3>
        <div class="order-items">
          ${items.map(item => `
            <div class="order-item">
              <div class="order-item__info">
                <h4 class="order-item__name">${item.quantity}x ${escapeHtml(item.nome)}</h4>
                ${item.adicionais?.length ? `
                  <p class="order-item__details">+ ${item.adicionais.map(a => escapeHtml(a.nome)).join(', ')}</p>
                ` : ''}
              </div>
              <div class="order-item__price">${formatCurrency(item.totalPrice)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="order-totals">
        <div class="order-totals__row">
          <span class="order-totals__label">Subtotal</span>
          <span class="order-totals__value">${formatCurrency(total)}</span>
        </div>
        <div class="order-totals__row">
          <span class="order-totals__label">Taxa de entrega</span>
          <span class="order-totals__value">${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</span>
        </div>
        <div class="order-totals__row order-totals__row--total">
          <span class="order-totals__label">Total</span>
          <span class="order-totals__value">${formatCurrency(grandTotal)}</span>
        </div>
      </div>

      <div class="observation-field">
        <label class="observation-field__label">
          <i data-lucide="message-square" width="16" height="16"></i>
          Observações (opcional)
        </label>
        <textarea 
          class="observation-field__textarea" 
          placeholder="Alguma observação sobre seu pedido?"
          data-field="observation"
        >${escapeHtml(observation)}</textarea>
      </div>

      <div class="estimated-time">
        <div class="estimated-time__icon">
          <i data-lucide="clock" width="20" height="20"></i>
        </div>
        <div class="estimated-time__text">
          <p class="estimated-time__label">Tempo estimado</p>
          <p class="estimated-time__value">${deliveryData.type === 'delivery' ? 'Entrega' : 'Retirada'} ${estimatedTime}</p>
        </div>
      </div>

      <div class="checkout-nav">
        <button class="checkout-nav__back" data-action="prev-step">Voltar</button>
        <button class="checkout-nav__next" data-action="confirm-order">
          <i data-lucide="check-circle" width="20" height="20"></i>
          Confirmar Pedido
        </button>
      </div>
    `;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return phone;
  }

  /**
   * Calcula o frete real baseado no bairro selecionado e tipo de taxa.
   */
  _getDeliveryFee() {
    const bairro = this.state.deliveryData.neighborhood || getSelectedNeighborhood();
    const { taxa } = calcularTaxaEntrega(this.config, bairro);
    return taxa;
  }

  /**
   * Retorna a data de hoje no formato YYYY-MM-DD usando horário LOCAL (não UTC).
   * Evita o bug de fuso horário onde new Date().toISOString() retorna o dia anterior.
   */
  _getTodayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Retorna a data máxima permitida para agendamento (hoje + 30 dias).
   */
  _getMaxDateLocal() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Retorna mensagem de erro para o campo de troco, ou null se válido.
   * Troco é opcional — só valida se o usuário preencheu algo.
   */
  _changeForError(grandTotal) {
    const val = parseFloat(this.state.paymentData.changeFor);
    if (!this.state.paymentData.changeFor || this.state.paymentData.changeFor === '') return null;
    if (isNaN(val)) return 'Digite um valor numérico válido';
    if (val <= 0) return 'O valor deve ser maior que zero';
    if (val < grandTotal) return `Troco deve ser maior que o total (${formatCurrency(grandTotal)})`;
    return null;
  }

  // ── Event Handlers ─────────────────────────────────────────────────────────

  afterMount() {
    if (window.lucide) {
      window.lucide.createIcons({ root: this.el });
    }

    // Inputs de dados do cliente
    this.$$('[data-field]').forEach(input => {
      this._addListener(input, 'input', (e) => {
        const field = e.target.dataset.field;
        const value = e.target.value;

        // Máscaras
        if (field === 'phone') {
          e.target.value = this._maskPhone(value);
        } else if (field === 'cpf') {
          e.target.value = this._maskCPF(value);
        } else if (field === 'cep') {
          e.target.value = this._maskCEP(value);
          if (value.replace(/\D/g, '').length === 8) {
            this._fetchAddressByCEP(value);
          }
        } else if (field === 'state') {
          e.target.value = value.toUpperCase().slice(0, 2);
        }

        // Atualiza estado
        if (field === 'observation') {
          this.state.observation = value;
          setObservation(value);
        } else if (['name', 'phone', 'email', 'cpf'].includes(field)) {
          this.state.customerData[field] = value;
        } else if (['cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference', 'scheduledDate', 'scheduledTime'].includes(field)) {
          this.state.deliveryData[field] = value;
          // Quando o bairro muda, sincroniza com o estado do checkout (para o carrinho)
          if (field === 'neighborhood') {
            setSelectedNeighborhood(value);
            // Atualiza o TimePicker com o novo bairro (tempo de entrega pode mudar)
            if (this._timePicker) {
              this._timePicker.setNeighborhood(value);
            }
          }
        } else if (field === 'changeFor') {
          const raw = parseFloat(value);
          this.state.paymentData.changeFor = isNaN(raw) ? '' : value;

          // Valida em tempo real — atualiza só o erro sem re-renderizar tudo
          const { total } = this.cart;
          const grandTotal = total + this._getDeliveryFee();
          const errorMsg = this._changeForError(grandTotal);

          const inputEl = e.target;
          const fieldEl = inputEl.closest('.checkout-field');
          if (fieldEl) {
            let errorEl = fieldEl.querySelector('.checkout-field__error');
            let hintEl  = fieldEl.querySelector('.checkout-field__hint');

            if (errorMsg) {
              inputEl.classList.add('checkout-field__input--error');
              if (errorEl) {
                errorEl.textContent = errorMsg;
              } else {
                errorEl = document.createElement('div');
                errorEl.className = 'checkout-field__error';
                errorEl.textContent = errorMsg;
                if (hintEl) hintEl.replaceWith(errorEl);
                else fieldEl.appendChild(errorEl);
              }
            } else {
              inputEl.classList.remove('checkout-field__input--error');
              // Remove erro anterior se existir
              if (errorEl) errorEl.remove();

              // Monta mensagem do hint
              let hintMsg = `Valor deve ser maior que ${formatCurrency(grandTotal)}`;
              let hintClass = 'checkout-field__hint';

              // Se preenchido e válido, mostra o troco calculado em destaque
              if (!isNaN(raw) && raw > grandTotal) {
                const troco = raw - grandTotal;
                hintMsg = `✅ Troco: ${formatCurrency(troco)}`;
                hintClass = 'checkout-field__hint checkout-field__hint--success';
              }

              if (hintEl) {
                hintEl.className = hintClass;
                hintEl.textContent = hintMsg;
              } else {
                hintEl = document.createElement('div');
                hintEl.className = hintClass;
                hintEl.textContent = hintMsg;
                fieldEl.appendChild(hintEl);
              }
            }
          }
        }

        // Limpa erro do campo
        if (this.state.errors[field]) {
          this.state.errors[field] = null;
        }
      });
    });

    // Botões de navegação
    this.$$('[data-action="next-step"]').forEach(btn => {
      this._addListener(btn, 'click', () => {
        const step = parseInt(btn.dataset.step);
        this._handleNextStep(step);
      });
    });

    this.$$('[data-action="prev-step"]').forEach(btn => {
      this._addListener(btn, 'click', () => {
        this.setState({ currentStep: this.state.currentStep - 1 });
      });
    });

    this.$$('[data-action="edit-step"]').forEach(btn => {
      this._addListener(btn, 'click', () => {
        const step = parseInt(btn.dataset.step);
        goToStep(step);
        this.setState({ currentStep: step });
      });
    });

    // Toggle delivery/pickup
    this.$$('[data-action="select-delivery-type"]').forEach(btn => {
      this._addListener(btn, 'click', () => {
        this.state.deliveryData.type = btn.dataset.type;
        this.setState({ deliveryData: this.state.deliveryData });
      });
    });

    // Toggle agendamento
    this.$$('[data-action="select-schedule-type"]').forEach(btn => {
      this._addListener(btn, 'click', () => {
        this.state.deliveryData.scheduleType = btn.dataset.type;
        this.setState({ deliveryData: this.state.deliveryData });
      });
    });

    // Monta os pickers de data e hora (se a seção de agendamento estiver visível)
    this._mountPickers();

    // Seleção de método de pagamento
    this.$$('[data-action="select-payment"]').forEach(card => {
      this._addListener(card, 'click', (e) => {
        // Ignora cliques originados dentro do sub-conteúdo (input de troco, etc.)
        if (e.target.closest('.payment-method__sub')) return;

        this.state.paymentData.method = card.dataset.method;
        this.setState({ paymentData: this.state.paymentData });
      });
    });

    // Confirmar pedido
    const confirmBtn = this.$('[data-action="confirm-order"]');
    if (confirmBtn) {
      this._addListener(confirmBtn, 'click', () => {
        this._handleConfirmOrder();
      });
    }
  }

  // ── Pickers ────────────────────────────────────────────────────────────────

  _mountPickers() {
    const dateContainer = this.$('#mount-date-picker');
    const timeContainer = this.$('#mount-time-picker');
    if (!dateContainer || !timeContainer) return;

    const { deliveryData } = this.state;
    const neighborhood = deliveryData.neighborhood || getSelectedNeighborhood();

    // Desmonta pickers anteriores se existirem
    if (this._datePicker) { this._datePicker.unmount(); this._datePicker = null; }
    if (this._timePicker) { this._timePicker.unmount(); this._timePicker = null; }

    // TimePicker (criado primeiro para o DatePicker poder referenciá-lo)
    this._timePicker = new TimePicker({
      value:        deliveryData.scheduledTime || '',
      date:         deliveryData.scheduledDate || null,
      config:       this.config,
      neighborhood,
      onChange: (time) => {
        this.state.deliveryData.scheduledTime = time;
        if (this.state.errors?.scheduledTime) {
          this.state.errors.scheduledTime = null;
        }
      },
    });
    this._timePicker.mount(timeContainer);

    // DatePicker
    this._datePicker = new DatePicker({
      value:   deliveryData.scheduledDate || '',
      config:  this.config,
      maxDays: 30,
      onChange: (date) => {
        this.state.deliveryData.scheduledDate = date;
        if (this.state.errors?.scheduledDate) {
          this.state.errors.scheduledDate = null;
        }
        // Atualiza o TimePicker com a nova data
        if (this._timePicker) {
          this._timePicker.setDate(date);
        }
      },
    });
    this._datePicker.mount(dateContainer);
  }

  // ── Validações ─────────────────────────────────────────────────────────────

  _handleNextStep(step) {
    const errors = {};

    if (step === 1) {
      // Validar dados do cliente
      if (!this.state.customerData.name || this.state.customerData.name.trim().length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres';
      }

      const phone = this.state.customerData.phone.replace(/\D/g, '');
      if (!phone || phone.length < 10) {
        errors.phone = 'Telefone inválido';
      }

      if (this.state.customerData.email && !this._isValidEmail(this.state.customerData.email)) {
        errors.email = 'E-mail inválido';
      }

      if (Object.keys(errors).length > 0) {
        this.setState({ errors });
        return;
      }

      completeStep(1, this.state.customerData);
      this.setState({ currentStep: 2, completedSteps: [...this.state.completedSteps, 1], errors: {} });
    }

    else if (step === 2) {
      // Validar entrega
      if (this.state.deliveryData.type === 'delivery') {
        if (!this.state.deliveryData.cep || this.state.deliveryData.cep.replace(/\D/g, '').length !== 8) {
          errors.cep = 'CEP inválido';
        }
        if (!this.state.deliveryData.street) errors.street = 'Rua obrigatória';
        if (!this.state.deliveryData.number) errors.number = 'Número obrigatório';
        if (!this.state.deliveryData.neighborhood) errors.neighborhood = 'Bairro obrigatório';
        if (!this.state.deliveryData.city) errors.city = 'Cidade obrigatória';
        if (!this.state.deliveryData.state || this.state.deliveryData.state.length !== 2) {
          errors.state = 'Estado inválido';
        }
      }

      if (this.state.deliveryData.scheduleType === 'scheduled') {
        if (!this.state.deliveryData.scheduledDate) {
          errors.scheduledDate = 'Escolha uma data';
        } else {
          // Valida se a data não é passada (usando horário local)
          const selectedDate = new Date(this.state.deliveryData.scheduledDate + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            errors.scheduledDate = 'A data não pode ser no passado';
          }
          // Valida se não ultrapassa 30 dias
          const maxDate = new Date(today);
          maxDate.setDate(today.getDate() + 30);
          if (selectedDate > maxDate) {
            errors.scheduledDate = 'Agendamento máximo de 30 dias';
          }
        }
        if (!this.state.deliveryData.scheduledTime) {
          errors.scheduledTime = 'Escolha um horário';
        } else if (this.state.deliveryData.scheduledDate) {
          // Valida se data+hora não é no passado
          const selectedDateTime = new Date(
            `${this.state.deliveryData.scheduledDate}T${this.state.deliveryData.scheduledTime}:00`
          );
          if (selectedDateTime <= new Date()) {
            errors.scheduledTime = 'O horário escolhido já passou';
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        this.setState({ errors });
        return;
      }

      completeStep(2, this.state.deliveryData);
      this.setState({ currentStep: 3, completedSteps: [...this.state.completedSteps, 2], errors: {} });
    }

    else if (step === 3) {
      if (!this.state.paymentData.method) {
        alert('Selecione uma forma de pagamento');
        return;
      }

      // Valida troco se pagamento em dinheiro
      if (this.state.paymentData.method === 'cash') {
        const { total } = this.cart;
        const grandTotal = total + this._getDeliveryFee();
        const changeError = this._changeForError(grandTotal);
        if (changeError) {
          this.setState({ errors: { ...this.state.errors, changeFor: changeError } });
          return;
        }
      }

      completeStep(3, this.state.paymentData);
      this.setState({ currentStep: 4, completedSteps: [...this.state.completedSteps, 3] });
    }
  }

  _handleConfirmOrder() {
    const { customerData, deliveryData, paymentData, observation } = this.state;

    const orderData = {
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerData.email,
      customerCPF: customerData.cpf,
      deliveryType: deliveryData.type,
      address: deliveryData.type === 'delivery' ? {
        cep: deliveryData.cep,
        street: deliveryData.street,
        number: deliveryData.number,
        complement: deliveryData.complement,
        neighborhood: deliveryData.neighborhood,
        city: deliveryData.city,
        state: deliveryData.state,
        reference: deliveryData.reference,
      } : null,
      scheduledDate: deliveryData.scheduleType === 'scheduled' ? deliveryData.scheduledDate : null,
      scheduledTime: deliveryData.scheduleType === 'scheduled' ? deliveryData.scheduledTime : null,
      paymentMethod: paymentData.method,
      changeFor: paymentData.changeFor,
      observation,
    };

    // Dispara o WhatsApp imediatamente para todos os métodos
    sendOrderViaWhatsApp({ ...orderData, deliveryFee: this._getDeliveryFee() });

    // Limpa carrinho e estado do checkout
    clearCart();
    clearCheckout();

    // Passa apenas os dados necessários para a tela de confirmação
    window._pendingOrderData = { orderData };

    navigate(`${APP_BASE_PATH}/checkout/confirmado`);
  }

  // ── Máscaras ───────────────────────────────────────────────────────────────

  _maskPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2)  return digits.replace(/(\d{0,2})/, '($1');
    if (digits.length <= 7)  return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  _maskCPF(value) {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '');
  }

  _maskCEP(value) {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── ViaCEP ─────────────────────────────────────────────────────────────────

  async _fetchAddressByCEP(cep) {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    this.setState({ isLoadingCEP: true });

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();

      if (data.erro) {
        this.setState({ 
          isLoadingCEP: false,
          errors: { ...this.state.errors, cep: 'CEP não encontrado' }
        });
        return;
      }

      // Preenche os campos automaticamente
      // Bairro: só preenche se estiver vazio — preserva o que foi selecionado no carrinho
      this.state.deliveryData.street       = data.logradouro || '';
      this.state.deliveryData.neighborhood = this.state.deliveryData.neighborhood || data.bairro || '';
      this.state.deliveryData.city         = data.localidade || '';
      this.state.deliveryData.state        = data.uf || '';

      this.setState({ 
        deliveryData: this.state.deliveryData,
        isLoadingCEP: false 
      });

      // Foca no campo número
      setTimeout(() => {
        const numberInput = this.$('[data-field="number"]');
        if (numberInput) numberInput.focus();
      }, 100);

    } catch (error) {
      console.error('[ViaCEP] Erro:', error);
      this.setState({ 
        isLoadingCEP: false,
        errors: { ...this.state.errors, cep: 'Erro ao buscar CEP' }
      });
    }
  }
}
