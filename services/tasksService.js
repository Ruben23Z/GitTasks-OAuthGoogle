// tasksServices.js

const axios = require("axios");

async function getTaskLists(accessToken) {
  const res = await axios.get("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data.items || [];
}

async function createTaskList(accessToken, title) {
  const res = await axios.post(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    { title },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
}

async function createTask(accessToken, listId, task) {
  const res = await axios.post(
    `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`,
    task,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
}

module.exports = { getTaskLists, createTaskList, createTask };
