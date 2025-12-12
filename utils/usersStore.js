const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "users.json");

// Carrega usuários do ficheiro (se existir)
let users = {};
if (fs.existsSync(filePath)) {
  const data = fs.readFileSync(filePath, "utf-8");
  users = JSON.parse(data);
}

// Salva usuários no ficheiro
function saveUsers() {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf-8");
}

module.exports = { users, saveUsers };
