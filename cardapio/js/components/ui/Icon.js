/**
 * Icon.js — Helper para usar ícones Lucide nos componentes
 *
 * A biblioteca Lucide é carregada via CDN UMD no index.html e fica
 * disponível globalmente como `window.lucide`.
 *
 * Uso nos templates HTML dos componentes:
 *   Icon.html('shopping-cart')
 *   Icon.html('chevron-right', { size: 16, strokeWidth: 1.5, class: 'my-class' })
 *
 * Após montar o componente no DOM, chamar:
 *   Icon.replace()
 *
 * Nomes de ícones: kebab-case, igual ao site lucide.dev
 *   Ex: 'shopping-cart', 'chevron-right', 'map-pin', 'pizza'
 */

export class Icon {
  /**
   * Retorna o markup <i data-lucide> para usar em templates HTML.
   * O ícone só vira SVG após chamar Icon.replace().
   *
   * @param   {string} name                  - Nome do ícone em kebab-case (ex: 'pizza')
   * @param   {Object} [opts]
   * @param   {number} [opts.size=20]        - Tamanho em px
   * @param   {number} [opts.strokeWidth=2]  - Espessura do traço
   * @param   {string} [opts.class='']       - Classes CSS adicionais
   * @param   {string} [opts.ariaLabel='']   - aria-label (se vazio, aria-hidden=true)
   * @returns {string}                        - HTML string do elemento
   */
  static html(name, opts = {}) {
    const {
      size = 20,
      strokeWidth = 2,
      class: cls = "",
      ariaLabel = "",
    } = opts;

    const ariaAttrs = ariaLabel
      ? `aria-label="${ariaLabel}"`
      : `aria-hidden="true"`;

    return `<i
      data-lucide="${name}"
      style="width:${size}px;height:${size}px;"
      data-stroke-width="${strokeWidth}"
      class="lucide-icon${cls ? ` ${cls}` : ""}"
      ${ariaAttrs}
    ></i>`;
  }

  /**
   * Ativa a biblioteca Lucide para substituir todos os <i data-lucide>
   * presentes no DOM (ou dentro de um elemento específico) pelos SVGs reais.
   *
   * Deve ser chamado após cada mount() de componente que use Icon.html().
   *
   * @param {HTMLElement} [root=document] - Elemento raiz onde buscar os ícones
   */
  static replace(root = document) {
    if (!window.lucide) {
      console.warn(
        "[Icon] Lucide não está disponível. Verifique o script no index.html.",
      );
      return;
    }

    window.lucide.createIcons({
      attrs: { "stroke-width": 2 },
      ...(root !== document ? { root } : {}),
    });
  }
}
