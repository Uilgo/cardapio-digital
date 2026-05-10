/**
 * Badge.js — Componente atômico de badge/etiqueta
 *
 * Exibe badges semânticos: vegano, picante, destaque, promoção, etc.
 * Pode ser usado de forma standalone ou como helper estático.
 *
 * Uso standalone (via mount):
 *   new Badge({ type: 'vegano' }).mount(container);
 *
 * Uso como helper estático (renderiza apenas HTML):
 *   Badge.render('vegano')  → '<span class="badge badge--vegano">🌱 Vegano</span>'
 */

import { Component } from '../base/Component.js';
import { BADGE_MAP } from '../../config/app.config.js';
import { escapeHtml } from '../../utils.js';

export class Badge extends Component {
  render() {
    const { type } = this.props;
    return Badge.renderBadge(type);
  }

  /**
   * Renderiza um único badge como string HTML.
   * Método estático — pode ser chamado sem instanciar o componente.
   *
   * @param   {string} type - Tipo do badge (ex: 'vegano', 'picante')
   * @returns {string}      - HTML do badge
   */
  static renderBadge(type) {
    const badge = BADGE_MAP[type];
    if (!badge) return '';

    return `
      <span class="badge badge--${escapeHtml(type)}" aria-label="${escapeHtml(badge.label)}">
        <span aria-hidden="true">${badge.icon}</span>
        ${escapeHtml(badge.label)}
      </span>
    `.trim();
  }

  /**
   * Renderiza uma lista de badges como string HTML.
   * Envolve em um .badge-group se houver mais de um.
   *
   * @param   {string[]} types - Array de tipos (ex: ['vegano', 'destaque'])
   * @returns {string}
   */
  static renderBadgeGroup(types = []) {
    if (!types?.length) return '';

    const badges = types.map((type) => Badge.renderBadge(type)).filter(Boolean).join('');

    if (!badges) return '';

    return `<div class="badge-group" aria-label="Características do produto">${badges}</div>`;
  }
}
