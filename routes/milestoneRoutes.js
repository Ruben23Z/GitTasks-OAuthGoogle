//milestoneRoutes.js

const express = require("express");
const app = express.Router();
const { authRequired, authorize } = require("../middleware/auth");
const { getMilestones } = require("../services/githubService");

// Serve a página milestones.html estática (front-end JS irá buscar os dados)
app.get("/milestones", authRequired, (req, res) => {
  res.sendFile("milestones.html", { root: "views" });
});

// Endpoint que retorna os milestones de um repositório GitHub
app.get(
  "/github-milestones",
  authRequired,
  authorize("read", "milestones"),
  async (req, res) => {
    const { owner, repo } = req.query;
    if (!owner || !repo) return res.status(400).send("Falta owner ou repo");
    const userToken = req.session.token; // A forma de obter o token pode variar
    try {
      const milestones = await getMilestones(owner, repo, userToken);
      if (milestones.length === 0)
        return res.sendFile("noMilestones.html", { root: "views" });

      // Constrói HTML dos milestones
      let milestonesHTML = "";
      milestones.forEach((ms, index) => {
        const progressPercent =
          ms.open_issues + ms.closed_issues > 0
            ? Math.round(
                (ms.closed_issues / (ms.open_issues + ms.closed_issues)) * 100
              )
            : 0;

        milestonesHTML += `
          <div class="milestone-card" style="animation-delay: ${index * 0.08}s">
            <div class="card-glow"></div>
            <div class="milestone-header">
              <h3 class="milestone-title">${ms.title}</h3>
              <span class="milestone-badge ${ms.state}">
                ${ms.state === "open" ? "Aberto" : "Fechado"}
              </span>
            </div>
            <p class="milestone-description">${
              ms.description || "Sem descrição"
            }</p>
            <div class="milestone-meta">
              <div class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div class="meta-content">
                  <span class="meta-label">Data Limite</span>
                  <span class="meta-value">${
                    ms.due_on
                      ? new Date(ms.due_on).toLocaleDateString("pt-PT")
                      : "Sem data"
                  }</span>
                </div>
              </div>
              <div class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                <div class="meta-content">
                  <span class="meta-label">Issues</span>
                  <span class="meta-value">${ms.closed_issues}/${
          ms.open_issues + ms.closed_issues
        } concluídas</span>
                </div>
              </div>
            </div>
            <div class="progress-container">
              <div class="progress-header">
                <span class="progress-label">Progresso</span>
                <span class="progress-text">${progressPercent}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%" data-progress="${progressPercent}">
                  <div class="progress-shine"></div>
                </div>
              </div>
            </div>
            <button class="create-task-btn" data-title="${ms.title}">
              <span class="btn-content">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span class="btn-text">Criar Tarefa</span>
              </span>
              <div class="btn-shine"></div>
            </button>
          </div>`;
      });

      // HTML completo com estilos CSS incorporados
      const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestones - ${owner}/${repo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #1a1a1a;
      min-height: 100vh;
      padding: 2rem;
      color: #d7d7d7ff;
      position: relative;
      overflow-x: hidden;
        font-weight: 800;

    }

    /* Gradient background animado */
    body::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: 
        radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, rgba(34, 211, 238, 0.06) 0%, transparent 50%);
      animation: gradientShift 20s ease infinite;
      z-index: 0;
    }

    @keyframes gradientShift {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      33% { transform: translate(5%, -5%) rotate(120deg); }
      66% { transform: translate(-5%, 5%) rotate(240deg); }
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .page-header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 3rem 2rem;
      background: rgba(22, 27, 34, 0.6);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(240, 246, 252, 0.1);
      box-shadow: 
        0 0 0 1px rgba(240, 246, 252, 0.05),
        0 20px 60px -15px rgba(0, 0, 0, 0.5);
      animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    .page-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
      animation: headerShine 3s infinite;
    }

    @keyframes headerShine {
      0% { left: -100%; }
      100% { left: 200%; }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .page-header h1 {
      font-size: 3rem;
      font-weight: 900;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #22d3ee 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
      animation: titleGlow 3s ease-in-out infinite;
      position: relative;
      z-index: 1;
    }

    @keyframes titleGlow {
      0%, 100% {
        filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
      }
      50% {
        filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.4));
      }
    }

    .repo-info {
      font-size: 1.2rem;
      color: #8b949e;
      margin-bottom: 1.5rem;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      background: rgba(110, 118, 129, 0.1);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      display: inline-block;
      font-weight: 600;
      border: 1px solid rgba(240, 246, 252, 0.1);
      position: relative;
      z-index: 1;
    }

    #user-role {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.5rem;
      border-radius: 12px;
      font-weight: 900;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      margin-top: 1rem;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
      animation: rolePulse 3s ease-in-out infinite;
      position: relative;
      z-index: 1;
    }

    @keyframes rolePulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 12px 35px rgba(139, 92, 246, 0.4);
      }
    }

    .milestones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .milestone-card {
      background: rgba(22, 27, 34, 0.7);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 2rem;
      border: 1px solid rgba(240, 246, 252, 0.1);
      box-shadow: 
        0 0 0 1px rgba(240, 246, 252, 0.05),
        0 10px 40px rgba(0, 0, 0, 0.3);
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      position: relative;
      overflow: hidden;
    }

    .card-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
    }

    .milestone-card:hover .card-glow {
      opacity: 1;
      animation: glowRotate 8s linear infinite;
    }

    @keyframes glowRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .milestone-card:hover {
      transform: translateY(-12px) scale(1.02);
      border-color: rgba(59, 130, 246, 0.3);
      box-shadow: 
        0 0 0 1px rgba(59, 130, 246, 0.2),
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 40px rgba(59, 130, 246, 0.15);
    }

    .milestone-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.2rem;
      gap: 1rem;
      position: relative;
      z-index: 1;
    }

    .milestone-title {
      font-size: 1.5rem;
      color: #b3bbc2ff;
      font-weight: 800;
      flex: 1;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }

    .milestone-badge {
      padding: 0.5rem 1rem;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      white-space: nowrap;
      animation: badgePop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    @keyframes badgePop {
      0% {
        transform: scale(0) rotate(-10deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.1) rotate(5deg);
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }

    .milestone-badge.open {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .milestone-badge.closed {
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      color: white;
    }

    .milestone-description {
      color: #8b949e;
      line-height: 1.7;
      margin-bottom: 1.8rem;
      font-size: 1rem;
      font-weight: 500;
      position: relative;
      z-index: 1;
    }

    .milestone-meta {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      margin-bottom: 1.8rem;
      position: relative;
      z-index: 1;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(110, 118, 129, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(240, 246, 252, 0.05);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .meta-item:hover {
      background: rgba(110, 118, 129, 0.15);
      border-color: rgba(59, 130, 246, 0.2);
      transform: translateX(6px);
    }

    .meta-icon {
      width: 22px;
      height: 22px;
      color: #3b82f6;
      flex-shrink: 0;
    }

    .meta-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .meta-label {
      font-weight: 700;
      color: #8b949e;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-value {
      color: #e6edf3;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .progress-container {
      margin-bottom: 1.8rem;
      position: relative;
      z-index: 1;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.8rem;
    }

    .progress-label {
      font-weight: 700;
      color: #8b949e;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .progress-text {
      font-weight: 800;
      color: #e6edf3;
      font-size: 1.1rem;
    }

    .progress-bar {
      height: 14px;
      background: rgba(110, 118, 129, 0.2);
      border-radius: 20px;
      overflow: hidden;
      position: relative;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 20px;
      transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }

    .progress-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      animation: progressShine 2s infinite;
    }

    @keyframes progressShine {
      0% { left: -100%; }
      100% { left: 200%; }
    }

    .create-task-btn {
      width: 100%;
      padding: 1.1rem 1.8rem;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 0 0 1px rgba(59, 130, 246, 0.3),
        0 8px 25px rgba(59, 130, 246, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 1;
    }

    .btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      position: relative;
      z-index: 2;
    }

    .btn-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: left 0.5s ease;
    }

    .create-task-btn:hover .btn-shine {
      left: 100%;
    }

    .create-task-btn:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 
        0 0 0 1px rgba(59, 130, 246, 0.5),
        0 12px 40px rgba(59, 130, 246, 0.5),
        0 0 60px rgba(139, 92, 246, 0.3);
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
    }

    .create-task-btn:active {
      transform: translateY(-1px) scale(0.98);
    }

    .btn-icon {
      width: 22px;
      height: 22px;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .create-task-btn:hover .btn-icon {
      transform: rotate(90deg) scale(1.1);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
      padding: 1.1rem 2.2rem;
      background: rgba(22, 27, 34, 0.7);
      backdrop-filter: blur(20px);
      color: #002749ff;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 700;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(240, 246, 252, 0.1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.9rem;
    }

    .back-link:hover {
      transform: translateX(-8px) scale(1.05);
      border-color: rgba(59, 130, 246, 0.3);
      box-shadow: 
        0 8px 25px rgba(0, 0, 0, 0.4),
        0 0 30px rgba(59, 130, 246, 0.2);
      background: rgba(22, 27, 34, 0.9);
    }

    .back-link svg {
      transition: transform 0.3s ease;
    }

    .back-link:hover svg {
      transform: translateX(-4px);
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .page-header h1 {
        font-size: 2rem;
      }

      .milestones-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .milestone-card {
        padding: 1.5rem;
      }
    }

    /* Loading animation */
    .loading {
      display: inline-block;
      width: 22px;
      height: 22px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Floating particles background */
    .particle {
      position: fixed;
      pointer-events: none;
      opacity: 0.15;
      animation: float 20s infinite;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0) translateX(0) rotate(0deg);
      }
      33% {
        transform: translateY(-20px) translateX(20px) rotate(120deg);
      }
      66% {
        transform: translateY(20px) translateX(-20px) rotate(240deg);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <h1>Milestones do Repositório</h1>
      <p class="repo-info">${owner}/${repo}</p>
      <p><strong style="color: #8b949e; font-weight: 700;">Papel atual:</strong> <span id="user-role">A carregar...</span></p>
    </div>

    <div class="milestones-grid">${milestonesHTML}</div>

    <a href="/milestones" class="back-link">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Voltar
    </a>
  </div>

  <script>
    // Função para obter o papel do utilizador
    async function getUserSession() {
      const res = await fetch("/get-session");
      if (!res.ok) return null;
      return await res.json();
    }

    // Adiciona o papel do utilizador e o listener para os botões
    document.addEventListener("DOMContentLoaded", async () => {
      const session = await getUserSession();
      const userRole = session?.role || "free";

      // Mostrar papel no ecrã
      document.getElementById("user-role").textContent = userRole;

      // Selecionar todos os botões
      const buttons = document.querySelectorAll(".create-task-btn");

      // Iterar sobre os botões para adicionar event listeners
      buttons.forEach((btn) => {
        // Se o papel for 'free', esconder o botão
        if (userRole === "free") {
          btn.style.display = "none";
          return;
        }

        // Adicionar o evento de click para os botões de criar tarefas
        btn.addEventListener("click", async () => {
          let listName = "";

          // Para premium, pedir o nome da lista
          if (userRole === "premium") {
            listName = prompt("Nome da lista de tarefas:");
            if (!listName) {
              alert("Operação cancelada: precisa indicar um nome.");
              return;
            }
          }

          // Adicionar indicador de loading ao botão
          btn.disabled = true;
          const originalText = btn.innerHTML;
          btn.innerHTML = '<div class="loading"></div>';

          // Chamada para criar a tarefa
          try {
            const response = await fetch("/create-task-from-milestone", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                milestoneTitle: btn.dataset.title,
                listName: listName
              })
            });

            const result = await response.json();
            alert(result.message);
          } catch (error) {
            alert("Erro ao criar tarefa. Por favor, tente novamente.");
          } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        });
      });

      // Animar as barras de progresso ao carregar
      setTimeout(() => {
        document.querySelectorAll('.progress-fill').forEach(fill => {
          fill.style.width = '0%';
          setTimeout(() => {
            fill.style.width = fill.dataset.progress + '%';
          }, 100);
        });
      }, 400);

     
    });
  </script>
</body>
</html>
      `;

      res.send(html);
    } catch (err) {
      if (err.response?.status === 404)
        return res.sendFile("repoNotFound.html", { root: "views" });
      res.status(500).send("Erro ao contactar o GitHub");
    }
  }
);



module.exports = app;
