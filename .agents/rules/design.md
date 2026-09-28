---
applyTo: "web/**"
description: "Diretrizes de design e interface web para OpssPilot (hierarquia, espaçamento em escala, estados vazios/erro, dark mode e acessibilidade)"
---

# Diretrizes de Design e Interface Web - OpssPilot

Instruções mandatórias para desenvolvimento de páginas, componentes e estilos dentro do escopo `web/**`.

---

## 1. 📐 Hierarquia Visual e Tipográfica

- **Escala Tipográfica Clara**:
  - `h1`: Título principal da página (ex: 2rem / 32px, `font-weight: 700`). Limite de exatamente um `<h1>` por página.
  - `h2`: Seções principais e painéis de alto nível (ex: 1.5rem / 24px, `font-weight: 600`).
  - `h3`: Subseções e cabeçalhos de cards (ex: 1.25rem / 20px, `font-weight: 600`).
  - `h4`: Rótulos estruturais e títulos menores (ex: 1rem / 16px, `font-weight: 500`).
  - `body`: Texto padrão (ex: 0.9375rem / 15px ou 1rem / 16px, `line-height: 1.5`, `font-weight: 400`).
  - `caption / small`: Metadados, datas e badges (ex: 0.75rem / 12px a 0.8125rem / 13px, `font-weight: 500`).
- **Pesos e Contrastes**:
  - Use contraste visual intencional: títulos fortes com cor primária de texto, metadados com cor secundária/muted.
  - Não confie apenas no tamanho da fonte para indicar hierarquia; combine tamanho, peso (`font-weight`) e cor (`--text-secondary`).
- **Elevação e Superfícies**:
  - Camada base: fundo da aplicação (`--bg-primary`).
  - Camada de cartões e painéis: superfície intermediária (`--bg-surface`) com borda suave (`--border-subtle`) e sombra sutil (`--shadow-sm`).
  - Camada interativa e modais: superfície elevada (`--bg-overlay`) com sombra pronunciada (`--shadow-lg`).

---

## 2. 📏 Espaçamento em Escala (Spacing Scale)

Adote uma escala geométrica estrita baseada em múltiplos de **4px / 8px** via tokens CSS. Nunca use valores arbitrários (`13px`, `27px`, etc.):

```css
:root {
  --space-0: 0px;
  --space-1: 0.25rem;  /* 4px  - micro gaps, borders, badges */
  --space-2: 0.5rem;   /* 8px  - padding interno compacto, gaps de chips */
  --space-3: 0.75rem;  /* 12px - espaçamento interno de inputs/botões */
  --space-4: 1rem;     /* 16px - padding padrão de cards, gaps entre itens */
  --space-5: 1.25rem;  /* 20px - separação intermediária */
  --space-6: 1.5rem;   /* 24px - padding de painéis, gap entre seções */
  --space-8: 2rem;     /* 32px - margens entre módulos de página */
  --space-12: 3rem;    /* 48px - topo de layouts e cabeçalhos principais */
}
```

- **Gaps e Layouts**:
  - Utilize Flexbox e CSS Grid com a propriedade `gap` configurada pelos tokens de espaçamento (`gap: var(--space-4)`).
  - Mantenha padding interno de containers proporcional ao espaçamento de layout externo (container padding >= gap interno).

---

## 3. 📭 Estados Vazios e de Erro (Empty & Error States)

### Estados Vazios (Empty States)
- Todo componente ou lista suscetível a ausência de dados (ex: lista de incidentes sem alertas, busca sem resultados) deve fornecer:
  1. **Ícone ou Ilustração Semântica**: Representativo do contexto (ex: alerta desativado, caixa vazia).
  2. **Título Direto**: Ex: *"Nenhum incidente ativo no momento"*.
  3. **Mensagem Explicativa**: Ex: *"Todos os serviços estão operando normalmente. Alertas em tempo real aparecerão aqui."*
  4. **Ação Primária / CTA** (quando aplicável): Botão para *"Simular Alerta"* ou *"Limpar Filtros"*.
- Nunca exiba uma tabela ou card em branco sem feedback contextual.

### Estados de Erro (Error States)
- **Erros de Campo/Formulário**:
  - Borda e texto de destaque na cor de erro semântica (`--color-danger`).
  - Mensagem explicativa posicionada imediatamente abaixo do campo inválido.
  - Associação via `aria-describedby` e `aria-invalid="true"`.
- **Erros de Requisição / Painel**:
  - Mensagens claras e orientadas à solução (nunca apenas *"Ocorreu um erro 500"*).
  - Incluir ação de recuperação: botão de *"Tentar novamente"* (`retry`).
  - Manter o layout estável, sem quebras abruptas na interface.
- **Carregamento (Loading States)**:
  - Utilize *Skeleton Loaders* com animação suave de pulso para simular a forma dos dados reais e evitar Cumulative Layout Shift (CLS).

---

## 4. 🌗 Dark Mode

- **Design Dark First & Tokens Semânticos**:
  - Nunca utilize preto puro (`#000000`) para fundos extensos. Prefira tons ricos de ardósia ou grafite (ex: `#090d16`, `#0f172a`, `#1e293b`).
  - Cores semânticas devem ter variantes ajustadas para tema claro e escuro.

```css
:root {
  color-scheme: light dark;

  /* Tema Claro */
  --bg-primary: #f8fafc;
  --bg-surface: #ffffff;
  --bg-overlay: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  --color-primary: #2563eb;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
}

[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Tema Escuro */
    --bg-primary: #0b0f19;
    --bg-surface: #111827;
    --bg-overlay: #1f2937;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-subtle: #1e293b;
    --border-strong: #334155;
    --color-primary: #3b82f6;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
  }
}
```

- **Persistência e Alternador**:
  - Respeite `prefers-color-scheme` por padrão.
  - Permita alternância manual através de `data-theme="dark"` / `data-theme="light"` salvo no `localStorage`.

---

## 5. ♿ Acessibilidade (a11y - WCAG 2.1 AA)

- **Contraste de Cor**:
  - Garanta relação mínima de contraste de **4.5:1** para textos normais e **3:1** para textos grandes e componentes de UI essenciais.
- **Navegação por Teclado e Foco Visível**:
  - Todo elemento interativo (`<button>`, `<a>`, `<input>`, `<select>`) deve ser navegável via tecla `Tab`.
  - Proibido remover outline de foco sem fornecer substituto:
    ```css
    :focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    ```
- **HTML Semântico**:
  - Use elementos nativos: `<button>` para ações, `<a>` para navegação, `<main>`, `<nav>`, `<aside>`, `<section>`, `<article>`.
  - Nunca crie botões usando `<div onclick="...">` sem `role="button"`, `tabindex="0"` e suporte a eventos de teclado (`Enter` e `Space`).
- **ARIA e Leitores de Tela**:
  - Use `aria-label` quando o botão contiver apenas ícones (ex: botão de fechar, alternador de tema).
  - Alertas dinâmicos e notificações devem utilizar `aria-live="polite"` ou `role="status"`.
- **Movimento Reduzido**:
  - Respeite as preferências do usuário para animações:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```
