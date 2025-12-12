const axios = require("axios");
const FormData = require("form-data");
const jwt = require("jsonwebtoken");

async function exchangeCodeForTokens(code, redirectURI) {
  try {
    const form = new FormData();
    form.append("code", code);
    form.append("client_id", process.env.CLIENT_ID);
    form.append("client_secret", process.env.CLIENT_SECRET);
    form.append("redirect_uri", redirectURI);
    form.append("grant_type", "authorization_code");

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      form,
      { headers: form.getHeaders() }
    );

    return response.data;
    // → { access_token, refresh_token, id_token, expires_in, scope, token_type }
  } catch (err) {
    console.error("Erro ao trocar code por tokens:", err.response?.data || err);
    throw new Error("Google Token Exchange Failed");
  }
}

function decodeIDToken(idToken) {
  try {
    return jwt.decode(idToken);
    // Ideal: usar google-auth-library para verificar token
  } catch {
    return null;
  }
}

module.exports = { exchangeCodeForTokens, decodeIDToken };
