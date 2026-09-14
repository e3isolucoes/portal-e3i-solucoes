const fs = require('fs');

const SERVER = '/app/dist/server.cjs';
const INDEX = '/app/dist/index.html';

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`${label}: marker not found`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`${label}: marker is not unique`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let server = fs.readFileSync(SERVER, 'utf8');

if (!server.includes('E3I_FIRST_LOGIN_PATCH_V1')) {
  const loginMarker = 'app.post("/api/auth/login", async (req, res) => {';
  const helperBlock = String.raw`
  // E3I_FIRST_LOGIN_PATCH_V1
  const E3I_FIRST_LOGIN_CODE_TTL_MINUTES = Math.max(5, Math.min(60, Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30)));
  const E3I_FIRST_LOGIN_RESEND_COOLDOWN_MS = 60 * 1000;
  const E3I_FIRST_LOGIN_MAX_ATTEMPTS = 5;

  function e3iPasswordPolicy(password, email) {
    const value = String(password || "");
    const localPart = String(email || "").split("@")[0].toLowerCase();
    if (value.length < 12 || value.length > 128) return "A senha deve ter entre 12 e 128 caracteres.";
    if (!/[a-z]/.test(value)) return "Inclua ao menos uma letra minúscula.";
    if (!/[A-Z]/.test(value)) return "Inclua ao menos uma letra maiúscula.";
    if (!/[0-9]/.test(value)) return "Inclua ao menos um número.";
    if (!/[^A-Za-z0-9\\s]/.test(value)) return "Inclua ao menos um símbolo.";
    if (/[\\u0000-\\u001f\\u007f]/.test(value)) return "A senha contém caracteres de controle inválidos.";
    if (localPart.length >= 4 && value.toLowerCase().includes(localPart)) return "A senha não pode conter o identificador do e-mail.";
    const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["123456789012", "password1234", "senha123456", "qwerty123456"].includes(compact)) return "Escolha uma senha menos previsível.";
    return null;
  }

  function e3iHashSetupCode(code) {
    return crypto.createHash("sha256").update(String(code)).digest("hex");
  }

  function e3iClearPasswordSetup(user) {
    delete user.passwordSetupCodeHash;
    delete user.passwordSetupExpiresAt;
    delete user.passwordSetupAttempts;
    delete user.passwordSetupLastSentAt;
  }

  async function e3iIssuePasswordSetupCode(user) {
    const now = Date.now();
    const lastSent = user.passwordSetupLastSentAt ? Date.parse(user.passwordSetupLastSentAt) : 0;
    if (Number.isFinite(lastSent) && now - lastSent < E3I_FIRST_LOGIN_RESEND_COOLDOWN_MS) {
      return { sent: false, throttled: true };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");

    const code = String(crypto.randomInt(100000, 1000000));
    user.passwordSetupCodeHash = e3iHashSetupCode(code);
    user.passwordSetupExpiresAt = new Date(now + E3I_FIRST_LOGIN_CODE_TTL_MINUTES * 60 * 1000).toISOString();
    user.passwordSetupAttempts = 0;
    user.passwordSetupLastSentAt = new Date(now).toISOString();
    saveStorage();

    const from = process.env.PASSWORD_RESET_FROM_EMAIL || "E3I Soluções <contato@e3isolucoes.com.br>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Defina sua nova senha de acesso à E3I Soluções",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0E1A29"><h2>Primeiro acesso</h2><p>Use o código abaixo para definir uma nova senha no Portal E3I.</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>O código expira em ${E3I_FIRST_LOGIN_CODE_TTL_MINUTES} minutos.</p><p>Se você não solicitou esta alteração, ignore esta mensagem.</p></div>`,
      }),
    });

    if (!response.ok) {
      e3iClearPasswordSetup(user);
      saveStorage();
      throw new Error(`PASSWORD_RESET_EMAIL_FAILED_${response.status}`);
    }
    return { sent: true, throttled: false };
  }

  app.post("/api/auth/first-login/resend", async (req, res) => {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const user = users.find((candidate) => String(candidate.email || "").trim().toLowerCase() === normalizedEmail);
    if (user?.mustChangePassword) {
      try {
        await e3iIssuePasswordSetupCode(user);
      } catch (error) {
        console.error("[first-login] resend failed", error instanceof Error ? error.message : error);
      }
    }
    return res.status(202).json({ success: true, message: "Se a conta exigir ativação, um novo código será enviado ao e-mail cadastrado." });
  });

  app.post("/api/auth/first-login/complete", async (req, res) => {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.newPassword || "");
    const user = users.find((candidate) => String(candidate.email || "").trim().toLowerCase() === normalizedEmail);

    if (!user || !user.mustChangePassword) {
      return res.status(400).json({ error: "Solicitação de primeiro acesso inválida ou já concluída." });
    }

    const policyError = e3iPasswordPolicy(newPassword, user.email);
    if (policyError) return res.status(400).json({ error: policyError, code: "WEAK_PASSWORD" });

    const expiresAt = user.passwordSetupExpiresAt ? Date.parse(user.passwordSetupExpiresAt) : 0;
    if (!user.passwordSetupCodeHash || !expiresAt || expiresAt < Date.now()) {
      e3iClearPasswordSetup(user);
      saveStorage();
      return res.status(400).json({ error: "Código expirado. Solicite um novo código.", code: "CODE_EXPIRED" });
    }

    const attempts = Number(user.passwordSetupAttempts || 0);
    if (attempts >= E3I_FIRST_LOGIN_MAX_ATTEMPTS) {
      e3iClearPasswordSetup(user);
      saveStorage();
      return res.status(429).json({ error: "Limite de tentativas atingido. Solicite um novo código.", code: "TOO_MANY_ATTEMPTS" });
    }

    const expected = Buffer.from(String(user.passwordSetupCodeHash), "hex");
    const supplied = Buffer.from(e3iHashSetupCode(code), "hex");
    const validCode = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
    if (!validCode) {
      user.passwordSetupAttempts = attempts + 1;
      saveStorage();
      return res.status(400).json({ error: "Código inválido.", code: "INVALID_CODE" });
    }

    user.passwordHash = await passwordHasher.hash(newPassword);
    user.mustChangePassword = false;
    user.passwordOnboardingVersion = 1;
    user.passwordChangedAt = new Date().toISOString();
    e3iClearPasswordSetup(user);

    for (const session of sessions) {
      if (session.userId === user.id && !session.revokedAt) session.revokedAt = new Date().toISOString();
    }

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      userId: user.id,
      userName: user.name,
      action: "FIRST_LOGIN_PASSWORD_CHANGED",
      module: "Autenticação",
      ipAddress: req.ip || "127.0.0.1",
      status: "SUCCESS",
      details: "Senha definida com política forte no primeiro acesso.",
    });
    saveStorage();
    return res.json({ success: true, message: "Senha atualizada. Entre novamente com a nova senha." });
  });

