/**
 * main.js — Ponto de entrada da aplicação
 *
 * Responsável por:
 * 1. Inicializar os dados (fetch config e menu)
 * 2. Inicializar os serviços (ex: carrinho do localStorage)
 * 3. Configurar o router
 * 4. Injetar a aplicação raiz (MenuPage) no DOM
 */

import { loadAllData } from "./services/data.js";
import { initCart, getCart } from "./services/cart.js";
import { getState } from "./state.js";
import { addRoute, initRouter, navigate } from "./router.js";
import { MenuPage } from "./components/sections/MenuPage.js";
import { CheckoutPage } from "./components/sections/CheckoutPage.js";
import { OrderConfirmationPage } from "./components/sections/OrderConfirmationPage.js";
import { Toast } from "./components/ui/Toast.js";
import { APP_BASE_PATH } from "./config/app.config.js";

async function bootstrap() {
  const appContainer = document.getElementById("app");

  try {
    // 1. Fetch dos dados vitais (await bloqueia a renderização até resolver)
    await loadAllData();

    // 2. Inicializa serviços síncronos
    initCart();

    // 3. Valida itens do carrinho — remove produtos que não existem mais ou estão indisponíveis
    _validarCarrinho();

    // 4. Define rotas
    addRoute(/^\/$/, () => {
      appContainer.innerHTML = "";
      appContainer.className = "app-layout page-enter";
      // Garante que o cartBar seja removido se vier de outra rota
      _hideMobileCartBar();

      const page = new MenuPage();
      page.mount(appContainer);
    });

    // Rota do checkout
    addRoute(/^\/checkout$/, () => {
      const cart = getCart();

      if (!cart?.items?.length) {
        navigate(`${APP_BASE_PATH}/`);
        return;
      }

      _hideMobileCartBar();
      appContainer.innerHTML = "";
      appContainer.className = "checkout-root";

      const page = new CheckoutPage();
      page.mount(appContainer);
    });

    // Rota de confirmação do pedido
    addRoute(/^\/checkout\/confirmado$/, () => {
      const pending = window._pendingOrderData;

      if (!pending) {
        navigate(`${APP_BASE_PATH}/`);
        return;
      }

      delete window._pendingOrderData;

      _hideMobileCartBar();
      appContainer.innerHTML = "";
      appContainer.className = "checkout-root";

      const page = new OrderConfirmationPage({ orderData: pending.orderData });
      page.mount(appContainer);
    });

    // 4. Inicia o router (dispara a resolução da rota atual)
    initRouter();
  } catch (error) {
    console.error("[Bootstrap Error]", error);

    // Fallback UI em caso de falha crítica (ex: servidor JSON caiu)
    appContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px;">
        <span style="font-size: 48px; margin-bottom: 16px;">⚠️</span>
        <h1 style="color: var(--color-danger); font-size: 24px; margin-bottom: 8px;">Erro ao carregar o cardápio</h1>
        <p style="color: var(--color-text-muted);">Verifique sua conexão ou tente novamente mais tarde.</p>
        <button onclick="window.location.reload()" class="btn btn--primary" style="margin-top: 24px;">Tentar Novamente</button>
      </div>
    `;

    Toast.error("Falha ao iniciar o aplicativo. Tente recarregar a página.");
  }
}

// Inicia o app quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

/**
 * Remove o container do MobileCartBar do body quando não estamos no cardápio.
 * O MenuPage o recria ao montar, então não há perda.
 */
function _hideMobileCartBar() {
  const el = document.getElementById('mount-mobile-cart-bar');
  if (el) el.remove();
}

/**
 * Valida os itens do carrinho salvo no localStorage.
 * Remove itens cujo produto não existe mais ou está indisponível.
 * Igual ao validateCartItems() do cardapio-antigo.
 */
function _validarCarrinho() {
  const cart = getCart();
  if (!cart?.items?.length) return;

  const menu = getState("menu");
  if (!menu?.produtos) return;

  const removidos = [];
  const itensValidos = cart.items.filter((item) => {
    const produto = menu.produtos.find((p) => p.id === item.productId);
    const valido =
      produto && produto.ativo !== false && produto.disponivel !== false;
    if (!valido) removidos.push(item.nome);
    return valido;
  });

  if (removidos.length > 0) {
    import("./state.js").then(({ setState }) => {
      import("./services/storage.js").then(({ saveToStorage }) => {
        import("./config/app.config.js").then(({ CART_STORAGE_KEY }) => {
          const itemCount = itensValidos.reduce((s, i) => s + i.quantity, 0);
          const total = itensValidos.reduce((s, i) => s + i.totalPrice, 0);
          const novoCarrinho = { items: itensValidos, itemCount, total };
          setState("cart", novoCarrinho);
          saveToStorage(CART_STORAGE_KEY, novoCarrinho);
          Toast.warning(
            `${removidos.length} item(s) removido(s) do carrinho por não estar(em) mais disponível(is).`,
          );
        });
      });
    });
  }
}
