# Portal de Sistemas · Raguife

Página de atalhos para os sistemas da equipe. Qualquer pessoa vê; só o administrador edita.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Página principal |
| `app.css` | Visual Raguife |
| `app.js` | Lista, login e edição |
| `firebase-config.js` | Chaves do projeto `atalho-de-links` (já preenchido) |
| `firestore.rules` | Regras de segurança (colar no console do Firebase) |
| `raguife-simbolo.png` | Copie o mesmo símbolo usado nos outros sistemas |

## Configuração no Firebase (uma vez só)

1. **Authentication** → *Sign-in method* → ative **E-mail/senha**.
2. **Authentication** → *Users* → **Add user** com o seu e-mail e senha. Copie o **User UID** gerado.
3. **Firestore Database** → crie o banco (modo produção).
4. **Firestore** → *Rules* → apague o conteúdo, cole o de `firestore.rules` e clique em **Publicar**.
5. **Firestore** → *Data* → **Iniciar coleção** com o nome `admins`.
   - ID do documento: cole o **User UID** do passo 2.
   - Adicione um campo qualquer, por exemplo `nome` = `seu nome`.
6. **Authentication** → *Settings* → *Authorized domains* → adicione `SEU-USUARIO.github.io`.

Para dar acesso de edição a outra pessoa no futuro: crie o usuário (passo 2) e um documento para ele em `admins` (passo 5).

## Publicação no GitHub Pages

1. Crie um repositório e envie todos os arquivos desta pasta para a raiz.
2. *Settings* → *Pages* → *Source*: **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Em alguns minutos o portal estará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Uso

- Clique em **Entrar** no topo e faça login.
- **+ Novo sistema** cadastra; **Editar** em cada card altera ou exclui.
- Para sistemas com mais de um site, use **+ Adicionar site** e dê um rótulo a cada botão (ex.: *Produção* e *Homologação*).
- **Ordem** é opcional: números menores aparecem primeiro dentro da categoria.
