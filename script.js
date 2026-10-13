const CYCLE_TIME = 7 * 60;
if (localStorage.getItem('ef_quizzes') && localStorage.getItem('ef_quizzes').includes('undefined')) localStorage.clear();

let appState = {
    xp: parseInt(localStorage.getItem('ef_xp')) || 0,
    tasks: JSON.parse(localStorage.getItem('ef_tasks')) || [],
    quizzes: JSON.parse(localStorage.getItem('ef_quizzes')) || [],
    tLeft: CYCLE_TIME, qLeft: CYCLE_TIME, file: null,
    forum: JSON.parse(localStorage.getItem('ef_forum')) || [{ id: 1, user: "Lucas", text: "Fórmula de juros?", reply: null }]
};

const names = ["Carlos", "Mariana", "Julia", "Pedro", "Luiz", "Ana"];
const products = ["tênis", "celular", "relógio", "casaco", "mochila", "fone"];

function generateAiTaskData() {
    const type = Math.floor(Math.random() * 3), cap = (Math.floor(Math.random() * 8) + 2) * 100, taxa = (Math.floor(Math.random() * 3) + 1) * 5, tempo = Math.floor(Math.random() * 3) + 2;
    let txt = "", ans = "", form = "";
    if (type === 0) {
        txt = `Calcule juros simples de R\$${cap} a ${taxa}% ao mês por ${tempo} meses. (Dica: J = C * i * t)`;
        ans = (cap * (taxa / 100) * tempo).toString(); form = `${cap} * ${taxa/100} * ${tempo} = ${ans}`;
    } else if (type === 1) {
        const desc = (Math.floor(Math.random() * 3) + 1) * 5, p = products[Math.floor(Math.random() * products.length)];
        txt = `Um ${p} de R\$${cap} teve desconto de ${desc}% à vista. Qual o valor final? (Dica: M = C - Desconto)`;
        const valueDesc = cap * (desc / 100); ans = (cap - valueDesc).toString(); form = `Desconto: ${cap} * ${desc/100} = ${valueDesc}. Final: ${cap} - ${valueDesc} = ${ans}`;
    } else {
        const multa = (Math.floor(Math.random() * 4) + 2); txt = `Uma conta de R\$${cap} teve cobrança de juros por atraso de ${multa}%. Qual a multa cobrada?`;
        ans = (cap * (multa / 100)).toString(); form = `${cap} * ${multa/100} = ${ans}`;
    }
    return { text: txt, answer: ans, formula: form };
}

function generateAiQuizData() {
    const type = Math.floor(Math.random() * 2), name = names[Math.floor(Math.random() * names.length)], val = (Math.floor(Math.random() * 4) + 1) * 10;
    if (type === 0) {
        const correct = val * 4, optsShuffled = [correct, correct - 10, correct + 20].sort(() => Math.random() - 0.5);
        return { q: `${name} poupou R\$${val} por semana. Quanto terá após 4 semanas?`, opts: optsShuffled.map(o => `R\$${o}`), c: optsShuffled.indexOf(correct) };
    } else {
        return { q: "Se você colocar seu dinheiro em Juros Compostos, o que acontece no próximo mês?", opts: ["Rende em cima do total acumulado anterior.", "Rende apenas sobre o depósito inicial.", "Desvaloriza o dinheiro fixo."], c: 0 };
    }
}
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active")); item.classList.add("active");
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            const target = document.getElementById(item.getAttribute("data-tab")); if (target) target.classList.add("active");
        });
    });
    if (appState.tasks.length === 0) triggerAiTask();
    if (appState.quizzes.length === 0) triggerAiQuiz();
    setInterval(tick, 1000); renderQuiz(); updateUI(); updateFin(); renderForumClean();
    
    // ADIÇÃO CRÍTICA: Carrega o organizador manual ao iniciar a página
    renderManualTasks();
});


