ARG BASE_IMAGE=acre3i431811.azurecr.io/e3i-portal@sha256:04d63f77dbd8fef806a9b19601909b10901f2e8f0a4558df22a93bdeed4b3fb1
FROM ${BASE_IMAGE}

COPY admin-central.html /app/dist/admin-central.html
COPY admin-central.css /app/dist/admin-central.css
COPY admin-central.js /app/dist/admin-central.js
COPY admin-central-server-snippet.txt /tmp/admin-central-server-snippet.txt
COPY patch-admin-central.cjs /tmp/patch-admin-central.cjs
COPY test-admin-central.cjs /tmp/test-admin-central.cjs
COPY admin-users-server-snippet.txt /tmp/admin-users-server-snippet.txt
COPY patch-admin-users.cjs /tmp/patch-admin-users.cjs
COPY test-admin-users.cjs /tmp/test-admin-users.cjs

COPY client-tool-auth.js /app/dist/client-tool-auth.js
COPY first-login.js /app/dist/first-login.js
COPY first-login.css /app/dist/first-login.css
COPY first-login-server-snippet.txt /tmp/first-login-server-snippet.txt
COPY patch-first-login.cjs /tmp/patch-first-login.cjs
COPY test-first-login.cjs /tmp/test-first-login.cjs
COPY patch-obligations-launcher.cjs /tmp/patch-obligations-launcher.cjs
COPY test-obligations-launcher.cjs /tmp/test-obligations-launcher.cjs
COPY migrate-gra-users.cjs /app/migrate-gra-users.cjs

RUN node /tmp/patch-first-login.cjs \
 && node /tmp/patch-admin-central.cjs \
 && node /tmp/patch-admin-users.cjs \
 && node /tmp/patch-obligations-launcher.cjs \
 && node --check /tmp/patch-obligations-launcher.cjs \
 && node --check /tmp/test-obligations-launcher.cjs \
 && node --check /app/dist/server.cjs \
 && node --check /app/dist/admin-central.js \
 && node --check /app/dist/client-tool-auth.js \
 && node --check /app/dist/first-login.js \
 && node --check /app/migrate-gra-users.cjs \
 && E3I_FIRST_LOGIN_DIR=/app/dist node /tmp/test-first-login.cjs \
 && E3I_ADMIN_DIR=/app/dist E3I_ADMIN_PATCH_SCRIPT=/tmp/patch-admin-central.cjs E3I_ADMIN_SNIPPET=/tmp/admin-central-server-snippet.txt node /tmp/test-admin-central.cjs \
 && E3I_ADMIN_DIR=/app/dist E3I_ADMIN_USERS_PATCH_SCRIPT=/tmp/patch-admin-users.cjs E3I_ADMIN_USERS_SNIPPET=/tmp/admin-users-server-snippet.txt node /tmp/test-admin-users.cjs \
 && E3I_OBLIGATIONS_PATCH_SCRIPT=/tmp/patch-obligations-launcher.cjs node /tmp/test-obligations-launcher.cjs \
 && grep -RFq '__E3I_OBLIGATIONS_LAUNCH_FIX_V1' /app/dist/assets \
 && ! grep -RFq 'e3i_obligations_launch_url' /app/dist/assets \
 && test -s /app/dist/admin-central.html \
 && test -s /app/dist/admin-central.css \
 && test -s /app/dist/admin-central.js \
 && test -s /app/dist/client-tool-auth.js \
 && test -s /app/dist/first-login.js \
 && test -s /app/dist/first-login.css \
 && grep -Fq '/api/client-tools' /app/dist/admin-central.js \
 && grep -Fq '/users' /app/dist/admin-central.js \
 && grep -Fq 'force-first-login' /app/dist/admin-central.js \
 && grep -Fq 'central-settings' /app/dist/admin-central.js \
 && grep -Fq 'x-e3i-admin-request' /app/dist/admin-central.js \
 && grep -Fq 'data-e3i-brand-inline="1"' /app/dist/admin-central.html \
 && ! grep -Eq '<img[^>]+src="/e3i-logo\\.svg"' /app/dist/admin-central.html \
 && grep -Fq 'admin-central.js' /app/dist/admin-central.html \
 && grep -Fq 'E3I_ADMIN_CENTRAL_PATCH_V1' /app/dist/server.cjs \
 && grep -Fq 'E3I_ADMIN_USERS_PATCH_V1' /app/dist/server.cjs \
 && grep -Fq '/api/admin/organizations/:organizationId/users' /app/dist/server.cjs \
 && grep -Fq '/api/admin/organizations/:organizationId/central-settings' /app/dist/server.cjs \
 && grep -Fq 'SELF_REVOKE_BLOCKED' /app/dist/server.cjs \
 && grep -Fq 'LAST_ADMIN_PROTECTED' /app/dist/server.cjs \
 && grep -Fq 'E3I_CLIENT_TOOL_AUTH_BRIDGE_V1' /app/dist/client-tool-auth.js \
 && grep -Fq '/api/client-tools' /app/dist/client-tool-auth.js \
 && grep -Fq "credentials = 'same-origin'" /app/dist/client-tool-auth.js \
 && grep -Fq '__e3iClientToolAuthPatched' /app/dist/client-tool-auth.js \
 && grep -Fq '/client-tool-auth.js' /app/dist/index.html \
 && grep -Fq 'PASSWORD_CHANGE_REQUIRED' /app/dist/server.cjs \
 && grep -Fq 'res.status(428)' /app/dist/server.cjs \
 && grep -Fq '/api/auth/first-login/complete' /app/dist/server.cjs \
 && grep -Fq 'current-password' /app/dist/first-login.js \
 && grep -Fq 'XMLHttpRequest' /app/dist/first-login.js \
 && grep -Fq 'data-e3i-first-login-start' /app/dist/first-login.js \
 && grep -Fq 'data-e3i-cancel' /app/dist/first-login.js \
 && grep -Fq 'closeFirstLogin' /app/dist/first-login.js \
 && grep -Fq '/first-login.js' /app/dist/index.html \
 && echo 'PORTAL_ADMIN_CENTRAL_V2_VALIDATION_OK' \
 && echo 'PORTAL_CLIENT_TOOL_AUTH_VALIDATION_OK' \
 && echo 'PORTAL_FIRST_LOGIN_TRANSPORT_VALIDATION_OK'

CMD ["sh", "-c", "node /app/migrate-gra-users.cjs && exec node /app/dist/server.cjs"]

LABEL e3i.portal.feature="tool-access-admin,central-admin-v2,user-lifecycle,brand-theme,central-admin-settings,first-login-password,first-login-transport,client-tool-auth-bridge,obligations-fresh-launch" \
      e3i.portal.base-digest="sha256:04d63f77dbd8fef806a9b19601909b10901f2e8f0a4558df22a93bdeed4b3fb1"
