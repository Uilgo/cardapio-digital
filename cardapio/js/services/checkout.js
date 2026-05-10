/**
 * checkout.js — Serviço de estado do fluxo de checkout
 *
 * Responsabilidade: manter, persistir e expor o estado das 4 etapas.
 * Usa sessionStorage para não perder dados em F5, mas limpar ao fechar o browser.
 */

const CHECKOUT_STORAGE_KEY = 'cardapio:checkout';

// ── Estado padrão ─────────────────────────────────────────────────────────────

function _emptyState() {
  return {
    currentStep: 1,
    completedSteps: [],

    customerData: {
      name: '',
      phone: '',
      email: '',
      cpf: '',
    },

    deliveryData: {
      type: 'delivery',   // 'delivery' | 'pickup'
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      reference: '',
      scheduledDate: null,
      scheduledTime: null,
      scheduleType: 'now', // 'now' | 'scheduled'
    },

    paymentData: {
      method: null,       // 'cash' | 'pix' | 'credit' | 'debit'
      changeFor: '',
    },

    observation: '',
  };
}

// ── Persistência ──────────────────────────────────────────────────────────────

function _save(state) {
  try {
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[checkout] Falha ao salvar no sessionStorage:', e);
  }
}

function _load() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── Estado em memória ─────────────────────────────────────────────────────────

let _state = _emptyState();

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Inicializa o checkout — carrega do sessionStorage ou cria estado vazio.
 */
export function initCheckout() {
  const saved = _load();
  _state = saved ?? _emptyState();
}

/** Retorna uma cópia do estado atual. */
export function getCheckoutState() {
  return { ..._state };
}

/**
 * Salva os dados de uma etapa e avança para a próxima.
 * @param {number} step  - Etapa concluída (1, 2 ou 3)
 * @param {Object} data  - Dados da etapa
 */
export function completeStep(step, data) {
  if (step === 1) _state.customerData = { ..._state.customerData, ...data };
  if (step === 2) _state.deliveryData = { ..._state.deliveryData, ...data };
  if (step === 3) _state.paymentData  = { ..._state.paymentData,  ...data };

  if (!_state.completedSteps.includes(step)) {
    _state.completedSteps = [..._state.completedSteps, step];
  }

  _state.currentStep = step + 1;
  _save(_state);
}

/**
 * Navega para uma etapa específica (usado pelo botão "Editar").
 * @param {number} step
 */
export function goToStep(step) {
  _state.currentStep = step;
  _save(_state);
}

/**
 * Atualiza a observação geral do pedido.
 * @param {string} text
 */
export function setObservation(text) {
  _state.observation = text;
  _save(_state);
}

