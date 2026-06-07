# GitTasks

> A task management platform bridging GitHub and Google Tasks, with role-based access control.

---

## Context

Built for a web application security course, applying OAuth 2.0 delegated authentication, secure session management, and policy-based authorisation in a practical context.

The problem: development teams using GitHub milestones to manage project lifecycles have no direct way to convert those milestones into actionable Google Tasks. GitTasks bridges the two ecosystems behind a permission layer that restricts available actions based on the user's role.

---

## Features

- Secure user authentication via OAuth 2.0 with Google
- Additional GitHub OAuth authorisation for access to private repositories
- Browse milestones from any GitHub repository, public or private
- Automatically create Google Tasks from selected milestones
- Role-based access control across three tiers — **Free**, **Regular**, and **Premium** — with progressively broader permissions
- **Premium** users can set the target Google Tasks list name
- View the authenticated user's private GitHub repositories
- Persistent, secure sessions with automatic token renewal

---

## Technologies

- **Node.js + Express** — web server and routing
- **OAuth 2.0** — authentication with Google and GitHub
- **Casbin** — RBAC authorisation policy engine
- **Google Tasks API** — task list and task management
- **GitHub API** — repository and milestone queries
- **express-session** — server-side session management
- **HTML / CSS** — user interfaces

---

## What I Learned

- **OAuth 2.0 Authorization Code Grant** — correct implementation of the full flow, including secure access token handling and HTTP session management
- **Authentication vs authorisation** — clear separation between identity (who you are) and permissions (what you can do)
- **Declarative access control with Casbin** — externalising business rules from application logic, an approach directly relevant to enterprise-scale systems
- **Layered architecture** — structuring the project around routes, services, and middleware for maintainability and future scalability
