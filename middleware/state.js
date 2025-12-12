//METODO PARA A CRIACAO DO STATE DE FORMA ALEATORIA



const crypto = require("crypto");

function genState() {
  return crypto.randomBytes(16).toString("base64url");
}

module.exports = { genState };
