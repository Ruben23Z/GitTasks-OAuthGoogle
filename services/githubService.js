const axios = require("axios");

async function getMilestones(owner, repo) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/milestones`,
    { headers: { 
        "User-Agent": "GitTasks-App"
        
    
    } }
  );
  return response.data;
}

module.exports = { getMilestones };
