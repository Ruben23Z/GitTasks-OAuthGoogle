// middleware/auth.js
const path = require("path");
const { users } = require("../utils/usersStore");

/**
 * Verifica se o utilizador tem sessão activa.
 * Usa req.session.user como fonte de verdade.
 */
function authRequired(req, res, next) {
  if (!req.session?.user) {
    // Se for pedido HTML, devolve login page, senão 401 JSON
    if (req.accepts("html")) {
      return res.sendFile(path.join(__dirname, "..", "views", "login.html"));
    }
    return res.status(401).json({ message: "Não autenticado" });
  }
  req.user = req.session.user;
  next();
}

/**
 * Authorize middleware - verifica Casbin enforcement.
 * action/object são strings (ex: 'read','milestones').
 */
function authorize(action, object) {
  return async (req, res, next) => {
    try {
      const enforcer = req.app.locals.enforcer;
      const allowed = await enforcer.enforce(req.user.role, object, action);
      if (!allowed) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      next();
    } catch (err) {
      console.error("Erro authorize:", err);
      return res.status(500).json({ message: "Erro autorização" });
    }
  };
}

module.exports = { authRequired, authorize };
