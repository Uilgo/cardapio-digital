/**
 * whatsapp.js — Formatação e envio do pedido via WhatsApp
 *
 * Responsabilidade: montar a mensagem formatada e abrir o link wa.me.
 * Não tem side effects de UI — apenas lógica de formatação e abertura de URL.
 */

import { getCart } from "./cart.js";
import { getConfig } from "./data.js";
import { formatCurrency } from "./formatter.js";

// ── Constantes ────────────────────────────────────────────────────────────────

/** Número de caracteres máximo por linha de produto */
const MAX_LINE_LENGTH = 40;

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Monta a mensagem do pedido formatada e abre o link do WhatsApp.
 * Deve ser chamada quando o cliente clica em "Finalizar Pedido".
 *
 * @param {Object} options
 * @param {string} options.customerName  - Nome do cliente
 * @param {string} options.customerPhone - Telefone do cliente
 * @param {string} options.customerEmail - E-mail do cliente (opcional)
 * @param {string} options.customerCPF   - CPF do cliente (opcional)
 * @param {string} options.deliveryType  - 'delivery' ou 'pickup'
 * @param {Object} options.address       - Endereço completo (se delivery)
 * @param {string} options.scheduledDate - Data agendada (opcional)
 * @param {string} options.scheduledTime - Horário agendado (opcional)
 * @param {string} options.paymentMethod - Método de pagamento
 * @param {string} options.changeFor     - Troco para (opcional)
 * @param {string} options.observation   - Observação geral (opcional)
 */
