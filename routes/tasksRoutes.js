const express = require("express");
const app = express.Router();
const { authRequired, authorize } = require("../middleware/auth");
const {
  getTaskLists,
  createTaskList,
  createTask,
} = require("../services/tasksService");


// GET LISTS --------------------------------------------------------

app.get(
  "/tasks/lists",
  authRequired,
  authorize("read", "tasks"),
  async (req, res) => {
    try {
      const token = req.user.accessToken;
      if (!token) return res.status(401).json({ message: "Missing access token" });

      const lists = await getTaskLists(token);
      res.json(lists);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao obter listas" });
    }
  }
);


// CREATE TASK FROM MILESTONE ---------------------------------------

app.post(
  "/create-task-from-milestone",
  authRequired,
  authorize("write", "tasks"),
  async (req, res) => {
    try {
      const token = req.user.accessToken;
      if (!token) return res.status(401).json({ message: "Missing access token" });

      const { milestoneTitle, listName } = req.body;
      const role = req.user.role;

      if (!milestoneTitle)
        return res.status(400).json({ message: "MilestoneTitle é obrigatório" });

      let taskListName;

      if (role === "regular") {
        taskListName = "GitTasks";

      } else if (role === "premium") {
        taskListName = listName || "GitTasks";

      } else {
        return res.status(403).json({
          message: "Este tipo de utilizador não pode criar tarefas"
        });
      }


      // Buscar listas
      let lists = await getTaskLists(token);
      let list = lists.find((l) => l.title === taskListName);

      // Criar lista se não existir
      if (!list) {
        list = await createTaskList(token, taskListName);
      }

      // Criar tarefa
      const task = await createTask(token, list.id, {
        title: milestoneTitle,
      });

      res.json({ message: "Tarefa criada com sucesso!", task });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao criar a tarefa" });
    }
  }
);


module.exports = app;