function tick() {
    if (appState.tasks.length < 15) { appState.tLeft--; if (appState.tLeft <= 0) { triggerAiTask(); appState.tLeft = CYCLE_TIME; } } else { appState.tLeft = CYCLE_TIME; }
    if (appState.quizzes.length < 15) { appState.qLeft--; if (appState.qLeft <= 0) { triggerAiQuiz(); appState.qLeft = CYCLE_TIME; } } else { appState.qLeft = CYCLE_TIME; }
    const tT = document.getElementById("timer-task-cooldown"), tQ = document.getElementById("timer-quiz-cooldown");
    if (tT) tT.textContent = fmt(appState.tLeft); if (tQ) tQ.textContent = fmt(appState.qLeft);
}
function fmt(s) { return `${Math.floor(s/60)}:${s%60 < 10 ? '0' : ''}${s%60}`; }
function saveMem() {
    localStorage.setItem('ef_xp', appState.xp); localStorage.setItem('ef_tasks', JSON.stringify(appState.tasks));
    localStorage.setItem('ef_quizzes', JSON.stringify(appState.quizzes)); localStorage.setItem('ef_forum', JSON.stringify(appState.forum));
}

function triggerAiTask() {
    if (appState.tasks.length >= 15) return;
    let t = generateAiTaskData();
    while (appState.tasks.some(userTask => userTask.text === t.text)) { t = generateAiTaskData(); }
    appState.tasks.push({ id: Date.now(), text: t.text, answer: t.answer, formula: t.formula }); saveMem(); updateUI();
}

function triggerAiQuiz() {
    if (appState.quizzes.length >= 15) return;
    let qData = generateAiQuizData();
    while (appState.quizzes.some(userQuiz => userQuiz.q === qData.q)) { qData = generateAiQuizData(); }
    appState.quizzes.push({ id: Date.now(), q: qData.q, opts: qData.opts, c: qData.c, respondido: false }); saveMem(); updateUI(); renderQuiz();
}

function renderQuiz() {
    const t = document.getElementById("quiz-title"), c = document.getElementById("quiz-options"), f = document.getElementById("quiz-feedback");
    if (!t || !c) return; c.innerHTML = ""; if (f) f.textContent = ""; 
    const active = appState.quizzes.filter(q => !q.respondido); if (active.length === 0) { t.textContent = "Aguarde novo quiz!"; return; } 
    const currentQuiz = active[0]; t.textContent = currentQuiz.q;
    if (currentQuiz && currentQuiz.opts) {
        currentQuiz.opts.forEach((opt, idx) => {
            const btn = document.createElement("button"); btn.className = "opt-button"; btn.textContent = opt;
            btn.onclick = () => {
                if (idx === currentQuiz.c) {
                    if (f) { f.textContent = "✓ Correto! +30 XP."; f.style.color = "var(--success)"; }
                    appState.xp += 30; updateUI(); currentQuiz.respondido = true;
                    appState.quizzes = appState.quizzes.filter(q => q.id !== currentQuiz.id);
                    saveMem(); setTimeout(() => { updateUI(); renderQuiz(); }, 1500);
                } else { if (f) { f.textContent = "✕ Errado."; f.style.color = "var(--danger)"; } }
            };
            c.appendChild(btn);
        });
    }
}
function updateUI() {
    const d = document.getElementById("stat-xp"); if (d) d.textContent = appState.xp + " XP";
    if (document.getElementById("badge-quiz-count")) document.getElementById("badge-quiz-count").textContent = appState.quizzes.filter(q => !q.respondido).length;
    if (document.getElementById("badge-task-count")) document.getElementById("badge-task-count").textContent = appState.tasks.length;
    const l = document.getElementById("task-list"); if (!l) return; l.innerHTML = "";
    appState.tasks.forEach(t => { const li = document.createElement("li"); li.className = "list-item"; li.innerHTML = `<span><span class="tag badge-blue" style="margin-right:10px;">IA</span> ${t.text}</span>`; l.appendChild(li); });
    const s = document.getElementById("select-analysis-task"); if (!s) return; s.innerHTML = "";
    appState.tasks.forEach(t => { const o = document.createElement("option"); o.value = t.id; o.text = t.text.substring(0, 40) + "..."; s.appendChild(o); });
}
function previewImageSafe(e) {
    const r = new FileReader(); 
    
    r.onload = () => { 
        const p = document.getElementById("image-preview"); 
        if (p) { 
            p.src = r.result; 
            p.style.display = "block"; 
            appState.file = true; 
        } 
    };
    
    // Verifica se existem arquivos e se o primeiro arquivo ([0]) é válido
    if (e.target.files && e.target.files[0]) {
        r.readAsDataURL(e.target.files[0]); // Passa o arquivo, não a lista!
    }
}