/** Limpa todo o estado do checkout (chamado após envio do pedido). */
export function clearCheckout() {
  _state = _emptyState();
  try {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch (e) { /* silencioso */ }
}

// ── Helpers de horário ────────────────────────────────────────────────────────

/**
 * Verifica se o estabelecimento está aberto agora.
 * Suporta o novo formato de horários (array com periodos) do projeto antigo.
 * @param {Object} config - config.json
 * @returns {boolean}
 */
export function isStoreOpen(config) {
  if (!config) return false;

  // Modo manual: usa o campo `aberto` diretamente
  if (config.modo_funcionamento === 'manual') return config.aberto ?? false;

  // Modo automático: calcula pelo array de horarios
  if (!config.horarios?.length) return config.aberto ?? false;

  const now    = new Date();
  const dayIdx = now.getDay(); // 0=domingo ... 6=sabado
  const DAYS   = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayKey = DAYS[dayIdx];

  const slot = config.horarios.find(h => h.dia_semana === dayKey);
  if (!slot || !slot.aberto || !slot.periodos?.length) return false;

  const nowMins = now.getHours() * 60 + now.getMinutes();

  return slot.periodos.some(p => {
    const [oh, om] = p.horario_abertura.split(':').map(Number);
    const [ch, cm] = p.horario_fechamento.split(':').map(Number);
    return nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;
  });
}

/**
 * Retorna o próximo horário de abertura como string legível.
 * @param {Object} config
 * @returns {string}
 */
export function getNextOpenTime(config) {
  if (!config?.horarios?.length) return '';

  const now    = new Date();
  const DAYS   = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  for (let i = 0; i < 7; i++) {
    const dayIdx = (now.getDay() + i) % 7;
    const dayKey = DAYS[dayIdx];
    const slot   = config.horarios.find(h => h.dia_semana === dayKey);

    if (!slot || !slot.aberto || !slot.periodos?.length) continue;

    for (const p of slot.periodos) {
      const [oh, om] = p.horario_abertura.split(':').map(Number);
      const openMins = oh * 60 + om;
      const nowMins  = now.getHours() * 60 + now.getMinutes();

      // Hoje: só vale se o horário ainda não passou
      if (i === 0 && nowMins >= openMins) continue;

      const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : LABELS[dayIdx];
      return `${label} às ${p.horario_abertura}`;
    }
  }

  return '';
}

/**
 * Retorna os horários disponíveis para agendamento em um dia específico.
 * @param {Object} config
 * @param {Date}   date
 * @param {number} intervalMinutes
 * @returns {string[]}
 */
export function getAvailableTimeSlots(config, date, intervalMinutes = 30) {
  if (!config?.horarios?.length || !date) return [];

  const DAYS   = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayKey = DAYS[date.getDay()];
  const slot   = config.horarios.find(h => h.dia_semana === dayKey);

  if (!slot || !slot.aberto || !slot.periodos?.length) return [];

  const now     = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMins = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : 0;

  const slots = [];

  for (const p of slot.periodos) {
    const [oh, om] = p.horario_abertura.split(':').map(Number);
    const [ch, cm] = p.horario_fechamento.split(':').map(Number);
    const openMins  = oh * 60 + om;
    const closeMins = ch * 60 + cm;

    for (let m = openMins; m < closeMins; m += intervalMinutes) {
      if (m <= nowMins) continue;
      const h   = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }

  return slots;
}

/**
 * Retorna os próximos N dias disponíveis para agendamento.
 * @param {Object} config
 * @param {number} maxDays
 * @returns {{ date: Date, label: string }[]}
 */
export function getAvailableDays(config, maxDays = 7) {
  if (!config?.horarios?.length) return [];

  const DAYS   = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const days   = [];
  const today  = new Date();

  for (let i = 0; i <= maxDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const dayKey = DAYS[d.getDay()];
    const slot   = config.horarios.find(h => h.dia_semana === dayKey);

    if (!slot || !slot.aberto || !slot.periodos?.length) continue;

    if (i === 0 && !getAvailableTimeSlots(config, d).length) continue;

    let label;
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Amanhã';
    else label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

    days.push({ date: d, label });
  }

  return days;
}

/**
 * Formata a data de agendamento para exibição.
 * @param {string|null} dateStr
 * @param {string|null} timeStr
 * @returns {string}
 */
export function formatSchedule(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const d = new Date(dateStr);
  const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  return `${dayLabel} às ${timeStr}`;
}

// ── Bairro selecionado no carrinho ────────────────────────────────────────────

/**
 * Salva o bairro selecionado no carrinho (para pré-preencher o checkout).
 * @param {string} bairroNome
 */
export function setSelectedNeighborhood(bairroNome) {
  _state.deliveryData.neighborhood = bairroNome;
  _save(_state);
}

/**
 * Retorna o bairro atualmente selecionado.
 * @returns {string}
 */
export function getSelectedNeighborhood() {
  return _state.deliveryData.neighborhood || '';
}

/**
 * Calcula a taxa de entrega com base no tipo configurado e bairro selecionado.
 * @param {Object} config  - config.json
 * @param {string} bairro  - Nome do bairro (usado apenas em taxa_localizacao)
 * @returns {{ taxa: number, label: string, bairroEncontrado: boolean }}
 */
export function calcularTaxaEntrega(config, bairro = '') {
  if (!config) return { taxa: 0, label: 'Grátis', bairroEncontrado: false };

  const tipo = config.tipo_taxa_entrega ?? 'taxa_unica';

  if (tipo === 'sem_taxa') {
    return { taxa: 0, label: 'Grátis', bairroEncontrado: true };
  }

  if (tipo === 'taxa_unica') {
    const taxa = config.taxa_entrega ?? 0;
    return {
      taxa,
      label: taxa === 0 ? 'Grátis' : null, // null = formatar como moeda
      bairroEncontrado: true,
    };
  }

  if (tipo === 'taxa_localizacao') {
    if (!bairro) {
      return { taxa: 0, label: 'Selecione o bairro', bairroEncontrado: false };
    }

    const bairros = (config.taxas_por_localizacao ?? [])
      .filter(b => b.status === 'ativado' && b.nome && !b._doc_status);

    const normalizar = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const bairroNorm = normalizar(bairro);

    const encontrado = bairros.find(b => {
      const n = normalizar(b.nome);
      return n === bairroNorm || n.includes(bairroNorm) || bairroNorm.includes(n);
    });

    if (encontrado) {
      return {
        taxa: encontrado.taxa_valor,
        label: encontrado.taxa_valor === 0 ? 'Grátis' : null,
        bairroEncontrado: true,
        tempoMin: encontrado.tempo_min,
        tempoMax: encontrado.tempo_max,
      };
    }

    // Bairro não cadastrado — aplica taxa padrão se existir
    const taxaPadrao = config.taxa_padrao_outros_bairros ?? 0;
    if (taxaPadrao > 0) {
      return { taxa: taxaPadrao, label: null, bairroEncontrado: true };
    }

    return { taxa: 0, label: 'Bairro não atendido', bairroEncontrado: false };
  }

  return { taxa: 0, label: 'A calcular', bairroEncontrado: false };
}
