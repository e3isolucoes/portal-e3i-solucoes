# Sistema visual E3I

## Princípio

A marca é editorial, confiável e sóbria. O portal é a moldura comum; cada ferramenta preserva sua função sem criar uma identidade concorrente.

## Tokens canônicos

| Papel | Token | Valor |
|---|---|---|
| Fundo | Canvas | `#F0F2EC` |
| Superfície | Surface | `#FBFBF8` |
| Superfície secundária | Raised | `#E6EAE0` |
| Texto principal | Ink | `#0E1A29` |
| Ação e hierarquia | Navy | `#17395C` |
| Acento | Gold | `#8F6A11` |
| Acento visual | Gold light | `#D9A925` |
| Texto secundário | Muted | `#5C6672` |
| Borda | Rule | `#CFD6C6` |
| Sucesso | Success | `#2C5A3C` |
| Perigo | Danger | `#93261F` |

## Tipografia

- Títulos: Zilla Slab, peso 600.
- Interface e conteúdo: IBM Plex Sans, pesos 400 a 700.
- Identificadores, metadados e números auditáveis: IBM Plex Mono.
- Tamanho mínimo de texto operacional: 14 px; metadados nunca abaixo de 10 px.

## Componentes

- Raio padrão: 3–4 px. Use círculos apenas para avatares, indicadores e chips.
- Botão primário: fundo Ink ou Navy, texto branco, foco Gold light.
- Dourado indica marca, seleção ou atenção; não deve ser usado como texto longo.
- Estados destrutivos sempre usam Danger e exigem confirmação quando não forem reversíveis.
- Toda ferramenta deve oferecer retorno visível a “Minhas Ferramentas”.

## Usabilidade e acessibilidade

- Contraste mínimo WCAG AA.
- Foco visível de 3 px em todos os elementos interativos.
- Alvos de toque com pelo menos 44 × 44 px.
- Estados de carregamento, vazio, erro, sucesso e permissão negada devem ser explícitos.
- Respeitar `prefers-reduced-motion`.
- Não depender apenas de cor para comunicar status.

## Segurança da experiência

- Catálogo e rotas são filtrados no servidor; ocultar item no menu nunca substitui autorização.
- Ferramentas incorporadas usam origem explicitamente permitida por CSP e sandbox mínimo.
- Links externos usam `noopener noreferrer`.
- Sessão, empresa ativa e papel devem permanecer visíveis no portal.
- Mensagens de autenticação não revelam se uma conta existe.
