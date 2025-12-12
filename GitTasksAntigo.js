// http://localhost:3001/login
// node GitTasks.js

const express = require("express");
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const axios = require("axios");
const FormData = require("form-data");
const jwt = require("jsonwebtoken");
const { URLSearchParams } = require("url");
const crypto = require("crypto");
const casbin = require("casbin");
const session = require("express-session");

require("dotenv").config();

const PORT = 3001; //porta
// system variables where Client credentials are stored
const CLIENT_ID = process.env.CLIENT_ID;
exports.CLIENT_ID = CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
exports.CLIENT_SECRET = CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;
exports.GOOGLE_REDIRECT_URI = GOOGLE_REDIRECT_URI;

const CALLBACK = "auth/google/callback";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true, // garante renovação da sessão a cada pedido
    cookie: {
      httpOnly: true,
      secure: false, // true em produção com HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  })
);

let milestone = [];
const users = {}; // email → { access_token, role }
exports.users = users;

let enforcer;
(async () => {
  enforcer = await casbin.newEnforcer("modelo.conf", "politica.csv");
})();

function genState() {
  return crypto.randomBytes(16).toString("base64url");
}
function authRequired(req, res, next) {
  //os cookies identificam o utilizador atraves do email
  const email = req.cookies.SessionCookie; //obtem os cookies de sessao enviados ao browser

  if (!email || !users[email]) return res.status(401).send("Não autenticado");

  req.user = users[email]; //guarda o objeto {email, role, aces token}
  next();
}

// verifica a autorizacao do cashbin
function authorize(action, object) {
  //diz a acao e o objeto para manusear
  return async (req, res, next) => {
    const allowed = await enforcer.enforce(req.user.role, object, action);
    if (!allowed) return res.status(403).send("Acesso negado");
    next();
  };
}

