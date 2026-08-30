# Deploy de teste no Alibaba Cloud ECS

O portal usa Express/Node para autenticação, concessões e auditoria. Por isso, OSS não é
suficiente para esta aplicação. A implantação de teste recomendada é uma ECS Linux com
Docker e uma regra de rede limitada ao IP do responsável pelos testes.

## Recursos

- ECS Linux 2 vCPU / 2–4 GB RAM;
- Ubuntu 24.04 ou Alibaba Cloud Linux 3;
- disco de sistema de 40 GB;
- IP público;
- Security Group liberando SSH/22 apenas para o IP administrativo;
- HTTP/80 inicialmente apenas para os IPs dos testadores.

Evite região da China continental sem ICP. Para usuários no Brasil, escolha uma região
internacional disponível na conta e compare latência e custo antes da produção.

## Implantação

Na ECS, instale Git e Docker Engine usando o repositório oficial da distribuição. Copie o
projeto para `/opt/e3i/portal`, então:

```bash
cd /opt/e3i/portal
cp .env.alibaba.example .env.production
nano .env.production
docker compose -f compose.alibaba.yml up -d --build
docker compose -f compose.alibaba.yml ps
curl --fail http://127.0.0.1/api/health/live
```

O arquivo `.env.production` não deve ser incluído no Git nem enviado a terceiros.

## DNS e HTTPS

Depois do teste por IP, crie `app.e3isolucoes.com.br` apontando para o IP da ECS. Para
produção, coloque um proxy HTTPS (Nginx/Traefik ou Alibaba ALB) na frente do contêiner e
mantenha a porta 3000 inacessível pela internet.

## Checklist de segurança

- manter `ALLOW_PUBLIC_REGISTRATION=false`;
- substituir usuários e senhas demonstrativos antes de liberar a internet;
- limitar 22 e 80/443 no Security Group durante o teste;
- configurar backup do volume `e3i-data`;
- validar os URLs de Compras e Obrigações;
- não habilitar Gemini sem cadastrar o segredo pelo serviço de segredos da Alibaba;
- testar revogação, troca de organização e acesso direto às aplicações de destino.
