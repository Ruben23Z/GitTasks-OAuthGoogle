// GitTasks.js

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const casbin = require("casbin");

const authRoutes = require("./routes/authRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const tasksRoutes = require("./routes/tasksRoutes");

const app = express();
const PORT = 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// Sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // importante para não criar sessão vazia
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false, // HTTP local
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  })
);

// Rotas
(async () => {
  const enforcer = await casbin.newEnforcer(
    "casbin/modelo.conf",
    "casbin/politica.csv"
  );
  app.locals.enforcer = enforcer;

  app.use("/", authRoutes);
  app.use("/", milestoneRoutes);
  app.use("/", tasksRoutes);

  // Dashboard
  app.get("/", (req, res) => {
    if (!req.session.user) {
      return res.sendFile(path.join(__dirname, "views", "login.html"));
    }
    return res.sendFile(path.join(__dirname, "views", "dashboard.html"));
  });

  // favicon.ico vazio para não gerar erro
  app.get("/favicon.ico", (req, res) => res.sendStatus(204));

  app.listen(PORT, () =>
    console.log(`Servidor ativo: http://localhost:${PORT}`)
  );
})();

app.get("/repos", (req, res) => {
  if (!req.session?.githubAccessToken) {
    return res.status(403).send("Necessário autenticar com GitHub");
  }
  res.sendFile(path.join(__dirname, "../views/repo.html"));
});
