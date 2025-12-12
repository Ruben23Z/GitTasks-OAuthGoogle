//githubServices


const axios = require("axios");

async function getMilestones(owner, repo, token) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/milestones`,
    {
      headers: {
        "User-Agent": "GitTasks-App", // Identificação do cliente (aplicação)
        Authorization: `Bearer ${token}`, // Envio do token no cabeçalho
        Accept: "application/vnd.github.v3+json", // Tipo de resposta que esperamos
      },
    }
  );
  return response.data;
}

async function getUserRepositories(accessToken) {
  const response = await axios.get("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}





module.exports = { getUserRepositories, getMilestones };