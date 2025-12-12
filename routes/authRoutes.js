// authRoutes

const express = require("express");
const app = express.Router();
const path = require("path");
const cookieParser = require("cookie-parser");
const { genState } = require("../middleware/state");
const { users, saveUsers } = require("../utils/usersStore");
const FormData = require("form-data");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = 3001;
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;
const CALLBACK = "auth/google/callback";
const GITHUB_CALLBACK = "auth/github/callback";
app.use(cookieParser());
console.log("CLIENT_ID:", CLIENT_ID);
console.log("GOOGLE_REDIRECT_URI:", GOOGLE_REDIRECT_URI);

// ---------------------- Rota raiz ----------------------
app.get("/", (req, res) => {
  if (!req.session?.user) return res.sendFile("home.html", { root: "views" });
  return res.sendFile("dashboard.html", { root: "views" });
});

// ---------------------- LOGIN GOOGLE ----------------------
app.get("/login", (req, res) => {
  console.log("[LOGIN] Início do fluxo OAuth2");

  const state = genState();
  if (req.session) req.session.oauthState = state;

  const googleAuthURL =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      scope: "openid email profile https://www.googleapis.com/auth/tasks",
      state,
      response_type: "code",
      redirect_uri: GOOGLE_REDIRECT_URI,
      access_type: "offline",
      prompt: "consent",
    });

  console.log("[LOGIN] State gerado:", state);
  console.log("[LOGIN] Redirect URL:", googleAuthURL);

  res.redirect(302, googleAuthURL);
});

// ---------------------- CALLBACK GOOGLE ----------------------
app.get("/" + CALLBACK, async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) return res.status(400).send("Code não recebido");
    if (state !== req.session.oauthState)
      return res.status(400).send("Invalid state");

    // Troca code por tokens
    const form = new FormData();
    form.append("code", code);
    form.append("client_id", CLIENT_ID);
    form.append("client_secret", CLIENT_SECRET);
    form.append("redirect_uri", GOOGLE_REDIRECT_URI);
    form.append("grant_type", "authorization_code");

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      form,
      { headers: form.getHeaders() }
    );

    const { access_token, id_token, refresh_token } = response.data;
    const payload = jwt.decode(id_token);
    console.log("Scopes do token:", response.data.scope);
    console.log("Access token:", access_token);
    if (!payload?.email) return res.status(400).send("ID Token inválido");

    // Guarda/atualiza utilizador
    if (!users[payload.email]) {
      users[payload.email] = {
        email: payload.email,
        role: "free",
        access_token,
        refresh_token,
      };
    } else {
      users[payload.email].access_token = access_token;
      users[payload.email].refresh_token = refresh_token;
    }

    saveUsers();

    // Cria sessão
    req.session.user = {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || null,
      role: users[payload.email].role,
      accessToken: access_token,
      refreshToken: refresh_token,
    };

    req.session.save((err) => {
      if (err) {
        console.error("Erro ao salvar sessão:", err);
        return res.status(500).send("Erro sessão");
      }

      // Armazenar o Google auth token no cookie
      res.cookie("googleAuthToken", access_token, {
        httpOnly: true, // Impede o acesso do lado cliente
        secure: false, // Alterar para `true` se estiver usando HTTPS
        maxAge: 3600 * 1000, // 1 hora de expiração
      });
      // Store the Google auth token in localStorage for front-end usage
      res.cookie("googleAuthToken", access_token); // Store in cookie
      res.redirect("/");
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send("Erro no callback do Google");
  }
});

// ---------------------- LOGOUT ----------------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    // Limpa o cookie da sessão
    res.clearCookie("connect.sid");

    // Limpa tokens OAuth
    res.clearCookie("googleAuthToken");
    res.clearCookie("githubAuthToken");
    if (req.session) {
      delete req.session.googleAccessToken;
      delete req.session.githubAccessToken;
    }

    console.log("APAGOU TODOS OS COOKIES E ETC")
    res.redirect("/");
  });
});

// ---------------------- ALTERAR ROLE ----------------------
app.post("/change-role", (req, res) => {
  const { role } = req.body;
  if (!req.session?.user)
    return res.status(401).json({ message: "Não autenticado" });

  const email = req.session.user.email;
  users[email].role = role;
  saveUsers();

  req.session.user.role = role;

  res.json({ message: `Role alterado para ${role}`, role });
});