export function sendOrderViaWhatsApp({
  customerName,
  customerPhone,
  customerEmail,
  customerCPF,
  deliveryType,
  address,
  scheduledDate,
  scheduledTime,
  paymentMethod,
  changeFor,
  observation,
  deliveryFee: deliveryFeeParam,
}) {
  const config = getConfig();
  const cart = getCart();

  if (!config?.whatsapp) {
    console.error(
      "[whatsapp] Número do WhatsApp não configurado em config.json",
    );
    return;
  }

  if (!cart?.items?.length) {
    console.warn("[whatsapp] Tentativa de enviar pedido com carrinho vazio");
    return;
  }

  const message = _buildMessage({
    customerName,
    customerPhone,
    customerEmail,
    customerCPF,
    deliveryType,
    address,
    scheduledDate,
    scheduledTime,
    paymentMethod,
    changeFor,
    observation,
    deliveryFee: deliveryFeeParam,
    cart,
    config,
  });
  const url = _buildWhatsAppUrl(config.whatsapp, message);

  // Abre em nova aba (não bloqueia a página atual)
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Retorna a mensagem formatada sem abrir o WhatsApp.
 * Útil para pré-visualização ou testes.
 *
 * @param {Object} options - Mesmo objeto de sendOrderViaWhatsApp
 * @returns {string}       - Mensagem formatada em texto puro
 */
export function buildOrderMessage(options) {
  const config = getConfig();
  const cart = getCart();
  return _buildMessage({ ...options, cart, config });
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Monta a mensagem completa do pedido em formato amigável para WhatsApp.
 *
 * @param {Object} params
 * @returns {string} - Mensagem formatada com emojis e quebras de linha
 */
function _buildMessage({
  customerName,
  customerPhone,
  customerEmail,
  customerCPF,
  deliveryType,
  address,
  scheduledDate,
  scheduledTime,
  paymentMethod,
  changeFor,
  observation,
  deliveryFee: deliveryFeeParam,
  cart,
  config,
}) {
  const lines = [];
  const sep = '----------------------------';

  // Cabeçalho
  lines.push(`*Pedido — ${config.name}*`);
  lines.push(sep);

  // Cliente
  lines.push(`*Cliente:* ${customerName || 'Não informado'}`);
  if (customerPhone) lines.push(`*Telefone:* ${customerPhone}`);
  if (customerEmail) lines.push(`*E-mail:* ${customerEmail}`);
  if (customerCPF)   lines.push(`*CPF:* ${customerCPF}`);
  lines.push('');

  // Entrega
  if (deliveryType === 'delivery' && address) {
    lines.push(`*Tipo:* Delivery`);
    lines.push(`*Endereco:* ${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}`);
    lines.push(`${address.neighborhood} - ${address.city}/${address.state}`);
    lines.push(`CEP: ${address.cep}`);
    if (address.reference) lines.push(`Ref: ${address.reference}`);
  } else {
    lines.push(`*Tipo:* Retirada no local`);
  }
  lines.push('');

  // Itens
  lines.push(`*Itens do pedido:*`);
  lines.push('');

  cart.items.forEach((item, index) => {
    lines.push(`${index + 1}. *${item.quantity}x ${item.nome}*`);

    if (item.adicionais?.length > 0) {
      item.adicionais.forEach((a) => {
        const preco = a.preco > 0 ? ` (+${formatCurrency(a.preco)})` : '';
        lines.push(`   + ${a.nome}${preco}`);
      });
    }

    if (item.observation?.trim()) {
      lines.push(`   Obs: ${item.observation.trim()}`);
    }

    lines.push(`   ${formatCurrency(item.totalPrice)}`);
    lines.push('');
  });

  // Totais — usa o frete calculado pelo bairro, com fallback para o config
  lines.push(sep);

  const deliveryFee = deliveryFeeParam ?? config.taxa_entrega ?? config.deliveryFee ?? 0;

  if (deliveryFee > 0) {
    lines.push(`*Taxa de entrega:* ${formatCurrency(deliveryFee)}`);
  } else {
    lines.push(`*Taxa de entrega:* Gratis`);
  }

  const grandTotal = cart.total + deliveryFee;
  lines.push(`*Total: ${formatCurrency(grandTotal)}*`);
  lines.push('');

  // Pagamento
  const paymentLabels = { cash: 'Dinheiro', pix: 'PIX', credit: 'Cartao de Credito', debit: 'Cartao de Debito' };
  lines.push(`*Pagamento:* ${paymentLabels[paymentMethod] || paymentMethod}`);

  if (paymentMethod === 'cash' && changeFor) {
    const changeForNum = parseFloat(changeFor);
    const troco = changeForNum - grandTotal;
    const trocoStr = troco > 0 ? ` (troco: ${formatCurrency(troco)})` : '';
    lines.push(`*Troco para:* ${formatCurrency(changeForNum)}${trocoStr}`);
  }

  // PIX
  if (paymentMethod === 'pix') {
    lines.push('');
    lines.push(sep);
    lines.push('*Pagamento via PIX*');
    if (config.pixKey) {
      const keyTypeLabel = { email: 'E-mail', cpf: 'CPF', cnpj: 'CNPJ', telefone: 'Telefone', aleatoria: 'Chave aleatoria' };
      const label = keyTypeLabel[config.pixKeyType] || 'Chave PIX';
      lines.push(`*${label}:* ${config.pixKey}`);
    }
    lines.push('');
    lines.push('_Apos realizar o pagamento, envie o comprovante nesta conversa para que o pedido comece a ser preparado._');
    lines.push(sep);
  }

  lines.push('');

  // Agendamento
  if (scheduledDate && scheduledTime) {
    const date = new Date(scheduledDate + 'T00:00:00');
    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    lines.push(`*Agendado para:* ${dateStr} as ${scheduledTime}`);
    lines.push('');
  }

  // Observacao geral
  if (observation?.trim()) {
    lines.push(`*Observacao:*`);
    lines.push(observation.trim());
    lines.push('');
  }

  // Rodape
  lines.push(sep);
  lines.push(`_Enviado via Cardapio Digital_`);

  return lines.join('\n');
}

/**
 * Monta a URL completa do WhatsApp com a mensagem codificada.
 *
 * @param   {string} phone   - Número com DDI, sem símbolos (ex: '5511999887766')
 * @param   {string} message - Mensagem já formatada
 * @returns {string}         - URL wa.me completa
 */
function _buildWhatsAppUrl(phone, message) {
  // Remove qualquer caractere não numérico do telefone
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMsg = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}