// Rota principal da aplicação----------------------------
app.get("/", (req, res) => {
  const email = req.cookies.SessionCookie; // Obtem o email guardado no cookie de sessão
  if (!email || !users[email]) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GitTasks - Login</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }

              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding: 20px;
              }

              .login-container {
                  background: white;
                  border-radius: 16px;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                  max-width: 450px;
                  width: 100%;
                  padding: 50px 40px;
                  text-align: center;
                  animation: fadeIn 0.6s ease-in;
              }

              @keyframes fadeIn {
                  from {
                      opacity: 0;
                      transform: translateY(-30px);
                  }
                  to {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }

              .logo {
                  font-size: 72px;
                  margin-bottom: 20px;
                  animation: bounce 2s infinite;
              }

              @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
              }

              h1 {
                  color: #333;
                  font-size: 36px;
                  margin-bottom: 10px;
                  font-weight: 700;
              }

              .subtitle {
                  color: #666;
                  font-size: 16px;
                  margin-bottom: 40px;
                  line-height: 1.6;
              }

              .login-btn {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  background: white;
                  color: #333;
                  padding: 16px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 16px;
                  border: 2px solid #e0e0e0;
                  transition: all 0.3s ease;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              }

              .login-btn:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                  border-color: #4285f4;
              }

              .login-btn:active {
                  transform: translateY(-1px);
              }

              .google-icon {
                  font-size: 24px;
              }

              .features {
                  margin-top: 40px;
                  padding-top: 30px;
                  border-top: 2px solid #f0f0f0;
              }

              .features h3 {
                  font-size: 14px;
                  color: #888;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  margin-bottom: 15px;
              }

              .feature-list {
                  display: flex;
                  flex-direction: column;
                  gap: 10px;
                  text-align: left;
              }

              .feature-item {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  color: #555;
                  font-size: 14px;
              }

              .feature-icon {
                  font-size: 20px;
              }
          </style>
      </head>
      <body>
          <div class="login-container">
              <div class="logo">🚀</div>
              <h1>GitTasks</h1>
              <p class="subtitle">
                  Integre os seus milestones do GitHub com o Google Tasks de forma simples e eficiente
              </p>
              
              <a href="/login" class="login-btn">
                  <span class="google-icon">🔐</span>
                  <span>Login com Google</span>
              </a>

              <div class="features">
                  <h3>Funcionalidades</h3>
                  <div class="feature-list">
                      <div class="feature-item">
                          <span class="feature-icon">📊</span>
                          <span>Consultar milestones do GitHub</span>
                      </div>
                      <div class="feature-item">
                          <span class="feature-icon">✅</span>
                          <span>Criar tarefas no Google Tasks</span>
                      </div>
                      <div class="feature-item">
                          <span class="feature-icon">🔒</span>
                          <span>Autenticação segura via OAuth 2.0</span>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `);
  }

  const user = users[email];

  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitTasks - Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }

            .dashboard-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 700px;
                width: 100%;
                overflow: hidden;
                animation: fadeIn 0.5s ease-in;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px;
                text-align: center;
                color: white;
            }

            .header .logo {
                font-size: 60px;
                margin-bottom: 15px;
            }

            .header h1 {
                font-size: 32px;
                margin-bottom: 10px;
                font-weight: 700;
            }

            .header .subtitle {
                opacity: 0.9;
                font-size: 14px;
            }

            .content {
                padding: 40px;
            }

            .welcome-section {
                text-align: center;
                margin-bottom: 35px;
            }

            .welcome-section h2 {
                color: #333;
                font-size: 28px;
                margin-bottom: 15px;
            }

            .user-badge {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: #f8f9fa;
                padding: 12px 24px;
                border-radius: 30px;
                margin-bottom: 10px;
            }

            .user-email {
                color: #667eea;
                font-weight: 600;
                font-size: 16px;
            }

            .role-container {
                margin-top: 15px;
            }

            .role-label {
                font-size: 13px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }

            .role-badge {
                display: inline-block;
                padding: 8px 20px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .role-badge.free {
                background: #fee;
                color: #e74c3c;
                border: 2px solid #e74c3c;
            }

            .role-badge.regular {
                background: #e3f2fd;
                color: #2196f3;
                border: 2px solid #2196f3;
            }

            .role-badge.premium {
                background: #fff3e0;
                color: #ff9800;
                border: 2px solid #ff9800;
            }

            .actions {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                margin-top: 30px;
            }

            .action-card {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                text-decoration: none;
                color: #333;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }

            .action-card:hover {
                transform: translateX(5px);
                background: white;
                border-color: #667eea;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            }

            .action-icon {
                font-size: 40px;
                min-width: 50px;
                text-align: center;
            }

            .action-content h3 {
                font-size: 18px;
                margin-bottom: 5px;
                color: #333;
            }

            .action-content p {
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }

            .logout-section {
                margin-top: 30px;
                padding-top: 25px;
                border-top: 2px solid #f0f0f0;
                text-align: center;
            }

            .logout-btn {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 30px;
                background: #f8f9fa;
                color: #666;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                transition: all 0.3s ease;
                border: 2px solid #e0e0e0;
            }

            .logout-btn:hover {
                background: #e74c3c;
                color: white;
                border-color: #e74c3c;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
            }

            @media (max-width: 600px) {
                .header {
                    padding: 30px 20px;
                }

                .content {
                    padding: 25px;
                }

                .welcome-section h2 {
                    font-size: 24px;
                }

                .action-card {
                    padding: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="header">
                <div class="logo">🚀</div>
                <h1>GitTasks</h1>
                <p class="subtitle">Dashboard de Gestão</p>
            </div>

            <div class="content">
                <div class="welcome-section">
                    <h2>Bem-vindo!</h2>
                    
                    <div class="user-badge">
                        <span style="font-size: 24px;">👤</span>
                        <span class="user-email">${email}</span>
                    </div>

                    <div class="role-container">
                        <div class="role-label">Papel Ativo</div>
                        <span class="role-badge ${
                          user.role
                        }">${user.role.toUpperCase()}</span>
                    </div>
                </div>

                <div class="actions">
                    <a href="/milestones" class="action-card">
                        <div class="action-icon">📊</div>
                        <div class="action-content">
                            <h3>Consultar Milestones</h3>
                            <p>Visualize e gerencie milestones dos seus repositórios GitHub</p>
                        </div>
                    </a>

                    <a href="/tasks/lists" class="action-card">
                        <div class="action-icon">✅</div>
                        <div class="action-content">
                            <h3>Google Tasks</h3>
                            <p>Aceda às suas listas de tarefas do Google Tasks</p>
                        </div>
                    </a>
                </div>

                <div class="logout-section">
                    <a href="/logout" class="logout-btn">
                        <span>🚪</span>
                        <span>Terminar Sessão</span>
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `);
});

