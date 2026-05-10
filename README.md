# Cardápio Digital

> Sistema de cardápio digital e checkout para pequenos restaurantes — Vanilla JS, sem framework, sem bundler.

Sistema completo de pedidos online construído com HTML5, CSS3 e JavaScript ES6 Modules puro. O cliente navega pelo cardápio, adiciona itens ao carrinho e finaliza o pedido em um fluxo de checkout completo que envia o pedido formatado via WhatsApp.

---

## Funcionalidades

- **Cardápio** — Categorias, produtos, variações, adicionais, promoções e seção de mais vendidos
- **Carrinho** — Totais em tempo real, seletor de bairro com cálculo de frete, validação de pedido mínimo
- **Checkout** — Fluxo em 4 etapas: dados do cliente → entrega → pagamento → confirmação
- **Agendamento inteligente** — Pickers de data e hora que respeitam horários de funcionamento e tempo de entrega
- **Taxa de entrega** — Três modos: grátis, valor fixo ou preço por bairro
- **Pedido via WhatsApp** — Mensagem formatada enviada diretamente ao restaurante
- **Pagamento PIX** — Chave PIX incluída na mensagem com instruções de comprovante
- **Responsivo** — Mobile-first, funciona em qualquer tamanho de tela
- **Sem dependências** — Apenas [Lucide Icons](https://lucide.dev) via CDN

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Linguagem | HTML5 · CSS3 · JavaScript ES6+ |
| Arquitetura | Baseada em componentes (classe base customizada) |
| Gerenciamento de estado | Padrão Pub/Sub (customizado, ~60 linhas) |
| Roteamento | History API com fallback por query string |
| Ícones | Lucide Icons (CDN) |
| Fontes | Inter (Google Fonts) |
| Build | Nenhum |
| Framework | Nenhum |

---

## Estrutura do Projeto

```
cardapio-digital/
│
├── cardapio/               # App público do cardápio (SPA)
│   ├── index.html          # Shell com skeleton UI
│   └── js/
│       ├── main.js         # Bootstrap — carrega dados e registra rotas
│       ├── router.js       # Roteamento SPA via History API
│       ├── state.js        # Store global reativo (Pub/Sub)
│       ├── utils.js        # Funções utilitárias puras
│       ├── config/
│       │   └── app.config.js
│       ├── services/
│       │   ├── data.js         # Fetch dos JSONs + getters
│       │   ├── cart.js         # Lógica do carrinho + localStorage
│       │   ├── checkout.js     # Estado do checkout + cálculo de frete
│       │   ├── whatsapp.js     # Montagem da mensagem do pedido
│       │   ├── formatter.js    # Formatação de moeda e datas
│       │   └── storage.js      # Wrapper do localStorage
│       └── components/
│           ├── base/
│           │   └── Component.js    # Classe base (render/mount/setState)
│           ├── layout/
│           │   ├── Header.js
│           │   └── CategoryNav.js
│           ├── ui/
│           │   ├── DatePicker.js   # Calendário customizado
│           │   ├── TimePicker.js   # Seletor de horários customizado
│           │   ├── QuantitySelector.js
│           │   ├── SearchBar.js
│           │   ├── Skeleton.js
│           │   └── Toast.js
│           └── sections/
│               ├── MenuPage.js             # Orquestrador da página principal
│               ├── Cart.js                 # Carrinho unificado (sidebar + bottom sheet)
│               ├── CheckoutPage.js         # Checkout em 4 etapas
│               ├── OrderConfirmationPage.js
│               ├── ProductDrawer.js        # Detalhe do produto (desktop)
│               ├── ProductBottomSheet.js   # Detalhe do produto (mobile)
│               └── ...
│
├── assets/                 # Estilos e imagens compartilhados
│   ├── css/
│   │   ├── base/           # Reset, variáveis, tipografia
│   │   ├── components/     # Botão, card, modal, carrinho...
│   │   ├── layout/         # Header, grid, container
│   │   └── pages/          # cardapio.css, checkout.css
│   └── img/
│
└── data/                   # Arquivos de configuração (JSON)
    ├── config.json         # Configurações do restaurante
    └── menu.json           # Categorias, produtos e adicionais
```

---

## Como Rodar

Nenhuma instalação necessária. Basta servir os arquivos com qualquer servidor HTTP.

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# VS Code
# Clique com botão direito em index.html → "Open with Live Server"
```

Acesse `http://localhost:8080/cardapio/` no navegador.

---

## Configuração

Todas as configurações do restaurante ficam em `data/config.json`. Campos principais:

```jsonc
{
  "name": "Nome do Restaurante",
  "whatsapp": "5511999887766",        // Número com DDI

  "modo_funcionamento": "automatico", // "automatico" | "manual"
  "horarios": [                       // Horários por dia da semana
    { "dia_semana": "segunda", "aberto": true, "periodos": [
      { "horario_abertura": "08:00", "horario_fechamento": "22:00" }
    ]}
  ],

  "tipo_taxa_entrega": "taxa_localizacao", // "sem_taxa" | "taxa_unica" | "taxa_localizacao"
  "taxa_entrega": 5.0,                     // Usado quando tipo = "taxa_unica"
  "taxas_por_localizacao": [               // Usado quando tipo = "taxa_localizacao"
    { "nome": "Centro", "cidade": "São Paulo", "taxa_valor": 0, "tempo_min": 25, "tempo_max": 40, "status": "ativado" }
  ],

  "pagamentos": ["cash", "pix", "credit", "debit"],
  "pixKey": "email@exemplo.com",
  "pixKeyType": "email"
}
```

O cardápio é definido em `data/menu.json` com categorias, produtos, variações, grupos de adicionais e promoções.

---

## Modos de Taxa de Entrega

| `tipo_taxa_entrega` | Comportamento |
|---|---|
| `sem_taxa` | Entrega sempre grátis. Ignora todos os campos de taxa. |
| `taxa_unica` | Valor fixo para todos. Usa o campo `taxa_entrega`. |
| `taxa_localizacao` | Preço por bairro. Usa `taxas_por_localizacao`. Aplica `taxa_padrao_outros_bairros` para bairros não cadastrados. |

---

## Fluxo do Checkout

```
Carrinho → Finalizar
  ↓
/checkout
  ├── Etapa 1: Dados do cliente (nome, telefone, e-mail, CPF)
  ├── Etapa 2: Entrega (endereço + autopreenchimento ViaCEP + agendamento)
  ├── Etapa 3: Pagamento (dinheiro, PIX, crédito, débito)
  └── Etapa 4: Confirmação do pedido + envio via WhatsApp

/checkout/confirmado
  └── Tela de sucesso
```

---

## Deploy em Produção

O app usa roteamento via History API com fallback por query string para servidores estáticos. Funciona no GitHub Pages, Netlify, Vercel ou qualquer hospedagem estática.

Para URLs limpas com domínio próprio, adicione uma regra de rewrite:

**Nginx:**
```nginx
location /cardapio/ {
    try_files $uri $uri/ /cardapio/index.html;
}
```

**Netlify (`_redirects`):**
```
/cardapio/*  /cardapio/index.html  200
```

**Vercel (`vercel.json`):**
```json
{
  "rewrites": [{ "source": "/cardapio/(.*)", "destination": "/cardapio/index.html" }]
}
```

---

## Licença

MIT
