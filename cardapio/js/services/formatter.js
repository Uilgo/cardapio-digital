/**
 * formatter.js — Funções de formatação de valores
 *
 * Responsabilidade única: transformar dados brutos em strings formatadas.
 * Não tem side effects, não acessa estado global.
 */

import { getState } from '../state.js';

/**
 * Formata um valor numérico como moeda brasileira (R$).
 * Usa as configurações de locale/currency do estado global quando disponível.
 *
 * @param   {number} value - Valor numérico (ex: 52.90)
 * @returns {string}       - String formatada (ex: 'R$ 52,90')
 *
 * @example
 *   formatCurrency(52.9)  // 'R$ 52,90'
 *   formatCurrency(0)     // 'R$ 0,00'
 */
export function formatCurrency(value) {
  const config = getState('config');
  const locale   = config?.locale   ?? 'pt-BR';
  const currency = config?.currency ?? 'BRL';

  return new Intl.NumberFormat(locale, {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

/**
 * Calcula e formata o desconto percentual entre dois preços.
 *
 * @param   {number} originalPrice - Preço original
 * @param   {number} promoPrice    - Preço promocional
 * @returns {string}               - Ex: '-20%'
 */
export function formatDiscount(originalPrice, promoPrice) {
  if (!originalPrice || originalPrice <= 0) return '';
  const discount = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
  return `-${discount}%`;
}

/**
 * Formata uma data no padrão brasileiro (dd/mm/yyyy hh:mm).
 *
 * @param   {string|Date} dateInput - Data a formatar
 * @returns {string}                - Ex: '27/04/2026 14:30'
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Pluraliza uma palavra de forma simples.
 * Ex: pluralize(1, 'item', 'itens') → '1 item'
 *     pluralize(3, 'item', 'itens') → '3 itens'
 *
 * @param   {number} count    - Contagem
 * @param   {string} singular - Forma singular
 * @param   {string} plural   - Forma plural
 * @returns {string}
 */
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Formata o número de telefone para exibição.
 * Ex: '5511999887766' → '+55 (11) 99988-7766'
 *
 * @param   {string} phone - Número com DDI (ex: '5511999887766')
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return '';

  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, '');

  // Formato: +55 (11) 99988-7766
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  return phone;
}
