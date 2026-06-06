# GitTasks

**Plataforma de gestão de tarefas com integração entre GitHub e Google Tasks, baseada em controlo de acessos por papéis.**

---

## Contexto e Motivação

Este projeto foi desenvolvido no âmbito de uma unidade curricular dedicada à segurança de aplicações web, com o objetivo de aplicar, em contexto prático, conceitos como autenticação delegada via OAuth 2.0, gestão de sessões seguras e controlo de autorização baseado em políticas.

O problema de partida é simples: equipas de desenvolvimento que utilizam o GitHub para gerir o ciclo de vida de projetos através de *milestones* não dispõem de uma forma direta de converter esses marcos em tarefas accionáveis no Google Tasks. O GitTasks resolve esta lacuna, funcionando como uma ponte entre os dois ecossistemas, com uma camada de permissões que restringe as ações disponíveis conforme o papel do utilizador.

---

## Principais Funcionalidades

- Autenticação segura de utilizadores através do protocolo OAuth 2.0 com conta Google
- Autorização adicional com conta GitHub, permitindo o acesso a repositórios privados
- Consulta de *milestones* de qualquer repositório GitHub, público ou privado
- Criação automática de tarefas no Google Tasks a partir de *milestones* selecionados
- Sistema de controlo de acessos baseado em três papéis distintos: **Free**, **Regular** e **Premium**, com permissões progressivamente mais alargadas
- Utilizadores **Premium** podem definir o nome da lista de tarefas de destino no Google Tasks
- Visualização dos repositórios privados do utilizador autenticado via GitHub
- Gestão de sessões persistentes e seguras, com renovação automática

---

## Tecnologias Empregues

- **Node.js** e **Express** — servidor web e definição de rotas
- **OAuth 2.0** — autenticação com Google e GitHub
- **Casbin** — motor de políticas de autorização (modelo RBAC)
- **Google Tasks API** — criação e gestão de listas e tarefas
- **GitHub API** — consulta de repositórios e *milestones*
- **express-session** — gestão de sessões do lado do servidor
- **HTML, CSS** — interfaces do utilizador

---

## Impato e Aprendizagem

O desenvolvimento do GitTasks consolidou competências fundamentais em segurança de aplicações web, nomeadamente a implementação correta do fluxo *Authorization Code Grant* do OAuth 2.0, a gestão segura de tokens de acesso e de sessões HTTP, e a separação clara entre autenticação e autorização.

A integração do Casbin como motor de políticas introduziu uma abordagem declarativa ao controlo de acessos, separando as regras de negócio da lógica aplicacional — uma prática com relevância direta em sistemas empresariais de maior escala.

Do ponto de vista arquitetural, o projeto foi estruturado com separação de responsabilidades em rotas, serviços e *middleware*, o que favorece a manutenibilidade e a escalabilidade futura da aplicação.