function runAiPhotoAnalysis() {
    const term = document.getElementById("terminal-ai-output"), sel = document.getElementById("select-analysis-task");
    if (!term) return; if (!appState.file) { term.textContent = "[ERRO] Envie uma imagem."; return; }
    const task = appState.tasks.find(t => t.id == sel?.value); if (!task) { term.textContent = "[ERRO] Selecione uma tarefa."; return; }
    const val = prompt(`Digite o número do resultado encontrado na folha:`); if (!val) return;
    term.textContent = "[PROCESSANDO] Analisando caderno...";
    setTimeout(() => {
        if (parseFloat(val.trim()) === parseFloat(task.answer)) {
            appState.tasks = appState.tasks.filter(t => t.id != task.id); appState.xp += 100; appState.file = null;
            const p = document.getElementById("image-preview"); if (p) p.style.display = "none";
            term.innerHTML = `[SUCESSO] Correto!\nBônus: +100 XP!`; term.style.color = "var(--success)"; saveMem(); updateUI();
        } else { term.innerHTML = `[FALHA] Errado.\n• Esperado: "${task.answer}"\n• Método: ${task.formula}`; term.style.color = "var(--danger)"; }
    }, 1500);
}
function updateFin() {
    const inc = parseFloat(document.getElementById("fin-income")?.value) || 0, pct = parseFloat(document.getElementById("fin-percent")?.value) || 0;
    const s = inc * (pct / 100); const rS = document.getElementById("res-save"), rF = document.getElementById("res-free");
    if (rS) rS.textContent = "R\$ " + s.toFixed(2); if (rF) rF.textContent = "R\$ " + (inc - s).toFixed(2);
}
const updateFinanceSafe = updateFin;

// --- SISTEMA DE FÓRUM COM SUPORTE A EXCLUSÃO DE RESPOSTAS E DESCONTO DE XP ---
function renderForumClean() {
    const box = document.getElementById("forum-clean-box"); if (!box) return; box.innerHTML = "";
    appState.forum.forEach(m => {
        const div = document.createElement("div"); div.className = "opt-button";
        div.style.cursor = "default"; div.style.display = "flex"; div.style.flexDirection = "column"; div.style.gap = "8px";
        
        let rep = "";
        if (m.reply) {
            // Adiciona o bloco de resposta com o botão de excluir integrado
            rep = `
                <div style="margin-top:4px; padding:0.5rem; background:#FFF; border-radius:6px; border-left:3px solid var(--success); font-size:0.85rem; color:var(--text-soft); text-align:left; display:flex; justify-content:space-between; align-items:center;">
                    <span><strong>Sua Resposta:</strong> "${m.reply}"</span>
                    <button class="btn-main" style="padding:0.25rem 0.5rem; font-size:0.75rem; background-color:var(--danger); border:none; margin-left:10px;" onclick="deleteForumReply(${m.id})">Apagar</button>
                </div>`;
        } else {
            rep = `<button class="btn-main" style="padding:0.4rem 0.75rem; font-size:0.85rem; background-color:var(--success); border:none; align-self:flex-end;" onclick="replyToForumTopic(${m.id})">Ajudar (+50 XP)</button>`;
        }
        
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;"><div style="display:flex; flex-direction:column; gap:4px; text-align:left;"><span class="tag badge-green" style="width:fit-content; font-size:0.7rem;">${m.user}</span><span style="color:var(--text-dark); font-weight:500;">"${m.text}"</span></div>${!m.reply ? rep : ""}</div>${m.reply ? rep : ""}`;
        box.appendChild(div);
    });
}

