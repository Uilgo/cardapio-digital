/**
 * DatePicker.js — Calendário customizado para agendamento
 *
 * Props:
 *   value       {string}   — data selecionada 'YYYY-MM-DD' ou ''
 *   config      {Object}   — config.json (para ler horarios)
 *   onChange    {Function} — callback(dateStr: 'YYYY-MM-DD')
 *   maxDays     {number}   — máximo de dias no futuro (padrão: 30)
 */

import { Component } from '../base/Component.js';

const DAYS_PT   = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export class DatePicker extends Component {
  constructor(props = {}) {
    super(props);

    const today = this._today();
    const initial = props.value ? new Date(props.value + 'T00:00:00') : null;

    this.state = {
      // Mês/ano exibido no calendário
      viewYear:  initial ? initial.getFullYear()  : today.getFullYear(),
      viewMonth: initial ? initial.getMonth()      : today.getMonth(),
      // Data selecionada
      selected: props.value || null,
    };

    this._config  = props.config  || {};
    this._maxDays = props.maxDays || 30;
    this._onChange = props.onChange || (() => {});
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Data de hoje às 00:00:00 local */
  _today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Data máxima permitida */
  _maxDate() {
    const d = this._today();
    d.setDate(d.getDate() + this._maxDays);
    return d;
  }

  /** Verifica se um dia da semana (0=dom) está aberto no config */
  _isDayOpen(dayIndex) {
    const horarios = this._config.horarios;
    if (!horarios?.length) return true; // sem config = todos abertos
    const key = DAYS_PT[dayIndex];
    const slot = horarios.find(h => h.dia_semana === key);
    return slot ? (slot.aberto && slot.periodos?.length > 0) : false;
  }

  /** Verifica se uma data (Date) está disponível para agendamento */
  _isDateAvailable(date) {
    const today   = this._today();
    const maxDate = this._maxDate();
    if (date < today)    return false;
    if (date > maxDate)  return false;
    if (!this._isDayOpen(date.getDay())) return false;
    return true;
  }

  /** Formata Date → 'YYYY-MM-DD' */
  _toStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Formata 'YYYY-MM-DD' → Date local */
  _fromStr(str) {
    return new Date(str + 'T00:00:00');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const { viewYear, viewMonth, selected } = this.state;
    const today    = this._today();
    const todayStr = this._toStr(today);

    // Primeiro dia do mês e total de dias
    const firstDay  = new Date(viewYear, viewMonth, 1);
    const lastDay   = new Date(viewYear, viewMonth + 1, 0);
    const startDow  = firstDay.getDay(); // 0=dom
    const totalDays = lastDay.getDate();

    // Navegação: pode ir para mês anterior?
    const prevMonthDate = new Date(viewYear, viewMonth - 1, 1);
    const canGoPrev = prevMonthDate >= new Date(today.getFullYear(), today.getMonth(), 1);

    // Pode ir para mês seguinte?
    const maxDate = this._maxDate();
    const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
    const canGoNext = nextMonthDate <= new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

    // Células do calendário
    const cells = [];

    // Células vazias antes do dia 1
    for (let i = 0; i < startDow; i++) {
      cells.push(`<div class="dp-cell dp-cell--empty"></div>`);
    }

    // Dias do mês
    for (let d = 1; d <= totalDays; d++) {
      const date    = new Date(viewYear, viewMonth, d);
      const dateStr = this._toStr(date);
      const avail   = this._isDateAvailable(date);
      const isToday = dateStr === todayStr;
      const isSel   = dateStr === selected;

      let cls = 'dp-cell';
      if (!avail)  cls += ' dp-cell--disabled';
      if (isToday) cls += ' dp-cell--today';
      if (isSel)   cls += ' dp-cell--selected';

      cells.push(`
        <button type="button" class="${cls}"
          ${avail ? `data-action="pick-date" data-date="${dateStr}"` : 'disabled'}
          aria-label="${d} de ${MONTHS_PT[viewMonth]}"
          aria-pressed="${isSel}">
          ${d}
        </button>
      `);
    }

    // Label da data selecionada
    const selectedLabel = selected
      ? this._fromStr(selected).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      : 'Selecione uma data';

    return `
      <div class="dp-wrapper">
        <!-- Trigger -->
        <button type="button" class="dp-trigger ${selected ? 'dp-trigger--selected' : ''}" data-action="toggle-dp">
          <i data-lucide="calendar" width="16" height="16"></i>
          <span class="dp-trigger__label">${selectedLabel}</span>
          <i data-lucide="chevron-down" width="14" height="14" class="dp-trigger__chevron"></i>
        </button>

        <!-- Calendário -->
        <div class="dp-calendar ${this.state.open ? 'dp-calendar--open' : ''}">
          <!-- Header do mês -->
          <div class="dp-header">
            <button type="button" class="dp-nav-btn" data-action="prev-month" ${!canGoPrev ? 'disabled' : ''}>
              <i data-lucide="chevron-left" width="16" height="16"></i>
            </button>
            <span class="dp-month-label">${MONTHS_PT[viewMonth]} ${viewYear}</span>
            <button type="button" class="dp-nav-btn" data-action="next-month" ${!canGoNext ? 'disabled' : ''}>
              <i data-lucide="chevron-right" width="16" height="16"></i>
            </button>
          </div>

          <!-- Labels dos dias da semana -->
          <div class="dp-weekdays">
            ${WEEK_LABELS.map(l => `<div class="dp-weekday">${l}</div>`).join('')}
          </div>

          <!-- Grade de dias -->
          <div class="dp-grid">
            ${cells.join('')}
          </div>
        </div>
      </div>
    `;
  }

  afterMount() {
    if (window.lucide) window.lucide.createIcons({ root: this.el });

    // Toggle do calendário
    const trigger = this.$('[data-action="toggle-dp"]');
    if (trigger) {
      this._addListener(trigger, 'click', (e) => {
        e.stopPropagation();
        this.setState({ open: !this.state.open });
      });
    }

    // Fechar ao clicar fora
    this._addListener(document, 'click', () => {
      if (this.state.open) this.setState({ open: false });
    });

    // Navegação de mês
    const prevBtn = this.$('[data-action="prev-month"]');
    if (prevBtn) {
      this._addListener(prevBtn, 'click', (e) => {
        e.stopPropagation();
        let { viewYear, viewMonth } = this.state;
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        this.setState({ viewYear, viewMonth });
      });
    }

    const nextBtn = this.$('[data-action="next-month"]');
    if (nextBtn) {
      this._addListener(nextBtn, 'click', (e) => {
        e.stopPropagation();
        let { viewYear, viewMonth } = this.state;
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        this.setState({ viewYear, viewMonth });
      });
    }

    // Selecionar dia
    this.$$('[data-action="pick-date"]').forEach(btn => {
      this._addListener(btn, 'click', (e) => {
        e.stopPropagation();
        const date = btn.dataset.date;
        this.setState({ selected: date, open: false });
        this._onChange(date);
      });
    });
  }

  /** Atualiza o valor externamente */
  setValue(dateStr) {
    if (dateStr) {
      const d = this._fromStr(dateStr);
      this.setState({ selected: dateStr, viewYear: d.getFullYear(), viewMonth: d.getMonth() });
    } else {
      this.setState({ selected: null });
    }
  }
}