//LOGIN DO GOOGLE ----------------------------------
app.get("/login", (req, resp) => {
  const state = genState();

  if (req.session) req.session.oauthState = state; //guarda na sessão
  console.log("=" * 80);
  console.log("Generated state:", state);
  console.log("Session before redirect:", req.session);

  const googleAuthURL =
    "https://accounts.google.com/o/oauth2/v2/auth?" + // authorization endpoint
    new URLSearchParams({
      client_id: CLIENT_ID, // client id
      scope: "openid email profile", // OpenID scope "openid email"
      state: state,
      response_type: "code", // responde_type for "authorization code grant"
      //"redirect_uri=http://localhost:" +PORT +"/" + CALLBACK`
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
  resp.redirect(302, googleAuthURL);
});

// CALLBACK DO
// OAUTH2, TROCA CODE POR ACESS TOKEN--------------------------------
app.get("/" + CALLBACK, async (req, resp) => {
  try {
    console.log("=" * 80);
    console.log("Session at callback:", req.session);

    const { code, state, error } = req.query;
    if (error) return resp.status(400).send(`Erro do Google: ${error}`);
    if (!code) return resp.status(400).send("Code não recebido");
    // fallback para dev: se a sessão não existir, usamos o state recebido
    let sessionState = req.session?.oauthState;
    if (!sessionState) {
      console.warn(
        "⚠️ Sessão não encontrada. Ignorando validação de state (apenas dev)."
      );
      sessionState = state;
    }

    if (state !== sessionState) return resp.status(400).send("State inválido");

    console.log("Fazendo request ao token endpoint...");

    //Prepara o pedido do Token Endpoint como o google exige
    const form = new FormData();
    form.append("code", code);
    form.append("client_id", CLIENT_ID);
    form.append("client_secret", CLIENT_SECRET);
    form.append("redirect_uri", GOOGLE_REDIRECT_URI);
    form.append("grant_type", "authorization_code");
    //console.log(form);

    // Fazer POST para trocar code por tokens

    const response = await axios.post(
      //envia o token para o endpoint
      "https://www.googleapis.com/oauth2/v3/token", // token endpoint
      form,
      { headers: form.getHeaders() }
    );

    const { access_token, id_token, refresh_token } = response.data;
    var jwt_payload = jwt.decode(response.data.id_token); //descodifica o payload vindo do google

    console.log("JWT Payload:", jwt_payload);

    resp.cookie("SessionCookie", jwt_payload.email); //guarda o email do usuario no cookie

    // Guardar tokens e role do utilizador em memória
    if (!users[jwt_payload.email]) {
      users[jwt_payload.email] = {
        email: jwt_payload.email,
        role: "free", // default role
        access_token,
        refresh_token,
      };
    } else {
      users[jwt_payload.email].access_token = access_token;
      users[jwt_payload.email].refresh_token = refresh_token;
    }

    // Guarda dados do utilizador na sessão
    req.session.user = {
      email: jwt_payload.email,
      name: jwt_payload.name || jwt_payload.email,
      picture: jwt_payload.picture || null,
      role: users[jwt_payload.email].role,
      accessToken: access_token,
      refreshToken: refresh_token,
    };

    //   mostra o code, acess_token e o id_token na tela
    // resp.send(
    //   "<div> callback with code = <code>" +
    //     req.query.code +
    //     "</code></div><br>" +
    //     "<div> client app received access code = <code>" +
    //     response.data.access_token +
    //     "</code></div><br>" +
    //     "<div> id_token = <code>" +
    //     response.data.id_token +
    //     "</code></div><br>" +
    //     "<div> Hi <b>" +
    //     jwt_payload.email +
    //     "</b> </div><br>" +
    //     'Go back to <a href="/">Home screen</a>'
    // );

    resp.redirect("/");
  } catch (err) {
    console.error(err);
    resp.status(500).send("Erro ao processar callback do Google.");
  }
});

app.get("/logout", (req, resp) => {
  req.session.destroy();
  resp.clearCookie("SessionCookie");
  resp.clearCookie("AccessToken");
  resp.clearCookie("SessionCookie");
  resp.redirect("/");
});

// MILESTONES -------------------------------------------------------------------------

app.get("/milestones", authRequired, async (req, res) => {
  const email = req.cookies.SessionCookie;
  const role = users[email].role;

  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitTasks - Consultar Milestones</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }

            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 100%;
                padding: 40px;
                animation: fadeIn 0.5s ease-in;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #f0f0f0;
            }

            .header h1 {
                color: #333;
                font-size: 28px;
                margin-bottom: 10px;
            }

            .header .logo {
                font-size: 48px;
                margin-bottom: 10px;
            }

            .user-info {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 30px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .user-info .email {
                font-weight: 500;
            }

            .role-badge {
                background: rgba(255, 255, 255, 0.2);
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }

            .role-badge.free {
                background: #e74c3c;
            }

            .role-badge.regular {
                background: #3498db;
            }

            .role-badge.premium {
                background: #f39c12;
            }

            .form-section {
                margin-top: 20px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            label {
                display: block;
                margin-bottom: 8px;
                color: #555;
                font-weight: 600;
                font-size: 14px;
            }

            input[type="text"] {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 15px;
                transition: all 0.3s ease;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            input[type="text"]:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            input[type="text"]::placeholder {
                color: #aaa;
            }

            .input-hint {
                font-size: 12px;
                color: #888;
                margin-top: 5px;
                font-style: italic;
            }

            button {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            }

            button:active {
                transform: translateY(0);
            }

            .navigation {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #f0f0f0;
                display: flex;
                gap: 10px;
            }

            .nav-link {
                flex: 1;
                text-align: center;
                padding: 10px;
                background: #f8f9fa;
                color: #667eea;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                transition: all 0.3s ease;
                font-size: 14px;
            }

            .nav-link:hover {
                background: #667eea;
                color: white;
            }

            .permissions-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #667eea;
            }

            .permissions-info h3 {
                font-size: 14px;
                color: #333;
                margin-bottom: 8px;
            }

            .permissions-info ul {
                list-style: none;
                font-size: 13px;
                color: #666;
            }

            .permissions-info ul li {
                padding: 4px 0;
                padding-left: 20px;
                position: relative;
            }

            .permissions-info ul li:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #667eea;
                font-weight: bold;
            }

            @media (max-width: 600px) {
                .container {
                    padding: 25px;
                }

                .header h1 {
                    font-size: 24px;
                }

                .navigation {
                    flex-direction: column;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo"></div>
                <h1>GitTasks</h1>
                <p style="color: #888; font-size: 14px;">Gestão de Milestones GitHub</p>
            </div>

            <div class="user-info">
                <div>
                    <div style="font-size: 12px; opacity: 0.9;">Autenticado como</div>
                    <div class="email">${email}</div>
                </div>
                <div class="role-badge ${role}">${role.toUpperCase()}</div>
            </div>

            <div class="permissions-info">
                <h3>📋 Permissões do papel "${role}":</h3>
                <ul>
                    <li>Visualizar milestones de repositórios GitHub</li>
                    ${
                      role === "regular" || role === "premium"
                        ? "<li>Criar tarefas a partir de milestones</li>"
                        : ""
                    }
                    ${
                      role === "premium"
                        ? "<li>Escolher lista de tarefas personalizada</li>"
                        : ""
                    }
                </ul>
            </div>

            <div class="form-section">
                <form action="/github-milestones" method="GET">
                    <div class="form-group">
                        <label for="owner"> Proprietário do Repositório (Owner)</label>
                        <input 
                            type="text" 
                            id="owner" 
                            name="owner" 
                            placeholder="e.g., torvalds"
                            required
                        >
                        <div class="input-hint">Nome do utilizador ou organização no GitHub</div>
                    </div>

                    <div class="form-group">
                        <label for="repo"> Nome do Repositório</label>
                        <input 
                            type="text" 
                            id="repo" 
                            name="repo" 
                            placeholder="e.g., linux"
                            required
                        >
                        <div class="input-hint">Nome exato do repositório GitHub</div>
                    </div>

                    <button type="submit"> Consultar Milestones</button>
                </form>
            </div>

            <div class="navigation">
                <a href="/" class="nav-link"> Início</a>
                <a href="/logout" class="nav-link"> Logout</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

app.get(
  "/github-milestones",
  authRequired,
  authorize("read", "milestones"),
  async (req, res) => {
    const role = req.user.role;
    const { owner, repo } = req.query;

    if (!owner || !repo) return res.status(400).send("Falta owner ou repo");

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/milestones`
      );

      const milestones = response.data;

      // Nenhuma milestone
if (milestones.length === 0) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="pt">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sem Milestones</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              text-align: center;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            }
            h2 {
              color: #1f2937;
              margin-bottom: 16px;
            }
            a {
              color: #667eea;
              text-decoration: none;
              font-weight: 500;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Sem milestones neste repositório</h2>
            <a href="/milestones">Voltar</a>
          </div>
        </body>
        </html>
      `);
    }
      let milestoneHTML = "";
      milestones.forEach((ms) => {
        milestoneHTML += `
        <div class="milestone-card">
          <h3>${ms.title}</h3>
          <p class="description">${ms.description || "Sem descrição"}</p>
          <div class="milestone-meta">
            <span class="badge ${
              ms.state === "open" ? "badge-open" : "badge-closed"
            }">${ms.state}</span>
            <span class="meta-item"><strong>Data Limite:</strong> ${
              ms.due_on
                ? new Date(ms.due_on).toLocaleDateString("pt-PT")
                : "Sem data"
            }</span>
            <span class="meta-item"><strong>Progresso:</strong> ${
              ms.closed_issues
            }/${ms.open_issues + ms.closed_issues} issues fechadas</span>
          </div>
          ${
            role === "regular" || role === "premium"
              ? `
            <form action="/milestones/create-task" method="POST" class="task-form">
              <input type="hidden" name="title" value="${ms.title}">
              <input type="hidden" name="description" value="${
                ms.description || ""
              }">
              ${
                role === "premium"
                  ? `
                <label for="list-${ms.number}">Escolher lista:</label>
                <select name="list" id="list-${ms.number}" class="task-list-select">
                  <option>Carregar listas...</option>
                </select>
              `
                  : ""
              }
              <button type="submit">Criar tarefa</button>
            </form>
          `
              : ""
          }
        </div>
      `;
      });

      res.send(`
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milestones - ${owner}/${repo}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          h1 {
            color: #1f2937;
            margin-bottom: 8px;
            font-size: 24px;
            font-weight: 600;
          }
          .repo-info {
            color: #6b7280;
            margin-bottom: 24px;
            font-size: 14px;
          }
          .milestone-card {
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
            background: #fafafa;
          }
          .milestone-card h3 {
            color: #1f2937;
            margin-bottom: 8px;
            font-size: 18px;
            font-weight: 600;
          }
          .description {
            color: #6b7280;
            margin-bottom: 12px;
            font-size: 14px;
            line-height: 1.5;
          }
          .milestone-meta {
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 12px;
          }
          .badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
          }
          .badge-open {
            background: #dbeafe;
            color: #1e40af;
          }
          .badge-closed {
            background: #dcfce7;
            color: #166534;
          }
          .meta-item {
            font-size: 13px;
            color: #6b7280;
          }
          .task-form {
            display: flex;
            gap: 8px;
            align-items: flex-end;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          .task-form label {
            display: block;
            font-size: 13px;
            color: #374151;
            font-weight: 500;
            margin-bottom: 4px;
          }
          .task-list-select {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            background: white;
          }
          .task-list-select:focus {
            outline: none;
            border-color: #667eea;
          }
          button {
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          button:hover {
            opacity: 0.9;
          }
          .back-link {
            display: inline-block;
            margin-top: 24px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
          }
          .back-link:hover {
            text-decoration: underline;
          }
          @media (max-width: 600px) {
            .container {
              padding: 20px;
            }
            .milestone-meta {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
            .task-form {
              flex-direction: column;
            }
            button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Milestones do repositório ${owner}/${repo}</h1>
          <p class="repo-info">Role: ${role}</p>
          ${milestoneHTML}
          <a href="/milestones" class="back-link">Voltar</a>
        </div>

        <script>
          const isPremium = "${role}" === "premium";
          if(isPremium){
            fetch("/tasks/lists")
              .then(r => r.json())
              .then(lists => {
                document.querySelectorAll(".task-list-select").forEach(select => {
                  select.innerHTML = "";
                  lists.forEach(list => {
                    const opt = document.createElement("option");
                    opt.value = list.id;
                    opt.textContent = list.title;
                    select.appendChild(opt);
                  });
                });
              });
          }
        </script>
      </body>
      </html>
    `);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return res.send(`
          <h1>Repositório não encontrado</h1>
          <a href='/milestones'>Voltar</a>
        `);
      }

      console.error(err);
      return res.status(500).send("Erro ao contactar o GitHub");
    }
  }
);

