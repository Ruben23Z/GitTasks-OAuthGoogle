const express = require("express");
const app = express.Router();
const path = require("path");

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
    res.clearCookie("connect.sid");
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
app.get("/get-session", (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ message: "Não autenticado" });
  res.json({ email: req.session.user.email, role: req.session.user.role });
});

// Retorna os dados da sessão do utilizador (para front-end)
app.get("/get-session", (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Não autenticado" });

  res.json({
    email: req.session.user.email,
    name: req.session.user.name,
    role: req.session.user.role,
    picture: req.session.user.picture || null,
  });
});
app.get("/get-role", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Não autenticado" });
  res.json({ role: req.session.user.role });
});

module.exports = app;
