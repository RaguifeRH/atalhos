import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const colSistemas = collection(db, "sistemas");

/* ---------- estado ---------- */
let sistemas = [];
let usuario = null;
let admin = false;
let filtro = "";

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
/* Uma cor por categoria: [destaque, fundo]. Distribuídas na ordem alfabética das categorias. */
const CORES = [
  ["#024f2b", "#e2efe6"], // verde Raguife
  ["#8f5a0c", "#fbf0dc"], // âmbar
  ["#24508c", "#e4ecf7"], // azul
  ["#4f6a1c", "#edf4dd"], // oliva
  ["#9c4220", "#f9e6de"], // terracota
  ["#17616a", "#dff0f1"], // petróleo
  ["#5b3f85", "#ede7f5"], // roxo
  ["#8e3359", "#f7e3ec"], // vinho
  ["#6b5d0c", "#f5f1d4"], // mostarda
  ["#3e4f5c", "#e7ecef"], // grafite
];
const ICONE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h7v7M13 3L5 11"/></svg>';
const semAcento = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const urlValida = u => /^https?:\/\/\S+$/i.test(u);

function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "style") e.style.cssText = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) if (f != null) e.append(f);
  return e;
}

let toastTimer;
function toast(msg, erro = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "on" + (erro ? " erro" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3200);
}

function traduzErro(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "E-mail ou senha incorretos.";
  if (c.includes("too-many-requests")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (c.includes("invalid-email")) return "E-mail inválido.";
  if (c.includes("permission-denied")) return "Sem permissão para editar.";
  if (c.includes("network")) return "Sem conexão. Tente novamente.";
  return "Não foi possível concluir. " + (e?.message || "");
}

/* ---------- topo: conta ---------- */
function renderConta() {
  const c = $("conta");
  c.innerHTML = "";
  if (!usuario) {
    c.append(el("button", { class: "btn-top", onclick: abrirLogin }, "Entrar"));
    return;
  }
  if (admin) c.append(el("button", { class: "btn-top lima", onclick: () => abrirEditor() }, "+ Novo sistema"));
  c.append(
    el("span", { class: "quem" }, admin ? usuario.email : usuario.email + " (sem permissão de edição)"),
    el("button", { class: "btn-top", onclick: () => signOut(auth).then(() => toast("Você saiu.")) }, "Sair")
  );
}

/* ---------- lista ---------- */
function renderLista() {
  const lista = $("lista");
  lista.innerHTML = "";
  const f = semAcento(filtro.trim());

  const ordenados = [...sistemas].sort((a, b) =>
    (a.ordem ?? 999) - (b.ordem ?? 999) || semAcento(a.nome).localeCompare(semAcento(b.nome)));
  const categorias = [...new Set(ordenados.map(s => s.categoria || "Geral"))]
    .sort((a, b) => semAcento(a).localeCompare(semAcento(b)));

  let total = 0;
  categorias.forEach((cat, i) => {
    const itens = ordenados.filter(s => (s.categoria || "Geral") === cat && (!f ||
      semAcento([s.nome, s.descricao, s.categoria, ...(s.links || []).map(l => l.rotulo)].join(" ")).includes(f)));
    if (!itens.length) return;
    total += itens.length;
    const [destaque, fundo] = CORES[i % CORES.length];
    const cor = `--cor:${destaque};--cat-bg:${fundo}`;

    lista.append(
      el("section", { class: "cat", style: cor },
        el("div", { class: "cat-tit" },
          el("h2", {}, cat),
          el("span", {}, itens.length + (itens.length > 1 ? " sistemas" : " sistema"))),
        el("div", { class: "grade" }, itens.map(s => cardSistema(s, cor))))
    );
  });

  if (!total) {
    if (!sistemas.length) {
      lista.append(admin
        ? el("p", { class: "aviso" }, "Nenhum sistema cadastrado ainda. Use “+ Novo sistema” no topo para começar.")
        : el("p", { class: "vazio" }, "Nenhum sistema cadastrado ainda."));
    } else {
      lista.append(el("p", { class: "vazio" }, "Nenhum sistema encontrado."));
    }
  }
}

function cardSistema(s, cor) {
  const links = el("div", { class: "links" });
  (s.links || []).forEach((l, j) => {
    if (!urlValida(l.url)) return;
    const a = el("a", { class: "btn" + (j > 0 ? " sec" : ""), href: l.url, target: "_blank", rel: "noopener" }, l.rotulo || "Acessar");
    a.insertAdjacentHTML("beforeend", ICONE);
    links.append(a);
  });
  return el("article", { class: "sis", style: cor },
    admin ? el("button", { class: "btn sec peq editar", onclick: () => abrirEditor(s) }, "Editar") : null,
    el("h3", {}, s.nome),
    s.descricao ? el("p", {}, s.descricao) : null,
    links
  );
}

/* ---------- modais ---------- */
function fecharModal() { $("modal").innerHTML = ""; }
function abrirModal(titulo, corpo) {
  const fundo = el("div", { class: "modal-fundo", onclick: e => { if (e.target === fundo) fecharModal(); } },
    el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": titulo }, el("h2", {}, titulo), corpo));
  $("modal").replaceChildren(fundo);
  fundo.querySelector("input")?.focus();
}
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharModal(); });