// ---------------------- LISTAR USUÁRIOS LOGADOS ----------------------
app.get("/usuarios-logados", (req, res) => {
  const logados = Object.values(users).filter((u) => u.access_token);
  res.json(logados);
});

// ---------------------- RETORNAR SESSÃO AO FRONT ----------------------
// Retorna os dados da sessão do utilizador (para front-end)
app.get("/get-session", (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Não autenticado" });

  res.json({
    email: req.session.user.email,
    name: req.session.user.name,
    role: req.session.user.role,
    picture: req.session.user.picture || null,
    githubAuthorized: !!req.session.githubAccessToken, // true se já autorizou
  });
});
app.get("/get-role", (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Não autenticado" });
  res.json({ role: req.session.user.role });
});

// ---------------------- LOGIN GITHUB (OPCIONAL) ----------------------
app.get("/auth/github", async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const state = genState();

  req.session.githubState = state;

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=repo&allow_signup=true`;
  res.redirect(githubAuthUrl);
  console.log(
    "REDIRECIONOU PARA O GITHUB------------------------------------------------"
  );
});

// ---------------------- CALLBACK GITHUB ----------------------
app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.githubState)
    return res.status(400).json({ message: "Estado inválido" });

  const formGit = new FormData();
  formGit.append("client_id", process.env.GITHUB_CLIENT_ID);
  formGit.append("client_secret", process.env.GITHUB_CLIENT_SECRET);
  formGit.append("code", code);
  formGit.append("redirect_uri", process.env.GITHUB_REDIRECT_URI);

  try {
    const { data } = await axios.post(
      "https://github.com/login/oauth/access_token",
      formGit,
      {
        headers: {
          ...formGit.getHeaders(),
          Accept: "application/json",
        },
      }
    );

    if (!data.access_token)
      return res.status(500).json({ message: "Erro ao autenticar com GitHub" });

    // Associa token GitHub ao usuário da sessão
    if (!req.session.user) {
      // Caso raríssimo: usuário não logado Google
      return res.redirect("/");
    }
    // Parte opcional: criar usuário só com GitHub
    if (!req.session.user) {
      // Obter dados do GitHub
      const githubUser = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `token ${data.access_token}` },
      });

      const email = githubUser.data.email || githubUser.data.login;
      if (!users[email]) {
        users[email] = { email, role: "free", githubToken: data.access_token };
        saveUsers();
      }

      req.session.user = {
        email,
        name: githubUser.data.name || email,
        picture: githubUser.data.avatar_url || null,
        role: users[email].role,
        githubToken: data.access_token,
      };
    } else {
      // Usuário já logado via Google, apenas associa GitHub
      const email = req.session.user.email;
      users[email].githubToken = data.access_token;
      saveUsers();
    }
    // Associa token GitHub ao usuário da sessão
    if (!req.session.user) {
      return res.redirect("/");
    } else {
      const email = req.session.user.email;
      users[email].githubToken = data.access_token;
      saveUsers();

      // Guardar token GitHub no cookie
      res.cookie("githubAuthToken", data.access_token, {
        httpOnly: true, // impede JS de ler, mas enviado automaticamente nas requests
        secure: false, // trocar para true em produção com HTTPS
        maxAge: 3600 * 1000, // 1 hora de validade
      });

      // opcional: se quiseres JS poder ler, adiciona outro cookie sem httpOnly
      res.cookie("githubAuthTokenPublic", data.access_token);

      req.session.githubAccessToken = data.access_token; // mantém para compatibilidade
    }

    console.log("GitHub Access Token:", data.access_token);
    res.redirect("/");
  } catch (error) {
    console.error("Erro ao trocar código GitHub:", error);
    res.status(500).json({ message: "Erro ao autenticar com GitHub" });
  }
});

// Endpoint para retornar repos GitHub (privados)
app.get("/github/repos", async (req, res) => {
  const token = req.session.githubAccessToken || req.session.user?.githubToken;
  if (!token) return res.status(401).json({ message: "GitHub não autorizado" });

  try {
    const { data } = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${token}` },
    });
    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: "Erro ao buscar repositórios" });
  }
});

// Servir repo.html
// Servir repo.html
app.get("/repo.html", (req, res) => {
  if (!req.session.githubAccessToken && !req.session.user?.githubToken) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "../views/repo.html"));
});

module.exports = app;
