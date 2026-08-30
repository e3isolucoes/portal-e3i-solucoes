# E³I Processos Inteligentes — Design Tokens & Arquitetura Visual

Este documento oficializa o sistema de Design Tokens da plataforma E³I Soluções, estruturado em conformidade com as diretrizes corporativas (Deep Navy, Metallic Gold e Accent Blue) e suporte nativo a múltiplos temas (Dark corporativo e Light corporativo).

---

## 1. Princípios de Design & Escala Cromática

A interface adota uma hierarquia semântica de cores onde elementos funcionais (ação, navegação, criticidade) possuem papéis fixos e contrastantes, garantindo conformidade WCAG AA (mínimo 4.5:1 para texto).

### Tabela de Tokens Semânticos

| Token CSS | Descrição / Papel | Modo Escuro (Dark) | Modo Claro (Light) | Quando Utilizar |
|---|---|---|---|---|
| `--color-canvas` | Fundo principal da aplicação | `#070D1A` (Navy Profundo) | `#F7F8FA` (Cinza Executivo) | Fundo da tela / viewport geral |
| `--color-surface` | Superfícies de cards e painéis | `#0A192F` (Navy Corporativo) | `#FFFFFF` (Branco Puro) | Cards, modais, caixas de conteúdo |
| `--color-surface-raised` | Superfícies elevadas / hover | `#112240` (Navy Elevado) | `#EEF2F6` (Cinza Claro Suave) | Menus suspensos, hovers, headers de tabela |
| `--color-border-subtle` | Bordas sutis estruturais | `rgba(212, 175, 55, 0.15)` | `rgba(166, 130, 43, 0.2)` | Delimitação de cards, divisores |
| `--color-border-strong` | Bordas de destaque / foco | `rgba(212, 175, 55, 0.35)` | `rgba(166, 130, 43, 0.4)` | Focos de input, cards ativos |
| `--color-accent` | Ação principal e navegação ativa | `#3B82F6` (Accent Blue) | `#2563EB` (Blue Royal) | Botões primários, abas ativas, links |
| `--color-accent-hover` | Estado hover de ações | `#2563EB` | `#1D4ED8` | Hover de botões de ação e links |
| `--color-gold` | Acento institucional escasso | `#D4AF37` (Metallic Gold) | `#A6822B` (Gold Contraste) | Branding, badges críticas, CTA master |
| `--color-text-primary` | Texto principal (alta leitura) | `#F8FAFC` (Slate 50) | `#0F172A` (Slate 900) | Títulos, valores de métricas, corpo |
| `--color-text-secondary` | Texto secundário / descrições | `#94A3B8` (Slate 400) | `#475569` (Slate 600) | Subtítulos, rótulos, legendas |
| `--color-text-muted` | Texto auxiliar / desativado | `#64748B` (Slate 500) | `#64748B` (Slate 500) | Placeholders, datas, metadados |
| `--color-success` | Indicador de sucesso / ativo | `#10B981` (Emerald 500) | `#059669` (Emerald 600) | Badges de status Ativo, sucesso |
| `--color-warning` | Indicador de alerta / pendente | `#F59E0B` (Amber 500) | `#D97706` (Amber 600) | Alertas, revisões pendentes |
| `--color-danger` | Indicador de erro / crítico | `#EF4444` (Red 500) | `#DC2626` (Red 600) | Erros, falhas, criticidade alta |

---

## 2. Tipografia

A tipografia combina uma fonte geométrica expressiva para títulos com uma sans-serif neutra altamente legível para dados e texto corrido:

- **Display / Títulos (`--font-display`):** `Sora`, system-ui, sans-serif. Utilizada em headings (H1, H2, H3) e branding.
- **Corpo e Dados (`--font-sans`):** `Inter`, system-ui, sans-serif. Utilizada em parágrafos, inputs, botões e tabelas (com `tabular-nums` para alinhamento de números).
- **Escala Mínima:** Nenhum texto de conteúdo ou rótulo deve ser menor que 12px (`text-xs`). O corpo padrão utiliza 14px (`text-sm`) ou 16px (`text-base`).

---

## 3. Diretrizes de Uso dos Tokens

1. **Regra do Dourado (--color-gold):** O dourado é um elemento de prestígio e marca. Deve ser usado com **extrema parcimônia** (no máximo um elemento dourado por bloco visual, como o ícone principal ou o badge de status mais crítico), evitando poluição visual.
2. **Azul de Ação (--color-accent):** Toda interatividade primária (botões de submissão, abas selecionadas, links) deve utilizar `--color-accent` para garantir consistência cognitiva em toda a plataforma.
3. **Contraste Dinâmico:** Ao alternar entre o tema Dark (`[data-theme="dark"]`) e Light (`[data-theme="light"]`), utilize sempre os nomes semânticos das classes Tailwind (`bg-canvas`, `bg-surface`, `text-text-primary`, `border-border-subtle`), nunca valores hexadecimais fixos.