`;

  server = replaceOnce(server, loginMarker, helperBlock + loginMarker, 'login route');

  const loginPosition = server.indexOf(loginMarker);
  const loginWindowEnd = Math.min(server.length, loginPosition + 9000);
  const loginWindow = server.slice(loginPosition, loginWindowEnd);
  const lookupRegex = /const user = users\.find\(\(u\) => u\.email\.toLowerCase\(\) === normalizedEmail\);/;
  const match = loginWindow.match(lookupRegex);
  if (!match) throw new Error('login user lookup marker not found');

  const guard = String.raw`${match[0]}
    if (user?.mustChangePassword) {
      let setupResult = { sent: false, throttled: false };
      try {
        setupResult = await e3iIssuePasswordSetupCode(user);
      } catch (error) {
        console.error("[first-login] initial code delivery failed", error instanceof Error ? error.message : error);
      }
      return res.status(428).json({
        code: "PASSWORD_CHANGE_REQUIRED",
        error: setupResult.sent || setupResult.throttled
          ? "Primeiro acesso: defina uma nova senha usando o código enviado ao seu e-mail."
          : "Primeiro acesso: é necessário definir uma nova senha. Use a opção de reenviar o código.",
        email: user.email,
      });
    }`;

  const patchedWindow = loginWindow.replace(lookupRegex, guard);
  server = server.slice(0, loginPosition) + patchedWindow + server.slice(loginWindowEnd);
  fs.writeFileSync(SERVER, server, 'utf8');
}

let index = fs.readFileSync(INDEX, 'utf8');
if (!index.includes('/first-login.css')) {
  index = index.replace('</head>', '  <link rel="stylesheet" href="/first-login.css">\n</head>');
}
if (!index.includes('/first-login.js')) {
  index = index.replace('</body>', '  <script src="/first-login.js"></script>\n</body>');
}
fs.writeFileSync(INDEX, index, 'utf8');

if (!fs.readFileSync(SERVER, 'utf8').includes('PASSWORD_CHANGE_REQUIRED')) throw new Error('server onboarding patch validation failed');
if (!fs.readFileSync(INDEX, 'utf8').includes('/first-login.js')) throw new Error('frontend onboarding injection validation failed');
console.log('PORTAL_FIRST_LOGIN_PATCH_OK');