// Criar tarefa a partir de milestone
app.post(
  "/milestones/create-task",
  authRequired,
  authorize("write", "tasks"),
  async (req, res) => {
    const { list, title, description } = req.body;
    const accessToken = req.user.access_token;
    try {
      const response = await axios.post(
        `https://tasks.googleapis.com/tasks/v1/lists/${list}/tasks`,
        { title, notes: description },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      res.json({ success: true, task: response.data });
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao criar tarefa no Google Tasks");
    }
  }
);

//-------------------------------------------------------------
//Google Tasks

// Listar listas de tarefas
app.get(
  "/tasks/lists",
  authRequired,
  authorize("read", "tasks"),
  async (req, res) => {
    const accessToken = req.user.access_token;
    const response = await axios.get(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.json(response.data.items || []);
  }
);

// Criar nova lista de tarefas
app.post(
  "/tasks/lists",
  authRequired,
  authorize("write", "tasks"),
  async (req, res) => {
    const { title } = req.body;
    const accessToken = req.user.access_token;
    const response = await axios.post(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      { title },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.json(response.data);
  }
);

// Criar tarefa numa lista
app.post(
  "/tasks/create",
  authRequired,
  authorize("write", "tasks"),
  async (req, res) => {
    const { taskListId, title } = req.body;
    const accessToken = req.user.access_token;
    const response = await axios.post(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      { title },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    res.json(response.data);
  }
);

app.listen(PORT, (err) => {
  if (err) {
    return console.log("something bad happened", err);
  }
  console.log(`server is listening on ${PORT}`);
});