function abrirLogin() {
  const email = el("input", { type: "email", id: "l-email", autocomplete: "username", required: true });
  const senha = el("input", { type: "password", id: "l-senha", autocomplete: "current-password", required: true });
  const erro = el("div", { class: "erro" });
  const entrar = el("button", { class: "btn", type: "submit" }, "Entrar");

  const form = el("form", {
    onsubmit: async e => {
      e.preventDefault();
      erro.textContent = ""; entrar.disabled = true;
      try {
        await signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
        fecharModal();
      } catch (err) { erro.textContent = traduzErro(err); }
      entrar.disabled = false;
    }
  },
    el("div", { class: "campo" }, el("label", { for: "l-email" }, "E-mail"), email),
    el("div", { class: "campo" }, el("label", { for: "l-senha" }, "Senha"), senha),
    erro,
    el("button", { class: "esqueci", type: "button", onclick: async () => {
      if (!email.value.trim()) { erro.textContent = "Digite seu e-mail acima primeiro."; return; }
      try { await sendPasswordResetEmail(auth, email.value.trim()); toast("Enviamos um link de redefinição para o seu e-mail."); }
      catch (err) { erro.textContent = traduzErro(err); }
    } }, "Esqueci a senha"),
    el("div", { class: "acoes" },
      el("button", { class: "btn sec", type: "button", onclick: fecharModal }, "Cancelar"),
      entrar)
  );
  abrirModal("Acesso do administrador", form);
}

function linhaLink(l = { rotulo: "", url: "" }) {
  const linha = el("div", { class: "link-linha" },
    el("input", { type: "text", class: "rot", placeholder: "Rótulo (ex.: Produção)", value: l.rotulo || "", "aria-label": "Rótulo do botão" }),
    el("input", { type: "url", class: "url", placeholder: "https://…", value: l.url || "", "aria-label": "Endereço" }),
  );
  linha.append(el("button", { class: "btn perigo", type: "button", title: "Remover site", "aria-label": "Remover site",
    onclick: () => { if (linha.parentElement.children.length > 1) linha.remove(); else toast("O sistema precisa de pelo menos um site.", true); } }, "✕"));
  return linha;
}

