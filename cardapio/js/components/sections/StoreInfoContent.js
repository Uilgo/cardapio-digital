/**
 * StoreInfoContent.js — Conteúdo compartilhado entre Drawer e BottomSheet
 *
 * Exporta:
 *   renderStoreInfoContent(config) → string HTML
 *   storeInfoAfterMount(component) → registra listeners
 */

import { escapeHtml } from "../../utils.js";
import { isStoreOpen, getNextOpenTime } from "../../services/checkout.js";
import { formatCurrency } from "../../services/formatter.js";
import { getConfig } from "../../services/data.js";

// ── Dias da semana ────────────────────────────────────────────────────────────

const DIAS_LABEL = {
  segunda: 'Segunda-feira',
  terca:   'Terça-feira',
  quarta:  'Quarta-feira',
  quinta:  'Quinta-feira',
  sexta:   'Sexta-feira',
  sabado:  'Sábado',
  domingo: 'Domingo',
};

const DIAS_ORDER = ['segunda','terca','quarta','quinta','sexta','sabado','domingo'];

// ── Render principal ──────────────────────────────────────────────────────────

export function renderStoreInfoContent(config) {
  const aberto       = isStoreOpen(config);
  const proximoHora  = aberto ? '' : getNextOpenTime(config);
  const name         = config.name    ?? 'Cardápio Digital';
  const slogan       = config.slogan  ?? '';
  const description  = config.description ?? '';
  const logo         = config.logo    ?? null;
  const instagram    = config.instagram ?? null;
  const whatsapp     = config.whatsapp  ?? null;
  const address      = config.address   ?? null;
  const city         = config.city      ?? null;
  const state        = config.state     ?? null;

  const tempoEntregaMin = config.tempo_entrega_min ?? 30;
  const tempoEntregaMax = config.tempo_entrega_max ?? 60;
  const tempoRetiradaMin = config.tempo_retirada_min ?? 15;
  const tempoRetiradaMax = config.tempo_retirada_max ?? 20;
  const valorMinimo  = config.valor_minimo_pedido ?? null;
  const aceitaDelivery = config.aceita_delivery !== false;
  const aceitaRetirada = config.aceita_retirada !== false;

  // Bairros atendidos (filtra _doc_*)
  const bairros = (config.taxas_por_localizacao ?? [])
    .filter(b => b.status === 'ativado' && b.nome && !b._doc_status);

  // Pagamentos aceitos (filtra _doc_*)
  const pagamentos = (config.pagamentos ?? []).filter(p => !p.startsWith?.('_'));

  // Mapa de ícones por método de pagamento
  const PAGAMENTO_ICONS = {
    // valores em português (como estão no config)
    'dinheiro':           'banknote',
    'pix':                'qr-code',
    'cartão de crédito':  'credit-card',
    'cartão de débito':   'credit-card',
    // valores em inglês (fallback)
    'cash':               'banknote',
    'credit':             'credit-card',
    'debit':              'credit-card',
  };

  // Horários (filtra _doc_*)
  const horarios = (config.horarios ?? [])
    .filter(h => h.dia_semana)
    .sort((a, b) => DIAS_ORDER.indexOf(a.dia_semana) - DIAS_ORDER.indexOf(b.dia_semana));

  return `
    <div class="si-content">

      <!-- ── Hero: Logo + Nome + Status ── -->
      <div class="si-hero">
        <div class="si-hero__logo">
          ${logo
            ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" class="si-hero__logo-img">`
            : `<span class="si-hero__logo-fallback">🍽️</span>`
          }
        </div>
        <div class="si-hero__info">
          <h3 class="si-hero__name">${escapeHtml(name)}</h3>
          ${slogan ? `<p class="si-hero__slogan">${escapeHtml(slogan)}</p>` : ''}
          <div class="si-status ${aberto ? 'si-status--open' : 'si-status--closed'}">
            <span class="si-status__dot"></span>
            <span class="si-status__label">
              ${aberto ? 'Aberto agora' : `Fechado${proximoHora ? ` · Abre ${proximoHora}` : ''}`}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Descrição ── -->
      ${description ? `
        <div class="si-card">
          <div class="si-card__header">
            <i data-lucide="info" width="16" height="16"></i>
            <span>Sobre</span>
          </div>
          <p class="si-card__text">${escapeHtml(description)}</p>
        </div>
      ` : ''}

      <!-- ── Endereço ── -->
      ${(address || city) ? `
        <div class="si-card">
          <div class="si-card__header">
            <i data-lucide="map-pin" width="16" height="16"></i>
            <span>Localização</span>
          </div>
          <p class="si-card__text">
            ${address ? escapeHtml(address) : ''}
            ${(address && city) ? '<br>' : ''}
            ${city ? `${escapeHtml(city)}${state ? `/${escapeHtml(state)}` : ''}` : ''}
          </p>
        </div>
      ` : ''}

      <!-- ── Entrega & Retirada ── -->
      <div class="si-card">
        <div class="si-card__header">
          <i data-lucide="clock" width="16" height="16"></i>
          <span>Tempo estimado</span>
        </div>
        <div class="si-grid-2">
          ${aceitaDelivery ? `
            <div class="si-info-chip">
              <div class="si-info-chip__row">
                <i data-lucide="bike" width="14" height="14"></i>
                <span class="si-info-chip__label">Delivery</span>
              </div>
              <span class="si-info-chip__value">${tempoEntregaMin}–${tempoEntregaMax} min</span>
            </div>
          ` : ''}
          ${aceitaRetirada ? `
            <div class="si-info-chip">
              <div class="si-info-chip__row">
                <i data-lucide="shopping-bag" width="14" height="14"></i>
                <span class="si-info-chip__label">Retirada</span>
              </div>
              <span class="si-info-chip__value">${tempoRetiradaMin}–${tempoRetiradaMax} min</span>
            </div>
          ` : ''}
        </div>
        ${valorMinimo ? `
          <div class="si-card__footer-note">
            <i data-lucide="alert-circle" width="12" height="12"></i>
            Pedido mínimo: ${formatCurrency(valorMinimo)}
          </div>
        ` : ''}
      </div>

      <!-- ── Bairros atendidos ── -->
      ${bairros.length > 0 ? `
        <div class="si-card">
          <div class="si-card__header">
            <i data-lucide="map" width="16" height="16"></i>
            <span>Bairros atendidos em ${escapeHtml(city ?? '')}</span>
          </div>
          <div class="si-bairros">
            ${bairros.map(b => `
              <div class="si-bairro-row">
                <span class="si-bairro-row__nome">${escapeHtml(b.nome)}</span>
                <span class="si-bairro-row__taxa ${b.taxa_valor === 0 ? 'si-bairro-row__taxa--free' : ''}">
                  ${b.taxa_valor === 0 ? 'Grátis' : formatCurrency(b.taxa_valor)}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ── Formas de pagamento ── -->
      ${pagamentos.length > 0 ? `
        <div class="si-card">
          <div class="si-card__header">
            <i data-lucide="credit-card" width="16" height="16"></i>
            <span>Formas de pagamento</span>
          </div>
          <div class="si-tags">
            ${pagamentos.map(p => {
              const icon = PAGAMENTO_ICONS[p.toLowerCase()] ?? 'wallet';
              const wide = p.length > 8 ? 'si-tag--wide' : '';
              return `
                <div class="si-tag ${wide}">
                  <i data-lucide="${icon}" width="13" height="13"></i>
                  ${escapeHtml(p)}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ── Horários de funcionamento ── -->
      ${horarios.length > 0 ? `
        <div class="si-card">
          <div class="si-card__header">
            <i data-lucide="calendar" width="16" height="16"></i>
            <span>Horários de funcionamento</span>
          </div>
          <div class="si-horarios">
            ${horarios.map(h => {
              const label = DIAS_LABEL[h.dia_semana] ?? h.dia_semana;
              const periodos = h.periodos?.filter(p => p.horario_abertura) ?? [];
              return `
                <div class="si-horario-row ${!h.aberto ? 'si-horario-row--closed' : ''}">
                  <span class="si-horario-row__dia">${label}</span>
                  <span class="si-horario-row__horas">
                    ${!h.aberto
                      ? 'Fechado'
                      : periodos.map(p => `${p.horario_abertura}–${p.horario_fechamento}`).join(' / ')
                    }
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ── Ações ── -->
      <div class="si-actions">
        ${whatsapp ? `
          <button class="btn btn--primary btn--full" data-action="whatsapp" type="button">
            <i data-lucide="message-circle" width="18" height="18"></i>
            Falar no WhatsApp
          </button>
        ` : ''}
        <button class="btn btn--surface btn--full" data-action="compartilhar" type="button">
          <i data-lucide="share-2" width="18" height="18"></i>
          Compartilhar cardápio
        </button>
      </div>

    </div>
  `;
}

// ── Listeners compartilhados ──────────────────────────────────────────────────

export function storeInfoAfterMount(component) {
  const btnWhatsapp = component.$('[data-action="whatsapp"]');
  if (btnWhatsapp) {
    component._addListener(btnWhatsapp, 'click', () => {
      const config = getConfig();
      if (config?.whatsapp) {
        window.open(
          `https://wa.me/${config.whatsapp.replace(/\D/g, '')}`,
          '_blank', 'noopener,noreferrer'
        );
      }
    });
  }

  const btnCompartilhar = component.$('[data-action="compartilhar"]');
  if (btnCompartilhar) {
    component._addListener(btnCompartilhar, 'click', async () => {
      const config = getConfig();
      const url  = window.location.href;
      const text = `Confira o cardápio de ${config?.name ?? 'nosso restaurante'}!`;
      if (navigator.share) {
        try { await navigator.share({ title: config?.name, text, url }); } catch {}
      } else {
        await navigator.clipboard.writeText(url);
      }
    });
  }
}
