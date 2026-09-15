(() => {
  // E3I_CLIENT_TOOL_AUTH_BRIDGE_V1
  // Keep same-origin client-tool calls on the same authentication transport that
  // successfully authenticated /api/auth/session. No token value is logged or persisted.
  const nativeFetch = window.fetch.bind(window);
  const Xhr = window.XMLHttpRequest;
  let activeAuthorization = '';
  let sessionAuthMode = 'unknown';

  function resolveUrl(value) {
    try {
      if (value instanceof Request) return new URL(value.url, window.location.href);
      return new URL(String(value || ''), window.location.href);
    } catch {
      return null;
    }
  }

  function isSameOriginPath(value, matcher) {
    const url = resolveUrl(value);
    return Boolean(url && url.origin === window.location.origin && matcher(url.pathname));
  }

  function isSessionUrl(value) {
    return isSameOriginPath(value, (path) => path === '/api/auth/session');
  }

  function isLoginUrl(value) {
    return isSameOriginPath(value, (path) => path === '/api/auth/login');
  }

  function isClientToolsUrl(value) {
    return isSameOriginPath(value, (path) => path === '/api/client-tools' || path.startsWith('/api/client-tools/'));
  }

  function normalizeAuthorization(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return /^Bearer\s+/i.test(text) ? text : `Bearer ${text}`;
  }

  function fetchHeaders(input, init) {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    return headers;
  }

  function rememberSessionTransport(input, init) {
    const headers = fetchHeaders(input, init);
    const authorization = headers.get('Authorization');
    if (authorization) {
      activeAuthorization = normalizeAuthorization(authorization);
      sessionAuthMode = 'authorization';
    } else {
      activeAuthorization = '';
      sessionAuthMode = 'cookie';
    }
  }

  function rememberLoginToken(payload) {
    const token = payload?.token || payload?.accessToken || payload?.access_token || payload?.session?.token;
    if (!token) return;
    activeAuthorization = normalizeAuthorization(token);
    sessionAuthMode = 'authorization';
  }

  function hasAuthenticatedUser(payload) {
    return Boolean(
      payload?.user
      || payload?.session?.user
      || payload?.userId
      || payload?.session?.userId
      || payload?.authenticated === true
    );
  }

  function prepareClientToolFetch(input, init) {
    if (!isClientToolsUrl(input)) return [input, init];

    const nextInit = { ...(init || {}) };
    const headers = fetchHeaders(input, init);

    if (sessionAuthMode === 'authorization' && activeAuthorization) {
      headers.set('Authorization', activeAuthorization);
    } else if (sessionAuthMode === 'cookie') {
      // validateSession prioritizes a Bearer header over the session cookie. If the
      // application kept an old bearer value, do not let it shadow the cookie that
      // already proved valid on /api/auth/session.
      headers.delete('Authorization');
    }

    nextInit.headers = headers;
    nextInit.credentials = 'same-origin';
    return [input, nextInit];
  }

  window.fetch = async (input, init) => {
    const sessionRequest = isSessionUrl(input);
    const loginRequest = isLoginUrl(input);
    const clientToolRequest = isClientToolsUrl(input);
    const [preparedInput, preparedInit] = prepareClientToolFetch(input, init);
    let response = await nativeFetch(preparedInput, preparedInit);

    try {
      if (sessionRequest && response.ok) {
        const payload = await response.clone().json().catch(() => ({}));
        if (hasAuthenticatedUser(payload)) rememberSessionTransport(input, init);
      } else if (loginRequest && response.ok) {
        const payload = await response.clone().json().catch(() => ({}));
        rememberLoginToken(payload);
      }

      // Defensive fallback: if a valid bearer captured from the active session was
      // rejected, retry this same-origin client-tool request once using the session
      // cookie. This handles stale-token precedence without weakening validation.
      if (clientToolRequest && response.status === 401 && activeAuthorization) {
        const retryInit = { ...(init || {}) };
        const retryHeaders = fetchHeaders(input, init);
        retryHeaders.delete('Authorization');
        retryInit.headers = retryHeaders;
        retryInit.credentials = 'same-origin';
        const retry = await nativeFetch(input, retryInit);
        if (retry.ok) {
          sessionAuthMode = 'cookie';
          activeAuthorization = '';
          response = retry;
        }
      }
    } catch {
      // Preserve the application's original request/response semantics on bridge errors.
    }

    return response;
  };

  if (Xhr && !Xhr.prototype.__e3iClientToolAuthPatched) {
    const nativeOpen = Xhr.prototype.open;
    const nativeSend = Xhr.prototype.send;
    const nativeSetRequestHeader = Xhr.prototype.setRequestHeader;

    Xhr.prototype.open = function(method, url, ...rest) {
      this.__e3iAuthBridgeUrl = String(url || '');
      this.__e3iAuthBridgeAuthorization = '';
      return nativeOpen.call(this, method, url, ...rest);
    };

    Xhr.prototype.setRequestHeader = function(name, value) {
      const headerName = String(name || '');
      if (headerName.toLowerCase() === 'authorization') {
        this.__e3iAuthBridgeAuthorization = normalizeAuthorization(value);
        if (isClientToolsUrl(this.__e3iAuthBridgeUrl)) {
          // Delay Authorization until send(), when the transport used by the active
          // session is known. Other headers continue unchanged.
          return;
        }
      }
      return nativeSetRequestHeader.call(this, name, value);
    };

    Xhr.prototype.send = function(...args) {
      const requestUrl = this.__e3iAuthBridgeUrl || '';
      const sessionRequest = isSessionUrl(requestUrl);
      const loginRequest = isLoginUrl(requestUrl);
      const clientToolRequest = isClientToolsUrl(requestUrl);

      if (clientToolRequest) {
        this.withCredentials = true;
        if (sessionAuthMode === 'authorization' && activeAuthorization) {
          nativeSetRequestHeader.call(this, 'Authorization', activeAuthorization);
        } else if (sessionAuthMode !== 'cookie' && this.__e3iAuthBridgeAuthorization) {
          nativeSetRequestHeader.call(this, 'Authorization', this.__e3iAuthBridgeAuthorization);
        }
      }

      if (sessionRequest || loginRequest) {
        this.addEventListener('load', () => {
          if (this.status < 200 || this.status >= 300) return;
          try {
            const payload = JSON.parse(this.responseText || '{}');
            if (sessionRequest && hasAuthenticatedUser(payload)) {
              if (this.__e3iAuthBridgeAuthorization) {
                activeAuthorization = this.__e3iAuthBridgeAuthorization;
                sessionAuthMode = 'authorization';
              } else {
                activeAuthorization = '';
                sessionAuthMode = 'cookie';
              }
            }
            if (loginRequest) rememberLoginToken(payload);
          } catch {
            // Ignore non-JSON authentication responses.
          }
        }, { once: true });
      }

      return nativeSend.apply(this, args);
    };

    Object.defineProperty(Xhr.prototype, '__e3iClientToolAuthPatched', { value: true });
  }
})();
