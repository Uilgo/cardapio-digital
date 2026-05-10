/**
 * ProductDrawer.js — Drawer lateral de produto (Desktop ≥768px)
 * Usa as classes do modal.css e variáveis CSS do projeto.
 */

import { Component } from "../base/Component.js";
import { formatCurrency } from "../../services/formatter.js";
import { QuantitySelector } from "../ui/QuantitySelector.js";
import { escapeHtml } from "../../utils.js";
import {
  getAdditionGroupsForProduct,
  getAdditionGroupById,
  getCategoryById,
  getProductsByGroup,
  resolvePromocao,
  calcularPrecoComPromocao,
} from "../../services/data.js";

export class ProductDrawer extends Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      isOpen: false,
      product: null,
      variacaoSelecionada: null,
      quantity: 1,
      adicionaisSelecionados: [],
      observation: "",
      grupoExpandidoId: null,
      // Novos estados para divisão de sabores
      numSabores: 1,
      saboresExtras: [], // Array de objetos { product, variacao }
      isDivisaoSaboresOpen: false,
    };
    this.qtySelector = null;
  }

  _calcularTotal() {
    const {
      variacaoSelecionada,
      adicionaisSelecionados,
      quantity,
      saboresExtras,
      numSabores,
    } = this.state;

    let precoBase = this._resolverPreco(variacaoSelecionada);

    // Se houver múltiplos sabores, pegamos o preço do mais caro (regra padrão)
    if (numSabores > 1 && saboresExtras.length > 0) {
      saboresExtras.forEach((sabor) => {
        if (sabor.variacao) {
          const precoSabor = this._resolverPreco(sabor.variacao, sabor.product);
          if (precoSabor > precoBase) precoBase = precoSabor;
        }
      });
    }

    const precoAdicionais = adicionaisSelecionados.reduce(
      (s, a) => s + a.preco * (a.quantidade ?? 1),
      0,
    );
    return (precoBase + precoAdicionais) * quantity;
  }

  // Helper para resolver preço considerando sabor específico
  _resolverPreco(variacao, productOverride = null) {
    const product = productOverride || this.state.product;
    if (!variacao) return 0;
    const categoria = getCategoryById(product.categoriaId);
    const promocao = resolvePromocao(variacao, product, categoria);
    return calcularPrecoComPromocao(variacao.preco, promocao);
  }

  render() {
    const {
      isOpen,
      product,
      variacaoSelecionada,
      quantity,
      adicionaisSelecionados,
      observation,
    } = this.state;

    if (!product) {
      return `
        <div class="drawer-host">
          <div class="overlay ${isOpen ? "overlay--visible" : ""}" data-action="close"></div>
          <aside class="drawer ${isOpen ? "drawer--open" : ""}" id="product-drawer" aria-hidden="${!isOpen}"></aside>
        </div>`;
    }

    const categoria = getCategoryById(product.categoriaId);
    const variacoes = product.variacoes?.filter((v) => v.ativo) ?? [];
    const gruposAdicionais = getAdditionGroupsForProduct(product);
    const total = this._calcularTotal();

    const isPromo = product.preco_promocional && product.preco_promocional > 0;
    const productSubtitle = variacaoSelecionada
      ? variacaoSelecionada.nome
      : product.variacoes && product.variacoes.length > 0
        ? product.variacoes[0].nome
        : "";

    // Preço para o header (considera variação selecionada ou preço base)
    let precoHeader = isPromo ? product.preco_promocional : product.preco || 0;
    let nomeVariacao = "";

    if (variacaoSelecionada) {
      const promo = resolvePromocao(variacaoSelecionada, product, categoria);
      precoHeader = calcularPrecoComPromocao(variacaoSelecionada.preco, promo);
      nomeVariacao = variacaoSelecionada.nome;
    }

    // --- Variações em lista ---
    const variacoesHtml =
      variacoes.length > 0
        ? `
      <div class="product-detail__section">
        <div class="product-detail__section-header">
          <i data-lucide="ruler" class="product-detail__section-icon"></i>
          <h3 class="product-detail__section-title">Escolha o tamanho${product.obrigatorio !== false ? ` <span class="product-detail__required">*</span>` : ""}</h3>
        </div>
        <div class="variation-list">
          ${variacoes
            .map((v, i) => {
              const promo = resolvePromocao(v, product, categoria);
              const precoFinal = calcularPrecoComPromocao(v.preco, promo);
              const sel = variacaoSelecionada?.id === v.id;
              return `
            <label class="variation-item ${sel ? "variation-item--selected" : ""}">
              <input type="radio" name="variacao" value="${escapeHtml(v.id)}" ${sel ? "checked" : ""} style="display:none">
              <span class="variation-item__number">${i + 1}</span>
              <span class="variation-item__info">
                <span class="variation-item__name">${escapeHtml(v.nome)}</span>
                <span class="variation-item__price">${formatCurrency(precoFinal)}</span>
              </span>
              <span class="variation-item__check"><i data-lucide="check"></i></span>
            </label>`;
            })
            .join("")}
        </div>
      </div>`
        : "";

    const grupoExpandidoId = this.state.grupoExpandidoId;

    // --- Adicionais em accordion JS-controlado ---
    const getGroupIcon = (name) => {
      const n = name.toLowerCase();
      if (n.includes("borda")) return "pizza";
      if (n.includes("extra") || n.includes("adicional")) return "plus-circle";
      if (n.includes("bebida")) return "cup-soda";
      if (n.includes("ingrediente")) return "utensils";
      return "plus-circle";
    };

    const adicionaisHtml = gruposAdicionais
      .map((grupo) => {
        // Conta total selecionado no grupo considerando quantidades
        const totalSel = adicionaisSelecionados
          .filter((s) => s.grupoId === grupo.id)
          .reduce((acc, s) => acc + (s.quantidade ?? 1), 0);

        let labelProgresso = `Escolha até ${grupo.maxSelecao} ${grupo.maxSelecao === 1 ? "item" : "itens"}`;
        if (grupo.obrigatorio && totalSel === 0) {
          labelProgresso = `Escolha ${grupo.minSelecao} ${grupo.minSelecao === 1 ? "item" : "itens"}`;
        } else if (totalSel > 0) {
          labelProgresso = `${totalSel} de ${grupo.maxSelecao} selecionados`;
        }

        const isExpanded = grupoExpandidoId === grupo.id;
        const progressPct = Math.min(
          (totalSel / (grupo.maxSelecao || 1)) * 100,
          100,
        );

        const itens = grupo.adicionais
          .filter((a) => a.ativo)
          .map((add) => {
            const maxUnidades = add.maxUnidades ?? 1;
            const selecionado = adicionaisSelecionados.find(
              (s) => String(s.id) === String(add.id),
            );
            const qtdAtual = selecionado?.quantidade ?? 0;
            const isChecked = qtdAtual > 0;

            // Total já selecionado no grupo (contando quantidades)
            const totalNoGrupo = adicionaisSelecionados
              .filter((s) => s.grupoId === grupo.id)
              .reduce((acc, s) => acc + (s.quantidade ?? 1), 0);
            const grupoLleno = totalNoGrupo >= grupo.maxSelecao;

            if (maxUnidades === 1) {
              // Checkbox simples — não faz sentido empilhar
              return `
              <label class="additional-item ${isChecked ? "additional-item--checked" : ""} ${grupoLleno && !isChecked ? "additional-item--disabled" : ""}">
                <span class="additional-item__info">
                  <span class="additional-item__name">${escapeHtml(add.nome)}</span>
                  <span class="additional-item__price">${add.preco > 0 ? "+ " + formatCurrency(add.preco) : "Grátis"}</span>
                </span>
                <input type="checkbox" name="adicional-${escapeHtml(grupo.id)}" class="additional-item__checkbox"
                  data-adicional-id="${escapeHtml(add.id)}" data-grupo-id="${escapeHtml(grupo.id)}"
                  data-preco="${add.preco}" data-nome="${escapeHtml(add.nome)}"
                  data-max-unidades="1"
                  ${isChecked ? "checked" : ""}
                  ${grupoLleno && !isChecked ? "disabled" : ""}>
              </label>`;
            } else {
              // Controle de quantidade — faz sentido empilhar (ex: 2x bacon)
              const podeAumentar = qtdAtual < maxUnidades && !grupoLleno;
              const podeDiminuir = qtdAtual > 0;
              return `
              <div class="additional-item additional-item--qty ${isChecked ? "additional-item--checked" : ""}">
                <span class="additional-item__info">
                  <span class="additional-item__name">${escapeHtml(add.nome)}</span>
                  <span class="additional-item__price">${add.preco > 0 ? "+ " + formatCurrency(add.preco) : "Grátis"}</span>
                  ${maxUnidades > 1 ? `<span class="additional-item__max">máx. ${maxUnidades}x</span>` : ""}
                </span>
                <div class="additional-item__qty-ctrl"
                  data-adicional-id="${escapeHtml(add.id)}"
                  data-grupo-id="${escapeHtml(grupo.id)}"
                  data-preco="${add.preco}"
                  data-nome="${escapeHtml(add.nome)}"
                  data-max-unidades="${maxUnidades}">
                  <button type="button" class="additional-item__qty-btn" data-action="adicional-decrease"
                    ${!podeDiminuir ? "disabled" : ""}>
                    <i data-lucide="${qtdAtual === 1 ? "trash-2" : "minus"}" width="12" height="12"></i>
                  </button>
                  <span class="additional-item__qty-value">${qtdAtual}</span>
                  <button type="button" class="additional-item__qty-btn" data-action="adicional-increase"
                    ${!podeAumentar ? "disabled" : ""}>
                    <i data-lucide="plus" width="12" height="12"></i>
                  </button>
                </div>
              </div>`;
            }
          })
          .join("");

        return `
      <div class="additionals-accordion ${isExpanded ? "additionals-accordion--open" : ""}" data-grupo-id="${escapeHtml(grupo.id)}">
        <button type="button" class="additionals-accordion__header" data-action="toggle-grupo" data-grupo="${escapeHtml(grupo.id)}">
          <div class="additionals-accordion__title-group">
            <div class="additionals-accordion__icon-box ${isExpanded ? "additionals-accordion__icon-box--active" : ""}">
              <i data-lucide="${getGroupIcon(grupo.nome)}"></i>
            </div>
            <div class="additionals-accordion__title-text">
              <h4 class="additionals-accordion__title">
                ${escapeHtml(grupo.nome)}${grupo.obrigatorio ? ` <span class="product-detail__required">*</span>` : ""}
              </h4>
              <span class="additionals-accordion__subtitle">${labelProgresso}</span>
            </div>
          </div>
          <div class="additionals-accordion__meta">
            <div class="additionals-accordion__progress">
              <div class="additionals-accordion__progress-bar" style="width:${progressPct}%"></div>
            </div>
            <i data-lucide="chevron-down" class="additionals-accordion__icon ${isExpanded ? "additionals-accordion__icon--rotated" : ""}"></i>
          </div>
        </button>
        ${
          isExpanded
            ? `
        <div class="additionals-accordion__content">
          ${grupo.descricao ? `<p class="additionals__description">${escapeHtml(grupo.descricao)}</p>` : ""}
          ${itens}
        </div>`
            : ""
        }
      </div>`;
      })
      .join("");

    return `
      <div class="drawer-host">
        <div class="overlay ${isOpen ? "overlay--visible" : ""}" data-action="close" aria-hidden="${!isOpen}"></div>
        <aside class="drawer ${isOpen ? "drawer--open" : ""}" id="product-drawer" aria-hidden="${!isOpen}" role="dialog" aria-labelledby="drawer-title">
          
          <header class="drawer__header">
            <div class="product-detail__header-info">
              <h2 class="product-detail__title" id="drawer-title">${escapeHtml(product.nome)}</h2>
              <div class="product-detail__header-meta">
                <span class="product-detail__price-badge">
                  <i data-lucide="tag"></i>
                  ${formatCurrency(precoHeader)}
                </span>
                ${productSubtitle ? `<span class="product-detail__subtitle">${escapeHtml(productSubtitle)}</span>` : ""}
              </div>
            </div>
            <button class="drawer__close-btn" data-action="close" type="button" aria-label="Fechar">
              <i data-lucide="x"></i>
            </button>
          </header>

          <div class="drawer__body" id="drawer-body">
            <div class="product-detail__content">
              
              ${
                product.imagem
                  ? `
              <div class="product-detail__image-container">
                <img src="${escapeHtml(product.imagem)}" class="product-detail__image" alt="${escapeHtml(product.nome)}">
                ${isPromo ? `<span class="product-detail__promo-badge"><i data-lucide="tag"></i> Promoção</span>` : ""}
              </div>`
                  : ""
              }

              <div class="product-detail__info-card">
                <div class="product-detail__info-title">
                  <i data-lucide="info"></i>
                  <span>Sobre este produto</span>
                </div>
                <p class="product-detail__info-text">${product.descricao ? escapeHtml(product.descricao) : "Delicioso item preparado com ingredientes selecionados."}</p>
              </div>

              ${variacoesHtml}

              ${this._renderDivisaoSabores()}

              ${
                gruposAdicionais.length > 0
                  ? `
                <div class="product-detail__section">
                  <div class="product-detail__section-header">
                    <i data-lucide="list-plus" class="product-detail__section-icon"></i>
                    <h3 class="product-detail__section-title">Personalize seu pedido</h3>
                  </div>
                  <div class="additionals-list">
                    ${adicionaisHtml}
                  </div>
                </div>
              `
                  : ""
              }

              <div class="observation-field">
                <label class="observation-field__label" for="drawer-obs">
                  <i data-lucide="message-square"></i> Alguma observação?
                </label>
                <textarea id="drawer-obs" class="observation-field__textarea" 
                  placeholder="Ex: Sem cebola, bem passado..." rows="3">${escapeHtml(observation)}</textarea>
              </div>

            </div>
          </div>

          <footer class="drawer__footer">
            <div class="product-detail__footer-card">
              <div class="product-detail__footer-top">
                <div class="product-detail__total-info">
                  <div class="product-detail__total-icon">
                    <i data-lucide="shopping-bag"></i>
                  </div>
                  <div>
                    <p class="product-detail__total-label">Total do pedido</p>
                    <p class="product-detail__total-price">${formatCurrency(total)}</p>
                  </div>
                </div>
                <div id="drawer-qty-container"></div>
              </div>
              
              <div class="product-detail__footer-divider"></div>

              <button class="btn btn--primary btn--full" data-action="add-to-cart" type="button">
                <i data-lucide="shopping-cart"></i>
                <span>Adicionar ao carrinho</span>
              </button>
            </div>
          </footer>

        </aside>
      </div>`;
  }

  setState(patch) {
    const body = this.$(".drawer__body");
    const scrollTop = body ? body.scrollTop : 0;

    super.setState(patch);

    const newBody = this.$(".drawer__body");
    if (newBody) newBody.scrollTop = scrollTop;
  }

  afterMount() {
    if (window.lucide) {
      window.lucide.createIcons({
        root: this.el,
        attrs: { class: "lucide-icon" },
      });
    }

    // Fecha o drawer quando o usuário aperta o botão "voltar" do navegador
    this._addListener(window, "popstate", () => {
      if (this.state.isOpen) {
        document.body.classList.remove("modal-open");
        this.setState({ isOpen: false });
      }
    });

    const { product, quantity, isOpen, grupoExpandidoId } = this.state;
    if (!product || !isOpen) return;

    // Scroll para o grupo expandido se ele acabou de abrir
    if (grupoExpandidoId && grupoExpandidoId !== this._lastOpenedGrupoId) {
      const accordion = this.$(`[data-grupo-id="${grupoExpandidoId}"]`);
      const body = this.$(".drawer__body");
      if (accordion && body) {
        // Delay pequeno para garantir que o DOM foi pintado e o accordion expandiu
        setTimeout(() => {
          const bodyRect = body.getBoundingClientRect();
          const accordionRect = accordion.getBoundingClientRect();
          // Calcula a posição do accordion relativa ao topo do corpo do modal
          const scrollTarget =
            accordionRect.top - bodyRect.top + body.scrollTop;

          body.scrollTo({
            top: scrollTarget - 12, // 12px de respiro/compensação
            behavior: "smooth",
          });
        }, 60);
      }
    }
    this._lastOpenedGrupoId = grupoExpandidoId;

    const qtyContainer = this.$("#drawer-qty-container");
    if (qtyContainer) {
      this.qtySelector = new QuantitySelector({ quantity, size: "lg" });
      this.qtySelector.mount(qtyContainer);
      this.qtySelector.on("quantity:change", (e) => {
        this.setState({ quantity: e.detail.quantity });
      });
    }

    // Fechar drawer
    this.$$('[data-action="close"]').forEach((el) => {
      this._addListener(el, "click", () => this.close());
    });

    // Toggle dos grupos de adicionais
    this.$$('[data-action="toggle-grupo"]').forEach((btn) => {
      this._addListener(btn, "click", (e) => {
        const grupoId = e.currentTarget.dataset.grupo;
        this.setState({
          grupoExpandidoId:
            this.state.grupoExpandidoId === grupoId ? null : grupoId,
        });
      });
    });

    // Seleção de variação
    this.$$('input[name="variacao"]').forEach((radio) => {
      this._addListener(radio, "change", (e) => {
        const variacao = this.state.product.variacoes?.find(
          (v) => v.id === e.target.value,
        );
        if (variacao) {
          // Atualiza também as variações dos sabores extras para manter o tamanho
          const novosSaboresExtras = this.state.saboresExtras.map((s) => {
            const novaVar = s.product.variacoes?.find(
              (v) => v.nome === variacao.nome,
            );
            return { ...s, variacao: novaVar || s.variacao };
          });
          this.setState({
            variacaoSelecionada: variacao,
            saboresExtras: novosSaboresExtras,
          });
        }
      });
    });

    // Toggle divisão de sabores
    this.$$('[data-action="toggle-divisao"]').forEach((btn) => {
      this._addListener(btn, "click", () => {
        const nextState = !this.state.isDivisaoSaboresOpen;
        this.setState({
          isDivisaoSaboresOpen: nextState,
          numSabores: nextState ? Math.max(this.state.numSabores, 2) : 1,
          saboresExtras: !nextState ? [] : this.state.saboresExtras,
        });
      });
    });

    // Mudar número de sabores
    this.$$('[data-action="set-num-sabores"]').forEach((btn) => {
      this._addListener(btn, "click", (e) => {
        const val = parseInt(e.target.dataset.value);
        this.setState({
          numSabores: val,
          saboresExtras: val === 1 ? [] : this.state.saboresExtras,
        });
      });
    });

    // Abrir/Fechar seleção de sabores
    this.$$('[data-action="open-flavor-select"]').forEach((el) => {
      this._addListener(el, "click", (e) => {
        const index = e.currentTarget.dataset.index;
        const slot = e.currentTarget;
        this.currentSaborIndex = index; // Armazena qual slot está sendo editado

        const list = this.$("#flavor-select-list");
        if (list) {
          slot.appendChild(list); // Move o dropdown para dentro do slot clicado
          list.style.display = "flex";
          const searchInput = list.querySelector("#flavor-search");
          if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
          }
        }
      });
    });

    this.$$('[data-action="close-flavor-select"]').forEach((el) => {
      this._addListener(el, "click", (e) => {
        e.stopPropagation();
        const list = this.$("#flavor-select-list");
        if (list) list.style.display = "none";
      });
    });

    // Selecionar sabor extra
    this.$$('[data-action="select-extra-flavor"]').forEach((btn) => {
      this._addListener(btn, "click", (e) => {
        const pId = e.currentTarget.dataset.productId;
        this._selecionarSaborExtra(pId);
      });
    });

    // Busca de sabores
    const flavorSearch = this.$("#flavor-search");
    if (flavorSearch) {
      this._addListener(flavorSearch, "input", (e) => {
        const container = this.$("#flavor-items-container");
        if (container) {
          container.innerHTML = this._renderFlavorItems(e.target.value);
          // Re-inicializa ícones e listeners
          if (window.lucide) window.lucide.createIcons({ root: container });
          this.$$('[data-action="select-extra-flavor"]', container).forEach(
            (btn) => {
              this._addListener(btn, "click", (ev) => {
                const pId = ev.currentTarget.dataset.productId;
                this._selecionarSaborExtra(pId);
              });
            },
          );
        }
      });
    }

    // Seleção de adicionais — checkbox simples (maxUnidades === 1)
    this.$$(".additional-item__checkbox").forEach((input) => {
      this._addListener(input, "change", (e) => {
        const id = e.target.dataset.adicionalId;
        const preco = parseFloat(e.target.dataset.preco);
        const nome = e.target.dataset.nome;
        const grupoId = e.target.dataset.grupoId;
        const grupo = getAdditionGroupById(grupoId);

        let novos = [...this.state.adicionaisSelecionados];

        if (grupo.maxSelecao === 1) {
          const IDsDoGrupo = grupo.adicionais.map((a) => String(a.id));
          novos = novos.filter((a) => !IDsDoGrupo.includes(String(a.id)));
          if (e.target.checked)
            novos.push({ id, nome, preco, grupoId, quantidade: 1 });
        } else {
          const totalNoGrupo = novos
            .filter((s) => s.grupoId === grupoId)
            .reduce((acc, s) => acc + (s.quantidade ?? 1), 0);

          if (e.target.checked) {
            if (grupo && grupo.maxSelecao && totalNoGrupo >= grupo.maxSelecao) {
              e.target.checked = false;
              const header = this.$(
                `.additionals-accordion[data-grupo-id="${grupoId}"] .additionals-accordion__header`,
              );
              if (header) {
                header.classList.remove("shake");
                void header.offsetWidth;
                header.classList.add("shake");
              }
              return;
            }
            novos.push({ id, nome, preco, grupoId, quantidade: 1 });
          } else {
            novos = novos.filter((a) => String(a.id) !== String(id));
          }
        }
        this.setState({ adicionaisSelecionados: novos });
      });
    });

    // Adicionais com quantidade empilhável (maxUnidades > 1) — botões − e +
    this.$$(".additional-item__qty-ctrl").forEach((ctrl) => {
      this._addListener(ctrl, "click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const id = ctrl.dataset.adicionalId;
        const preco = parseFloat(ctrl.dataset.preco);
        const nome = ctrl.dataset.nome;
        const grupoId = ctrl.dataset.grupoId;
        const maxUnidades = parseInt(ctrl.dataset.maxUnidades ?? 1);
        const grupo = getAdditionGroupById(grupoId);

        let novos = [...this.state.adicionaisSelecionados];
        const idx = novos.findIndex((s) => String(s.id) === String(id));
        const qtdAtual = idx !== -1 ? (novos[idx].quantidade ?? 1) : 0;

        const totalNoGrupo = novos
          .filter((s) => s.grupoId === grupoId)
          .reduce((acc, s) => acc + (s.quantidade ?? 1), 0);

        if (action === "adicional-increase") {
          if (qtdAtual >= maxUnidades) return;
          if (totalNoGrupo >= grupo.maxSelecao) {
            const header = this.$(
              `.additionals-accordion[data-grupo-id="${grupoId}"] .additionals-accordion__header`,
            );
            if (header) {
              header.classList.remove("shake");
              void header.offsetWidth;
              header.classList.add("shake");
            }
            return;
          }
          if (idx !== -1) {
            novos[idx] = { ...novos[idx], quantidade: qtdAtual + 1 };
          } else {
            novos.push({ id, nome, preco, grupoId, quantidade: 1 });
          }
        } else if (action === "adicional-decrease") {
          if (qtdAtual <= 0) return;
          if (qtdAtual === 1) {
            novos = novos.filter((s) => String(s.id) !== String(id));
          } else {
            novos[idx] = { ...novos[idx], quantidade: qtdAtual - 1 };
          }
        }

        this.setState({ adicionaisSelecionados: novos });
      });
    });

    // Observação
    const obsTextarea = this.$("#drawer-obs");
    if (obsTextarea) {
      this._addListener(obsTextarea, "input", (e) => {
        this.state.observation = e.target.value;
      });
    }

    // Adicionar ao carrinho
    const addBtn = this.$('[data-action="add-to-cart"]');
    if (addBtn) {
      this._addListener(addBtn, "click", () => {
        const {
          product,
          variacaoSelecionada,
          quantity,
          adicionaisSelecionados,
          observation,
          numSabores,
          saboresExtras,
        } = this.state;
        const grupos = getAdditionGroupsForProduct(product);

        // Validação de grupos obrigatórios
        for (const grupo of grupos) {
          if (grupo.obrigatorio) {
            const selecionados = adicionaisSelecionados.filter(
              (a) => a.grupoId === grupo.id,
            ).length;
            if (selecionados < (grupo.minSelecao || 1)) {
              // Grupo obrigatório não preenchido!
              const accordion = this.$(
                `.additionals-accordion[data-grupo-id="${grupo.id}"]`,
              );
              const header = accordion?.querySelector(
                ".additionals-accordion__header",
              );

              if (header) {
                this.setState({ grupoExpandidoId: grupo.id });
                setTimeout(() => {
                  header.classList.remove("shake");
                  void header.offsetWidth;
                  header.classList.add("shake");
                  header.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }, 100);
              }

              if (window.Toast) {
                window.Toast.error(
                  `Por favor, selecione os itens obrigatórios em "${grupo.nome}"`,
                );
              }
              return;
            }
          }
        }

        window.dispatchEvent(
          new CustomEvent("cart:add", {
            detail: {
              product,
              variacao: variacaoSelecionada,
              quantity,
              adicionais: adicionaisSelecionados,
              observation,
              // Dados da divisão de sabores para o carrinho
              meiaMeia:
                numSabores > 1 && saboresExtras.length > 0
                  ? {
                      sabores: [
                        { id: product.id, nome: product.nome },
                        ...saboresExtras.map((s) => ({
                          id: s.product.id,
                          nome: s.product.nome,
                        })),
                      ],
                    }
                  : null,
            },
          }),
        );
        this.close();
      });
    }
  }

  _renderDivisaoSabores() {
    const {
      product,
      numSabores,
      saboresExtras,
      isDivisaoSaboresOpen,
      variacaoSelecionada,
    } = this.state;
    const categoria = getCategoryById(product.categoriaId);

    if (!categoria?.config?.permitirMeiasMeias) return "";

    const maxSabores = categoria.config.maxSabores || 2;

    const botoesSabores = [];
    for (let i = 2; i <= maxSabores; i++) {
      botoesSabores.push(`
        <button type="button" class="flavor-btn ${numSabores === i ? "flavor-btn--active" : ""}" 
          data-action="set-num-sabores" data-value="${i}">
          ${i} sabores
        </button>
      `);
    }

    const slots = [];
    slots.push(`
      <div class="flavor-slot flavor-slot--selected">
        <div class="flavor-slot__number">1</div>
        <div class="flavor-slot__info">
          <span class="flavor-slot__name">${escapeHtml(product.nome)}</span>
          <span class="flavor-slot__type">Sabor principal</span>
        </div>
        <i data-lucide="lock" class="flavor-slot__lock"></i>
      </div>
    `);

    for (let i = 2; i <= numSabores; i++) {
      const indexExtra = i - 2;
      const saborExtra = saboresExtras[indexExtra];

      if (saborExtra) {
        slots.push(`
          <div class="flavor-slot flavor-slot--selected">
            <div class="flavor-slot__number">${i}</div>
            <div class="flavor-slot__info">
              <span class="flavor-slot__name">${escapeHtml(saborExtra.product.nome)}</span>
              <span class="flavor-slot__type">Sabor adicional</span>
            </div>
            <button type="button" class="flavor-slot__change" data-action="open-flavor-select" data-index="${indexExtra}">
              <i data-lucide="refresh-cw"></i> Trocar
            </button>
          </div>
        `);
      } else {
        slots.push(`
          <div class="flavor-slot flavor-slot--empty" data-action="open-flavor-select" data-index="${indexExtra}">
            <div class="flavor-slot__number">${i}</div>
            <div class="flavor-slot__placeholder">Selecione um sabor</div>
            <i data-lucide="chevron-down"></i>
          </div>
        `);
      }
    }

    return `
      <div class="product-detail__section">
        <div class="flavor-division ${isDivisaoSaboresOpen ? "flavor-division--open" : ""}">
          <button type="button" class="flavor-division__header" data-action="toggle-divisao">
            <div class="flavor-division__title-group">
              <div class="flavor-division__icon-box">
                <i data-lucide="split"></i>
              </div>
              <div class="flavor-division__title-text">
                <h4 class="flavor-division__title">Quer dividir seu sabor?</h4>
                <span class="flavor-division__subtitle">Personalize com até ${maxSabores} sabores</span>
              </div>
            </div>
            <i data-lucide="chevron-down" class="flavor-division__chevron ${isDivisaoSaboresOpen ? "flavor-division__chevron--rotated" : ""}"></i>
          </button>

          ${
            isDivisaoSaboresOpen
              ? `
            <div class="flavor-division__content" style="position: relative;">
              <div class="flavor-division__options">
                <p class="flavor-division__label">Quantos sabores? <span class="product-detail__required">*</span></p>
                <div class="flavor-division__buttons">
                  ${botoesSabores.join("")}
                </div>
              </div>

              <div class="flavor-division__slots">
                <p class="flavor-division__label">Escolha os sabores</p>
                ${slots.join("")}
              </div>

              <div class="flavor-select-list" style="display: none;" id="flavor-select-list">
                <div class="flavor-select-list__header">
                  <div class="flavor-select-list__search-wrapper">
                    <i data-lucide="search" class="flavor-select-list__search-icon"></i>
                    <input type="text" class="flavor-select-list__search" id="flavor-search" placeholder="Buscar sabor...">
                  </div>
                  <button type="button" class="flavor-select-list__close" data-action="close-flavor-select">
                    <i data-lucide="x"></i>
                  </button>
                </div>
                <div class="flavor-select-list__items" id="flavor-items-container">
                  ${this._renderFlavorItems("")}
                </div>
              </div>

            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  // Helper para renderizar itens de sabor filtrados
  _renderFlavorItems(filter = "") {
    const { product, variacaoSelecionada } = this.state;
    const searchTerm = filter.toLowerCase();

    return (
      getProductsByGroup(product.categoriaId)
        .filter((p) => p.id !== product.id)
        .filter((p) => p.nome.toLowerCase().includes(searchTerm))
        .map((p) => {
          const varCorrespondente = p.variacoes?.find(
            (v) => v.nome === variacaoSelecionada?.nome,
          );
          const preco = varCorrespondente
            ? this._resolverPreco(varCorrespondente, p)
            : 0;
          return `
          <button type="button" class="flavor-select-item" data-action="select-extra-flavor" data-product-id="${p.id}">
            <div class="flavor-select-item__info">
              <span class="flavor-select-item__name">${escapeHtml(p.nome)}</span>
              <span class="flavor-select-item__price">${preco > 0 ? formatCurrency(preco) : ""}</span>
            </div>
            <i data-lucide="plus"></i>
          </button>
        `;
        })
        .join("") ||
      '<p class="text-center p-4 text-muted">Nenhum sabor encontrado.</p>'
    );
  }

  open(product) {
    const primeiraVariacao = product.variacoes?.find((v) => v.ativo) ?? null;
    // Adiciona hash na URL para deep-linking e botão "voltar" do navegador
    history.pushState({ productId: product.id }, "", `#produto/${product.id}`);

    this.setState({
      isOpen: true,
      product,
      variacaoSelecionada: primeiraVariacao,
      quantity: 1,
      adicionaisSelecionados: [],
      observation: "",
      grupoExpandidoId: null,
      numSabores: 1,
      saboresExtras: [],
      isDivisaoSaboresOpen: false,
    });
  }

  close() {

    // Volta na história se o hash do produto estiver na URL
    if (location.hash.startsWith("#produto/")) {
      history.back();
    }

    this.setState({ isOpen: false });
  }

  _selecionarSaborExtra(productId) {
    const outroSabor = getProductsByGroup(this.state.product.categoriaId).find(
      (p) => p.id === productId,
    );

    if (outroSabor) {
      const varCorrespondente = outroSabor.variacoes?.find(
        (v) => v.nome === this.state.variacaoSelecionada?.nome,
      );
      const novosSaboresExtras = [...this.state.saboresExtras];
      const idx = parseInt(this.currentSaborIndex || 0);

      novosSaboresExtras[idx] = {
        product: outroSabor,
        variacao: varCorrespondente,
      };

      this.setState({
        saboresExtras: novosSaboresExtras,
      });
    }
  }
}
