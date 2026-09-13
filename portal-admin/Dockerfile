ARG BASE_IMAGE=acre3i431811.azurecr.io/e3i-portal@sha256:04d63f77dbd8fef806a9b19601909b10901f2e8f0a4558df22a93bdeed4b3fb1
FROM ${BASE_IMAGE}

COPY admin-ferramentas.html /app/dist/admin-ferramentas.html
COPY admin-ferramentas.css /app/dist/admin-ferramentas.css
COPY admin-ferramentas.js /app/dist/admin-ferramentas.js

RUN test -s /app/dist/admin-ferramentas.html \
 && test -s /app/dist/admin-ferramentas.css \
 && test -s /app/dist/admin-ferramentas.js \
 && grep -Fq '/api/client-tools' /app/dist/admin-ferramentas.js \
 && grep -Fq '/api/admin/organizations/' /app/dist/admin-ferramentas.js \
 && grep -Fq 'admin-ferramentas.js' /app/dist/admin-ferramentas.html \
 && echo 'PORTAL_TOOL_ACCESS_SCREEN_VALIDATION_OK'

LABEL e3i.portal.feature="tool-access-admin" \
      e3i.portal.base-digest="sha256:04d63f77dbd8fef806a9b19601909b10901f2e8f0a4558df22a93bdeed4b3fb1"
