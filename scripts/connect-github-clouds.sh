#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY="${GITHUB_REPOSITORY:-e3isolucoes/portal-e3i-solucoes}"
readonly AWS_REGION="${AWS_REGION:-sa-east-1}"
readonly AWS_STACK_NAME="${AWS_STACK_NAME:-e3i-github-staging-deployer}"

usage() {
  cat <<'EOF'
Uso:
  AZURE_RESOURCE_GROUP=<grupo> AZURE_STATIC_WEB_APP=<nome> \
    ./scripts/connect-github-clouds.sh

Pré-requisitos: gh, az e aws instalados e autenticados nas contas corretas.
O script não imprime tokens e grava o token Azure diretamente nos ambientes
GitHub `production` e `preview`.
EOF
}

fail() {
  printf 'Erro: %s\n' "$*" >&2
  exit 1
}

for command_name in gh az aws; do
  command -v "$command_name" >/dev/null 2>&1 || fail "comando '$command_name' não encontrado"
done

[[ -n "${AZURE_RESOURCE_GROUP:-}" ]] || { usage >&2; fail 'AZURE_RESOURCE_GROUP não informado'; }
[[ -n "${AZURE_STATIC_WEB_APP:-}" ]] || { usage >&2; fail 'AZURE_STATIC_WEB_APP não informado'; }

gh auth status >/dev/null 2>&1 || fail 'autentique o GitHub CLI com gh auth login'
az account show >/dev/null 2>&1 || fail 'autentique o Azure CLI com az login'

account_id="$(aws sts get-caller-identity --query Account --output text)"
[[ "$account_id" =~ ^[0-9]{12}$ ]] || fail 'não foi possível identificar a conta AWS'

remote_url="$(gh repo view "$REPOSITORY" --json url --jq .url)"
printf 'GitHub: %s\n' "$remote_url"

for environment in preview production aws-staging; do
  gh api --method PUT "repos/${REPOSITORY}/environments/${environment}" --input - \
    <<< '{}' >/dev/null
done

oidc_arn="arn:aws:iam::${account_id}:oidc-provider/token.actions.githubusercontent.com"
aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$oidc_arn" \
  >/dev/null 2>&1 || fail "provedor OIDC ausente na AWS: $oidc_arn"

aws cloudformation deploy \
  --stack-name "$AWS_STACK_NAME" \
  --template-file painel-obrigacoes/aws/bootstrap/deployer.yaml \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides AccountId="$account_id"

role_arn="$(aws cloudformation describe-stacks \
  --stack-name "$AWS_STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" \
  --output text)"
[[ "$role_arn" == arn:aws:iam::*:role/* ]] || fail 'ARN da role AWS inválida'
printf '%s' "$role_arn" | gh variable set AWS_STAGING_DEPLOY_ROLE_ARN \
  --repo "$REPOSITORY" --env aws-staging

azure_hostname="$(az staticwebapp show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_STATIC_WEB_APP" \
  --query defaultHostname --output tsv)"
[[ -n "$azure_hostname" ]] || fail 'Azure Static Web App não encontrada'

azure_token="$(az staticwebapp secrets list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_STATIC_WEB_APP" \
  --query properties.apiKey --output tsv)"
[[ -n "$azure_token" ]] || fail 'token de implantação Azure não retornado'

for environment in preview production; do
  printf '%s' "$azure_token" | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN \
    --repo "$REPOSITORY" --env "$environment"
done
unset azure_token

printf 'AWS: conta %s, role configurada em aws-staging.\n' "$account_id"
printf 'Azure: https://%s conectado a preview e production.\n' "$azure_hostname"
printf 'Conexões concluídas sem credenciais permanentes no repositório.\n'