function replyToForumTopic(id) {
    const r = prompt("Digite sua explicação:"); if (!r || r.trim() === "") return;
    appState.forum = appState.forum.map(m => m.id === id ? { ...m, reply: r.trim() } : m);
    appState.xp += 50; // Concede o bônus de XP
    saveMem(); updateUI(); renderForumClean();
}

// NOVA FUNÇÃO: Remove o texto do painel e desconta os 50 XP do saldo global
function deleteForumReply(id) {
    if (confirm("Tem certeza que deseja apagar sua resposta? Isso removerá os 50 XP ganhos.")) {
        appState.forum = appState.forum.map(m => m.id === id ? { ...m, reply: null } : m);
        appState.xp = Math.max(0, appState.xp - 50); // Desconta impedindo que o XP fique negativo
        saveMem(); updateUI(); renderForumClean();
    }
}

function sendForumCleanMsg() {
    const input = document.getElementById("forum-clean-input"); if (!input || input.value.trim() === "") return;
    appState.forum.unshift({ id: Date.now(), user: "Você (Estudante)", text: input.value.trim(), reply: null });
    input.value = ""; saveMem(); renderForumClean();
}
// --- SISTEMA COMPLETO DO ORGANIZADOR MANUAL (SEM CORTES) ---
function renderManualTasks() {
    const box = document.getElementById("manual-task-list");
    const counter = document.getElementById("manual-task-counter");
    if (!box) return; box.innerHTML = "";

    if (!appState.manualTasks) appState.manualTasks = [];

    appState.manualTasks.forEach((t, idx) => {
        const li = document.createElement("li"); li.className = "list-item";
        li.innerHTML = `<span><i class="fa-regular fa-file-lines" style="color:#6366F1; margin-right:8px;"></i> ${t}</span>`;
        
        const btn = document.createElement("button"); btn.className = "btn-main";
        btn.style.backgroundColor = "var(--danger)"; btn.style.padding = "0.3rem 0.6rem"; btn.textContent = "Concluir";
        btn.onclick = () => {
            appState.manualTasks.splice(idx, 1);
            localStorage.setItem('ef_manual_tasks', JSON.stringify(appState.manualTasks));
            renderManualTasks();
        };
        li.appendChild(btn); box.appendChild(li);
    });

    if (counter) {
        counter.textContent = appState.manualTasks.length + (appState.manualTasks.length === 1 ? " tarefa pendente" : " tarefas pendentes");
    }
}

function addManualTaskSafe() {
    const input = document.getElementById("manual-task-input");
    if (!input || input.value.trim() === "") return;
    
    if (!appState.manualTasks) appState.manualTasks = [];
    
    appState.manualTasks.push(input.value.trim());
    input.value = "";
    localStorage.setItem('ef_manual_tasks', JSON.stringify(appState.manualTasks));
    renderManualTasks();
}
// --- FUNÇÃO ADICIONAL: LABORATÓRIO FINANCEIRO (CALCULADORA DE JUROS) ---
function calcularLabFinanceiro() {
    const c = parseFloat(document.getElementById("lab-fin-capital")?.value) || 0;
    const i = parseFloat(document.getElementById("lab-fin-taxa")?.value) || 0;
    const t = parseFloat(document.getElementById("lab-fin-tempo")?.value) || 0;
    const box = document.getElementById("lab-fin-result-box");
    if (!box) return;

    // Cálculo matemático de Juros Simples (J = C * i * t)
    const juros = c * (i / 100) * t;
    const total = c + juros;

    // Injeta os resultados formatados com padrão de moeda real brasileiro
    document.getElementById("lab-res-cap").textContent = "R$ " + c.toFixed(2).replace('.', ',');
    document.getElementById("lab-res-juros").textContent = "R$ " + juros.toFixed(2).replace('.', ',');
    document.getElementById("lab-res-total").textContent = "R$ " + total.toFixed(2).replace('.', ',');
    
    // Exibe o painel verde com o resultado do cálculo
    box.style.display = "block";
}
