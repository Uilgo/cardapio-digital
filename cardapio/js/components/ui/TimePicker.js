/**
 * TimePicker.js — Seletor de horário customizado para agendamento
 *
 * Props:
 *   value         {string}   — horário selecionado 'HH:MM' ou ''
 *   date          {string}   — data selecionada 'YYYY-MM-DD'
 *   config        {Object}   — config.json
 *   neighborhood  {string}   — bairro selecionado (tempo de entrega específico)
 *   onChange      {Function} — callback(timeStr: 'HH:MM' | null)
 *   interval      {number}   — intervalo entre slots em minutos (padrão: 30)
 */

import { Component } from '../base/Component.js';

const DAYS_PT = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

export class TimePicker extends Component {
  constructor(props = {}) {
    super(props);

    this.state = {
      selected: props.value || null,
      open: false,
    };

    this._date         = props.date         || null;
    this._config       = props.config       || {};
    this._neighborhood = props.neighborhood || '';
    this._interval     = props.interval     || 30;
    this._onChange     = props.onChange     || (() => {});
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /** Tempo de entrega considerando bairro específico */
  _getDeliveryTime() {
    const config = this._config;

    if (this._neighborhood && config.tipo_taxa_entrega === 'taxa_localizacao') {
      const bairros = (config.taxas_por_localizacao ?? [])
        .filter(b => b.status === 'ativado' && b.nome && !b._doc_status);

      const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const bn = norm(this._neighborhood);
      const found = bairros.find(b => {
        const n = norm(b.nome);
        return n === bn || n.includes(bn) || bn.includes(n);
      });

      if (found?.tempo_min && found?.tempo_max) {
        return { min: found.tempo_min, max: found.tempo_max };
      }
    }

    return {
      min: config.tempo_entrega_min ?? 30,
      max: config.tempo_entrega_max ?? 60,
    };
  }

  /** Gera os slots disponíveis para a data selecionada */
  _getSlots() {
    const dateStr = this._date;
    if (!dateStr) return [];

    const date   = new Date(dateStr + 'T00:00:00');
    const dayKey = DAYS_PT[date.getDay()];
    const horarios = this._config.horarios ?? [];
    const daySlot  = horarios.find(h => h.dia_semana === dayKey);

    if (!daySlot || !daySlot.aberto || !daySlot.periodos?.length) return [];

    const { min: tempoMin, max: tempoMax } = this._getDeliveryTime();
    const now     = new Date();
    const isToday = dateStr === this._todayStr();
    const slots   = [];

    for (const periodo of daySlot.periodos) {
      const [oh, om] = periodo.horario_abertura.split(':').map(Number);
      const [ch, cm] = periodo.horario_fechamento.split(':').map(Number);

      const openMins  = oh * 60 + om;
      // Primeiro slot: abertura + tempo_min (mínimo para preparar e entregar)
      // Último slot:   fechamento - tempo_min (ainda dá tempo de preparar e entregar)
      const firstSlot = openMins + tempoMin;
      const closeMins = ch * 60 + cm - tempoMin;

      // Primeiro slot disponível:
      // - Hoje: max(abertura + tempo_min, agora + tempo_max) arredondado
      // - Outro dia: abertura + tempo_min
      let startMins = firstSlot;
      if (isToday) {
        const nowMins = now.getHours() * 60 + now.getMinutes() + tempoMax;
        const fromNow = Math.ceil(nowMins / this._interval) * this._interval;
        startMins = Math.max(firstSlot, fromNow);
      }

      for (let m = startMins; m <= closeMins; m += this._interval) {
        const h   = Math.floor(m / 60);
        const min = m % 60;
        if (h > 23) break;
        slots.push(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
      }
    }

    return slots;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const { selected, open } = this.state;
    const slots   = this._getSlots();
    const hasDate = !!this._date;

    let triggerLabel = 'Selecione um horário';
    if (!hasDate)          triggerLabel = 'Escolha o dia primeiro';
    else if (selected)     triggerLabel = selected;
    else if (!slots.length) triggerLabel = 'Sem horários disponíveis';

    const disabled = !hasDate || !slots.length;

    return `
      <div class="tp-wrapper">
        <button type="button"
          class="dp-trigger ${selected ? 'dp-trigger--selected' : ''} ${disabled ? 'dp-trigger--disabled' : ''}"
          data-action="toggle-tp"
          ${disabled ? 'disabled' : ''}>
          <i data-lucide="clock" width="16" height="16"></i>
          <span class="dp-trigger__label">${triggerLabel}</span>
          <i data-lucide="chevron-down" width="14" height="14" class="dp-trigger__chevron"></i>
        </button>

        <div class="tp-list ${open ? 'tp-list--open' : ''}">
          <div class="tp-list__inner">
            ${slots.length === 0 ? `
              <div class="tp-empty">
                <i data-lucide="clock" width="20" height="20"></i>
                <span>Nenhum horario disponivel</span>
              </div>
            ` : slots.map(s => `
              <button type="button"
                class="tp-slot ${selected === s ? 'tp-slot--selected' : ''}"
                data-action="pick-time"
                data-time="${s}">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  afterMount() {
    if (window.lucide) window.lucide.createIcons({ root: this.el });

    const trigger = this.$('[data-action="toggle-tp"]');
    if (trigger) {
      this._addListener(trigger, 'click', (e) => {
        e.stopPropagation();
        this.setState({ open: !this.state.open });
      });
    }

    this._addListener(document, 'click', () => {
      if (this.state.open) this.setState({ open: false });
    });

    this.$$('[data-action="pick-time"]').forEach(btn => {
      this._addListener(btn, 'click', (e) => {
        e.stopPropagation();
        const time = btn.dataset.time;
        this.setState({ selected: time, open: false });
        this._onChange(time);
      });
    });
  }

  /** Atualiza a data externamente — recalcula slots e limpa horário inválido */
  setDate(dateStr) {
    this._date = dateStr;
    const slots      = this._getSlots();
    const stillValid = this.state.selected && slots.includes(this.state.selected);
    this.setState({ selected: stillValid ? this.state.selected : null, open: false });
    if (!stillValid) this._onChange(null);
  }

  /** Atualiza o bairro externamente — recalcula slots */
  setNeighborhood(neighborhood) {
    this._neighborhood = neighborhood;
    this.setDate(this._date);
  }
}
