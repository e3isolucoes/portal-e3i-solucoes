# E³I Soluções — site institucional

Site estático, sem build. Publique a pasta inteira no Netlify (`publish = "."`).

## Estrutura

```
index.html               página principal (posicionamento novo)
privacidade.html         política de privacidade (LGPD)
404.html                 página de erro
apresentacao_e_3_i.html  apresentação comercial (AINDA NO POSICIONAMENTO ANTIGO — ver pendências)
_doc_style.css           estilo das páginas secundárias
netlify.toml             publicação, cabeçalhos de segurança, cache, redirects
robots.txt / sitemap.xml SEO
assets/                  logo e ícones otimizados (.png + .webp)
```

## O que mudou nesta refatoração

**Posicionamento.** Saiu "consultoria premium em processos, dados e performance" —
categoria genérica e disputada por milhares de empresas. Entrou o que a E³I realmente
construiu: um **copiloto de gestão** que entrega um Contexto Empresarial versionado, com
origem, nível de confiança e validação humana em cada informação. A tese central da página
é o princípio **LLM Last**, incluindo a lista pública do que a IA nunca faz.

**Números inventados removidos.** A versão anterior exibia "97% SLA", "-28% gargalos",
"+41% visibilidade" e barras de maturidade (84/76/89/68) sem qualquer origem — exatamente
o comportamento que o produto existe para combater. Os números que restaram estão dentro de
um painel explicitamente rotulado como exemplo de tela.

**Técnico.**
- Tailwind via CDN removido (o próprio Tailwind desaconselha em produção). CSS próprio, ~11 KB.
- Assets de 7,2 MB → 364 KB, com `.webp` e `loading="lazy"`.
- Corrigido `<link rel="icon">` indevidamente colocado dentro de um `<div>` na seção de serviços.
- Dados estruturados JSON-LD (`ProfessionalService`), canonical, Open Graph e sitemap.
- Cabeçalhos de segurança (HSTS, nosniff, frame-options, permissions-policy) e cache no `netlify.toml`.
- Formulário com validação, mensagem de status acessível (`aria-live`), fallback quando o
  navegador bloqueia pop-up e aceite LGPD obrigatório.
- Skip link, foco visível, `prefers-reduced-motion` respeitado, responsivo até 360 px.

## Antes de publicar

1. Conferir o domínio nos metadados. Estão como `https://www.e3isolucoes.com.br/` em
   `index.html` (canonical + og:url + JSON-LD), `sitemap.xml` e `robots.txt`.
2. Conferir o e-mail `contato@e3isolucoes.com.br` (rodapé e política de privacidade).
3. WhatsApp: constante `WHATSAPP` no fim do `index.html` — hoje `5516992292468`.
4. Em `privacidade.html`, definir o encarregado de dados (DPO).
5. Se a razão social / CNPJ precisar aparecer no rodapé por exigência comercial, incluir.

## Pendências conhecidas

- `apresentacao_e_3_i.html` continua com o discurso antigo ("consultoria premium",
  dores genéricas). Precisa ser realinhada ao novo posicionamento ou despublicada.
- Não há prova social (caso, depoimento, número autorizado por cliente). É a maior
  lacuna de conversão da página hoje.
- Falta uma página `/copiloto` descrevendo o produto para quem quiser profundidade.