function abrirEditor(s = null) {
  const cats = [...new Set(sistemas.map(x => x.categoria).filter(Boolean))].sort();
  const nome = el("input", { type: "text", id: "e-nome", value: s?.nome || "", required: true });
  const categoria = el("input", { type: "text", id: "e-cat", list: "e-cats", value: s?.categoria || "", placeholder: "Ex.: Gestão" });
  const ordem = el("input", { type: "number", id: "e-ordem", value: s?.ordem ?? "", placeholder: "Opcional" });
  const descricao = el("textarea", { id: "e-desc" });
  descricao.value = s?.descricao || "";
  const linhas = el("div", {}, (s?.links?.length ? s.links : [{ rotulo: "Acessar", url: "" }]).map(linhaLink));
  const erro = el("div", { class: "erro" });
  const salvar = el("button", { class: "btn", type: "submit" }, "Salvar");

  const form = el("form", {
    onsubmit: async e => {
      e.preventDefault();
      erro.textContent = "";
      const links = [...linhas.children].map(li => ({
        rotulo: li.querySelector(".rot").value.trim() || "Acessar",
        url: li.querySelector(".url").value.trim()
      })).filter(l => l.url);
      if (!nome.value.trim()) { erro.textContent = "Informe o nome do sistema."; return; }
      if (!links.length) { erro.textContent = "Informe pelo menos um endereço."; return; }
      const invalido = links.find(l => !urlValida(l.url));
      if (invalido) { erro.textContent = `Endereço inválido: ${invalido.url} (deve começar com https://)`; return; }

      const dados = {
        nome: nome.value.trim(),
        categoria: categoria.value.trim() || "Geral",
        descricao: descricao.value.trim(),
        ordem: ordem.value === "" ? null : Number(ordem.value),
        links,
        atualizadoEm: serverTimestamp()
      };
      salvar.disabled = true;
      try {
        if (s) await updateDoc(doc(db, "sistemas", s.id), dados);
        else await addDoc(colSistemas, dados);
        fecharModal();
        toast(s ? "Sistema atualizado." : "Sistema cadastrado.");
      } catch (err) { erro.textContent = traduzErro(err); salvar.disabled = false; }
    }
  },
    el("div", { class: "campo" }, el("label", { for: "e-nome" }, "Nome do sistema"), nome),
    el("div", { class: "campos2 campo" },
      el("div", {}, el("label", { for: "e-cat" }, "Categoria"), categoria,
        el("datalist", { id: "e-cats" }, cats.map(c => el("option", { value: c })))),
      el("div", {}, el("label", { for: "e-ordem" }, "Ordem"), ordem)),
    el("div", { class: "campo" }, el("label", { for: "e-desc" }, "Descrição"), descricao),
    el("div", { class: "campo" },
      el("div", { class: "link-tit" },
        el("label", {}, "Sites"),
        el("button", { class: "btn sec peq", type: "button", onclick: () => linhas.append(linhaLink()) }, "+ Adicionar site")),
      linhas),
    erro,
    el("div", { class: "acoes" },
      s ? el("button", { class: "btn perigo esq", type: "button", onclick: async () => {
        if (!confirm(`Excluir "${s.nome}"? Esta ação não pode ser desfeita.`)) return;
        try { await deleteDoc(doc(db, "sistemas", s.id)); fecharModal(); toast("Sistema excluído."); }
        catch (err) { erro.textContent = traduzErro(err); }
      } }, "Excluir") : null,
      el("button", { class: "btn sec", type: "button", onclick: fecharModal }, "Cancelar"),
      salvar)
  );
  abrirModal(s ? "Editar sistema" : "Novo sistema", form);
}

/* ---------- dados e login em tempo real ---------- */
onSnapshot(colSistemas, snap => {
  sistemas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderLista();
}, err => {
  console.error(err);
  $("lista").replaceChildren(el("p", { class: "vazio" }, "Não foi possível carregar os sistemas. " + traduzErro(err)));
});

onAuthStateChanged(auth, async u => {
  usuario = u;
  admin = false;
  if (u) {
    try { admin = (await getDoc(doc(db, "admins", u.uid))).exists(); }
    catch { admin = false; }
  }
  renderConta();
  renderLista();
});

$("busca").addEventListener("input", e => { filtro = e.target.value; renderLista(); });
renderConta();
