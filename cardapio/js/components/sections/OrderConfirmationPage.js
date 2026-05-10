/**
 * OrderConfirmationPage.js — Tela de sucesso pós-pedido
 *
 * Fluxo unificado para todos os métodos de pagamento:
 *   1. WhatsApp já foi aberto pelo CheckoutPage antes de navegar aqui
 *   2. Esta página apenas confirma o envio e orienta o próximo passo
 *
 * Para PIX: exibe aviso para enviar comprovante na conversa do WhatsApp
 * Para outros: mensagem simples de confirmação
 */

import { Component } from '../base/Component.js';
import { navigate } from '../../router.js';
import { APP_BASE_PATH } from '../../config/app.config.js';

export class OrderConfirmationPage extends Component {
  constructor(props = {}) {
    super(props);
    this.orderData = props.orderData || {};
  }

  render() {
    const isPix = this.orderData.paymentMethod === 'pix';

    return `
      <div class="checkout-root">
        <div class="confirmation-page">
          <div class="conf-page__inner conf-page__inner--success">

            <!-- Ícone de sucesso -->
            <div class="conf-page__header">
              <div class="conf-page__icon conf-page__icon--success">
                <i data-lucide="check-circle-2" width="40" height="40"></i>
              </div>
              <h1 class="conf-page__title">Pedido Enviado!</h1>
              <p class="conf-page__subtitle">
                ${isPix
                  ? 'Seu pedido foi enviado com sucesso. Agora realize o pagamento via PIX e envie o comprovante no WhatsApp para começar o preparo!'
                  : 'Recebemos seu pedido! Em breve entraremos em contato para confirmar.'
                }
              </p>
            </div>

            <!-- Aviso PIX: instrução de comprovante -->
            ${isPix ? `
              <div class="conf-info-box conf-info-box--warning">
                <i data-lucide="alert-circle" width="20" height="20"></i>
                <div>
                  <p><strong>Próximo passo:</strong> abra a conversa do WhatsApp que acabou de iniciar, realize o pagamento PIX com a chave que está na mensagem e envie o comprovante na mesma conversa.</p>
                  <p style="margin-top: 8px; font-size: var(--text-xs);">⚠️ O pedido só começa a ser preparado após a confirmação do pagamento.</p>
                </div>
              </div>
            ` : ''}

            <!-- Steps de progresso -->
            <div class="conf-success-steps">
              <div class="conf-success-step">
                <div class="conf-success-step__icon">
                  <i data-lucide="check" width="16" height="16"></i>
                </div>
                <span>Pedido enviado</span>
              </div>
              <div class="conf-success-step ${isPix ? 'conf-success-step--pending' : 'conf-success-step--pending'}">
                <div class="conf-success-step__icon">
                  <i data-lucide="clock" width="16" height="16"></i>
                </div>
                <span>${isPix ? 'Aguardando pagamento PIX' : 'Aguardando confirmação'}</span>
              </div>
              <div class="conf-success-step conf-success-step--pending">
                <div class="conf-success-step__icon">
                  <i data-lucide="chef-hat" width="16" height="16"></i>
                </div>
                <span>Em preparo</span>
              </div>
              <div class="conf-success-step conf-success-step--pending">
                <div class="conf-success-step__icon">
                  <i data-lucide="bike" width="16" height="16"></i>
                </div>
                <span>A caminho</span>
              </div>
            </div>

            <!-- Botão voltar ao cardápio -->
            <button class="conf-btn conf-btn--primary conf-btn--full" data-action="go-home">
              <i data-lucide="utensils" width="18" height="18"></i>
              Voltar ao Cardápio
            </button>

          </div>
        </div>
      </div>
    `;
  }

  afterMount() {
    if (window.lucide) window.lucide.createIcons({ root: this.el });

    const homeBtn = this.$('[data-action="go-home"]');
    if (homeBtn) {
      this._addListener(homeBtn, 'click', () => {
        navigate(`${APP_BASE_PATH}/`);
      });
    }
  }
}
