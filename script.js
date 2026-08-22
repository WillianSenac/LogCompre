// ================= DADOS INICIAIS =================
const PRODUTOS_INICIAIS = [
    { id: "COCA-001", nome: "Coca-Cola", preco: 6.00, estoque: 2, emoji: "🥤" },
    { id: "MOST-001", nome: "Sachê de Mostarda", preco: 1.50, estoque: 26, emoji: "🌭" },
    { id: "KETC-001", nome: "Sachê de Ketchup", preco: 1.50, estoque: 5, emoji: "🍅" }
];

const STATUS_FLOW = [
    "Pedido realizado",
    "Pagamento aprovado",
    "Separando pedido",
    "Pedido embalado",
    "Enviado",
    "Em trânsito",
    "Entregue"
];
const STATUS_FINAIS = ["Entregue", "Cancelado", "Devolvido", "Reembolsado"];
const LOCAIS = ["Centro de Distribuição — São Paulo", "Hub Logístico — Santana de Parnaíba", "Rota de Entrega — Zona Oeste"];

let carrinho = [];   // { id, nome, preco, qtd }
let scannerAtivo = null;

// ================= PERSISTÊNCIA =================
function getProdutos() { return JSON.parse(localStorage.getItem("logcompre_produtos")) || PRODUTOS_INICIAIS; }
function setProdutos(p) { localStorage.setItem("logcompre_produtos", JSON.stringify(p)); }
function getPedidos() { return JSON.parse(localStorage.getItem("logcompre_pedidos")) || []; }
function setPedidos(p) { localStorage.setItem("logcompre_pedidos", JSON.stringify(p)); }

function inicializar() {
    if (!localStorage.getItem("logcompre_produtos")) setProdutos(PRODUTOS_INICIAIS);
    if (!localStorage.getItem("logcompre_pedidos")) setPedidos([]);
    renderVitrine();
    renderMeusPedidos();
}

// ================= UTIL =================
function formatarMoeda(v) { return "R$ " + v.toFixed(2).replace(".", ","); }
function gerarPedidoId() { return `PED-${Date.now().toString().slice(-6)}`; }
function mostrarToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2600);
}
function abrirModal(id) { document.getElementById(id).classList.add("open"); }
function fecharModal(id) { document.getElementById(id).classList.remove("open"); }
function badgeClasse(status) {
    if (status === "Entregue") return "badge-success";
    if (["Cancelado", "Devolvido"].includes(status)) return "badge-danger";
    if (status === "Reembolsado") return "badge-muted";
    if (status === "Pedido realizado") return "badge-warning";
    return "badge-info";
}
function gerarBarcodeSVG(codigo) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
        JsBarcode(svg, codigo, { format: "CODE128", width: 2, height: 60, displayValue: true, margin: 6 });
    } catch (e) { /* biblioteca indisponível offline */ }
    return svg.outerHTML;
}

// ================= NAVEGAÇÃO =================
function mostrarAba(id, btn) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');

    if (id === "consumidor") { renderVitrine(); renderMeusPedidos(); }
    if (id === "empresa") { renderDashboard(); renderTabelaPedidos(); renderTabelaEstoque(); renderDevolucoes(); }
}

// ================= VITRINE / CARRINHO =================
function renderVitrine() {
    const produtos = getProdutos();
    document.getElementById("vitrine").innerHTML = produtos.map(p => `
        <div class="produto">
            <div class="emoji">${p.emoji}</div>
            <strong>${p.nome}</strong>
            <div class="preco">${formatarMoeda(p.preco)}</div>
            <div class="qtd-estoque">Disp: ${p.estoque} un</div>
            <div class="stepper">
                <button ${p.estoque <= 0 ? "disabled" : ""} onclick="ajustarQtdTemp('${p.id}', -1)">-</button>
                <span id="qtdTemp-${p.id}">1</span>
                <button ${p.estoque <= 0 ? "disabled" : ""} onclick="ajustarQtdTemp('${p.id}', 1)">+</button>
            </div>
            <button class="btn-acao" style="width:100%" ${p.estoque <= 0 ? "disabled" : ""} onclick="addCarrinho('${p.id}')">
                ${p.estoque <= 0 ? "Esgotado" : "Adicionar ao carrinho"}
            </button>
        </div>
    `).join('');
}

function ajustarQtdTemp(id, delta) {
    const el = document.getElementById(`qtdTemp-${id}`);
    const produto = getProdutos().find(p => p.id === id);
    let novo = parseInt(el.textContent) + delta;
    novo = Math.max(1, Math.min(novo, produto.estoque));
    el.textContent = novo;
}

function addCarrinho(id) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    const qtdDesejada = parseInt(document.getElementById(`qtdTemp-${id}`).textContent);

    const jaNoCarrinho = carrinho.find(i => i.id === id);
    const qtdAtualCarrinho = jaNoCarrinho ? jaNoCarrinho.qtd : 0;

    if (qtdAtualCarrinho + qtdDesejada > produto.estoque) {
        mostrarToast(`Apenas ${produto.estoque} unidades disponíveis de ${produto.nome}.`);
        return;
    }

    if (jaNoCarrinho) jaNoCarrinho.qtd += qtdDesejada;
    else carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, qtd: qtdDesejada });

    renderCarrinho();
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
}

function alterarQtdCarrinho(id, delta) {
    const item = carrinho.find(i => i.id === id);
    const produto = getProdutos().find(p => p.id === id);
    if (!item) return;
    const nova = item.qtd + delta;
    if (nova <= 0) { carrinho = carrinho.filter(i => i.id !== id); }
    else if (nova > produto.estoque) { mostrarToast("Estoque insuficiente."); return; }
    else { item.qtd = nova; }
    renderCarrinho();
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    renderCarrinho();
}

function renderCarrinho() {
    const c = document.getElementById("carrinho");
    const btn = document.getElementById("btnFinalizar");

    if (carrinho.length === 0) {
        c.innerHTML = `<li class="vazio">Seu carrinho está vazio.</li>`;
        btn.disabled = true;
    } else {
        c.innerHTML = carrinho.map(i => `
            <li>
                <span class="item-info">📦 ${i.nome} — ${i.qtd}x ${formatarMoeda(i.preco)}</span>
                <span>
                    <button class="btn-outline" onclick="alterarQtdCarrinho('${i.id}', -1)">-</button>
                    <button class="btn-outline" onclick="alterarQtdCarrinho('${i.id}', 1)">+</button>
                    <button class="remover" onclick="removerDoCarrinho('${i.id}')">&times;</button>
                </span>
            </li>
        `).join('');
        btn.disabled = false;
    }

    const total = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0);
    document.getElementById("cartTotal").textContent = formatarMoeda(total);
}

// ================= CHECKOUT / PAGAMENTO FICTÍCIO =================
function abrirCheckout() {
    if (carrinho.length === 0) return;
    const resumo = document.getElementById("checkoutResumo");
    resumo.innerHTML = carrinho.map(i => `
        <div class="linha"><span>${i.qtd}x ${i.nome}</span><span>${formatarMoeda(i.preco * i.qtd)}</span></div>
    `).join('');
    const total = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0);
    document.getElementById("checkoutSubtotal").textContent = formatarMoeda(total);
    document.getElementById("checkoutStatus").textContent = "";
    document.getElementById("btnConfirmarPagamento").disabled = false;
    abrirModal("modalCheckout");
}

function confirmarPagamento() {
    const btn = document.getElementById("btnConfirmarPagamento");
    const statusEl = document.getElementById("checkoutStatus");
    const metodo = document.querySelector('input[name="pagamento"]:checked').value;

    btn.disabled = true;
    statusEl.textContent = "⏳ Processando pagamento...";

    setTimeout(() => {
        const pedidoId = gerarPedidoId();
        const total = carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0);
        const agora = new Date().toLocaleString("pt-BR");

        const novoPedido = {
            id: pedidoId,
            cliente: "Cliente Demo",
            produtos: carrinho.map(i => ({ id: i.id, nome: i.nome, quantidade: i.qtd, preco: i.preco })),
            total,
            pagamento: { metodo, status: "aprovado" },
            status: "Pagamento aprovado",
            baixaDada: false,
            localizacao: LOCAIS[0],
            codigoBarras: pedidoId,
            historico: [
                { status: "Pedido realizado", data: agora },
                { status: "Pagamento aprovado", data: agora }
            ],
            devolucao: null
        };

        const pedidos = getPedidos();
        pedidos.push(novoPedido);
        setPedidos(pedidos);

        carrinho = [];
        renderCarrinho();
        renderVitrine();
        renderMeusPedidos();

        statusEl.innerHTML = `✓ Pagamento aprovado<br>Pedido: <strong>${pedidoId}</strong>`;
        setTimeout(() => { fecharModal("modalCheckout"); abrirPedidoDetalhe(pedidoId); }, 1200);
    }, 1400);
}

// ================= MEUS PEDIDOS / DETALHE =================
function renderMeusPedidos() {
    const pedidos = getPedidos();
    const el = document.getElementById("meusPedidos");
    if (pedidos.length === 0) { el.innerHTML = `<p class="vazio">Você ainda não fez nenhum pedido.</p>`; return; }

    el.innerHTML = pedidos.slice().reverse().map(p => `
        <div class="pedido-card">
            <div class="pedido-card-header">
                <span class="pedido-codigo">${p.id}</span>
                <span class="badge ${badgeClasse(p.status)}">${p.status}</span>
            </div>
            <div class="pedido-itens">${p.produtos.map(i => `${i.quantidade}x ${i.nome}`).join(", ")}</div>
            <div class="pedido-total">${formatarMoeda(p.total)}</div>
            <button class="btn-acao" style="margin-top:10px" onclick="abrirPedidoDetalhe('${p.id}')">Ver pedido</button>
        </div>
    `).join('');
}

function abrirPedidoDetalhe(pedidoId) {
    const pedido = getPedidos().find(p => p.id === pedidoId);
    if (!pedido) return;

    const idxAtual = STATUS_FLOW.indexOf(pedido.status);
    const timelineHtml = STATUS_FLOW.map((s, i) => {
        let classe = "";
        if (STATUS_FINAIS.includes(pedido.status) && pedido.status !== "Entregue") classe = "";
        else if (i < idxAtual) classe = "done";
        else if (i === idxAtual) classe = "current";
        return `<li class="${classe}"><span class="dot"></span>${s}</li>`;
    }).join('');

    let devolucaoHtml = "";
    if (pedido.status === "Entregue" && !pedido.devolucao) {
        devolucaoHtml = `<button class="btn-acao" style="margin-top:1rem;width:100%" onclick="abrirDevolucao('${pedido.id}')">Solicitar devolução</button>`;
    } else if (pedido.devolucao) {
        devolucaoHtml = `<div class="status-card" style="margin-top:1rem">🔄 Logística reversa: <strong>${pedido.devolucao.status}</strong><br>Motivo: ${pedido.devolucao.motivo}</div>`;
    }

    document.getElementById("pedidoDetalheConteudo").innerHTML = `
        <h2>${pedido.id}</h2>
        <span class="badge ${badgeClasse(pedido.status)}">${pedido.status}</span>
        <label>Produtos</label>
        ${pedido.produtos.map(i => `<div class="linha">${i.quantidade}x ${i.nome} — ${formatarMoeda(i.preco * i.quantidade)}</div>`).join('')}
        <label>Total</label>
        <strong>${formatarMoeda(pedido.total)}</strong>
        <label>Pagamento</label>
        <span>${pedido.pagamento.metodo} — ${pedido.pagamento.status}</span>
        <label>Localização atual</label>
        <span>📍 ${pedido.localizacao}</span>
        <label>Previsão de entrega</label>
        <span>2 a 4 dias úteis (fictício)</span>
        <label>Status</label>
        <ul class="timeline">${timelineHtml}</ul>
        <div class="barcode-box">${gerarBarcodeSVG(pedido.codigoBarras)}<div class="barcode-caption">Apresente este código para rastrear ou processar seu pedido.</div></div>
        ${devolucaoHtml}
    `;
    abrirModal("modalPedido");
}

// ================= RASTREIO =================
function rastrear() {
    const cod = document.getElementById("codigoRastreio").value.trim().toUpperCase();
    const pedido = getPedidos().find(p => p.id === cod);
    const res = document.getElementById("resultadoRastreio");
    res.style.display = "block";

    if (!pedido) { res.innerHTML = "❌ Pedido não localizado."; return; }

    const idxAtual = STATUS_FLOW.indexOf(pedido.status);
    const timelineHtml = STATUS_FLOW.map((s, i) => {
        let classe = i < idxAtual ? "done" : (i === idxAtual ? "current" : "");
        return `<li class="${classe}"><span class="dot"></span>${s}</li>`;
    }).join('');

    res.innerHTML = `
        <strong>${pedido.id}</strong> — <span class="badge ${badgeClasse(pedido.status)}">${pedido.status}</span>
        <p style="margin-top:8px">📍 ${pedido.localizacao}</p>
        <ul class="timeline">${timelineHtml}</ul>
    `;
}

// ================= LOGÍSTICA REVERSA (CLIENTE) =================
function abrirDevolucao(pedidoId) {
    document.getElementById("devolucaoPedidoId").value = pedidoId;
    abrirModal("modalDevolucao");
}

function confirmarDevolucao() {
    const pedidoId = document.getElementById("devolucaoPedidoId").value;
    const motivo = document.getElementById("motivoDevolucao").value;
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    pedido.devolucao = { motivo, status: "Aguardando coleta" };
    setPedidos(pedidos);
    fecharModal("modalDevolucao");
    fecharModal("modalPedido");
    renderMeusPedidos();
    mostrarToast("Solicitação de devolução enviada.");
}

// ================= ADMIN: DASHBOARD =================
function renderDashboard() {
    const pedidos = getPedidos();
    const produtos = getProdutos();
    const cards = [
        { label: "Pedidos", valor: pedidos.length },
        { label: "Produtos em estoque", valor: produtos.reduce((a, b) => a + b.estoque, 0) },
        { label: "Em trânsito", valor: pedidos.filter(p => p.status === "Em trânsito").length },
        { label: "Entregues", valor: pedidos.filter(p => p.status === "Entregue").length },
        { label: "Devoluções", valor: pedidos.filter(p => p.devolucao).length },
        { label: "Faturamento fictício", valor: formatarMoeda(pedidos.reduce((a, p) => a + p.total, 0)) }
    ];
    document.getElementById("dashboardCards").innerHTML = cards.map(c => `
        <div class="card"><p>${c.label}</p><span>${c.valor}</span></div>
    `).join('');
}

// ================= ADMIN: PEDIDOS =================
function renderTabelaPedidos() {
    const pedidos = getPedidos();
    const corpo = document.getElementById("listaPedidosCorpo");
    if (pedidos.length === 0) { corpo.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum pedido ainda.</td></tr>`; return; }

    corpo.innerHTML = pedidos.slice().reverse().map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.produtos.map(i => `${i.quantidade}x ${i.nome}`).join(", ")}</td>
            <td>${formatarMoeda(p.total)}</td>
            <td><span class="badge ${badgeClasse(p.status)}">${p.status}</span></td>
            <td>${p.localizacao}</td>
            <td class="acoes">${acoesPedidoHtml(p)}</td>
        </tr>
    `).join('');
}

function acoesPedidoHtml(p) {
    let botoes = `<button class="btn-outline" onclick="abrirPedidoDetalhe('${p.id}')">Ver</button>`;
    if (!p.baixaDada && !STATUS_FINAIS.includes(p.status)) {
        botoes += `<button class="btn-primario" onclick="darBaixa('${p.id}')">Dar baixa</button>`;
        botoes += `<button class="btn-perigo" onclick="negarPedido('${p.id}')">Negar</button>`;
    }
    if (p.baixaDada && !STATUS_FINAIS.includes(p.status)) {
        botoes += `<button class="btn-primario" onclick="avancarStatus('${p.id}')">Atualizar status</button>`;
        botoes += `<button class="btn-aviso" onclick="reverterStatus('${p.id}')">Reverter</button>`;
    }
    return botoes;
}

function encontrarPedido(pedidoId) { return getPedidos().find(p => p.id === pedidoId); }

function darBaixa(pedidoId) {
    const pedidos = getPedidos();
    const produtos = getProdutos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido || pedido.baixaDada) return;

    for (const item of pedido.produtos) {
        const produto = produtos.find(pr => pr.id === item.id);
        if (!produto || produto.estoque < item.quantidade) {
            mostrarToast(`Estoque insuficiente para ${item.nome}.`);
            return;
        }
    }

    pedido.produtos.forEach(item => {
        const produto = produtos.find(pr => pr.id === item.id);
        produto.estoque -= item.quantidade;
    });

    pedido.baixaDada = true;
    pedido.status = "Separando pedido";
    pedido.localizacao = LOCAIS[0];
    pedido.historico.push({ status: "Separando pedido", data: new Date().toLocaleString("pt-BR") });

    setProdutos(produtos);
    setPedidos(pedidos);
    renderTabelaPedidos(); renderTabelaEstoque(); renderDashboard();
    mostrarToast(`✓ Pedido processado. Estoque atualizado.`);
}

function avancarStatus(pedidoId) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    const idx = STATUS_FLOW.indexOf(pedido.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;

    pedido.status = STATUS_FLOW[idx + 1];
    pedido.localizacao = LOCAIS[Math.min(idx, LOCAIS.length - 1)];
    pedido.historico.push({ status: pedido.status, data: new Date().toLocaleString("pt-BR") });

    setPedidos(pedidos);
    renderTabelaPedidos(); renderDashboard(); renderMeusPedidos();
    mostrarToast(`Status atualizado para "${pedido.status}".`);
}

function reverterStatus(pedidoId) {
    const pedidos = getPedidos();
    const produtos = getProdutos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    const idx = STATUS_FLOW.indexOf(pedido.status);
    if (idx <= 1) return;

    if (STATUS_FLOW[idx - 1] === "Pagamento aprovado" && pedido.baixaDada) {
        pedido.produtos.forEach(item => {
            const produto = produtos.find(pr => pr.id === item.id);
            if (produto) produto.estoque += item.quantidade;
        });
        pedido.baixaDada = false;
        setProdutos(produtos);
    }

    pedido.status = STATUS_FLOW[idx - 1];
    pedido.historico.push({ status: `Revertido para ${pedido.status}`, data: new Date().toLocaleString("pt-BR") });
    setPedidos(pedidos);
    renderTabelaPedidos(); renderTabelaEstoque(); renderDashboard();
    mostrarToast("Status revertido.");
}

function negarPedido(pedidoId) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    pedido.status = "Cancelado";
    pedido.historico.push({ status: "Cancelado", data: new Date().toLocaleString("pt-BR") });
    setPedidos(pedidos);
    renderTabelaPedidos(); renderDashboard(); renderMeusPedidos();
    mostrarToast("Pedido negado.");
}

// ================= ADMIN: ESTOQUE =================
function renderTabelaEstoque() {
    const produtos = getProdutos();
    document.getElementById("listaEstoqueCorpo").innerHTML = produtos.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.estoque} un</td>
            <td>${p.estoque <= 0 ? '<span class="badge badge-danger">⚠ Esgotado</span>' : '<span class="badge badge-success">Disponível</span>'}</td>
        </tr>
    `).join('');
}

// ================= ADMIN: LEITOR DE CÓDIGO DE BARRAS =================
function normalizarCodigo(raw) {
    return raw.trim().toUpperCase().replace(/^LOG-/, "");
}

function consultarManual() {
    const raw = document.getElementById("codigoManual").value;
    if (!raw) return;
    consultarPedidoPorCodigo(raw);
}

function consultarPedidoPorCodigo(raw) {
    const codigo = normalizarCodigo(raw);
    const pedido = encontrarPedido(codigo);
    const painel = document.getElementById("resultadoScanner");

    if (!pedido) {
        painel.innerHTML = `<div class="status-card">❌ Nenhum pedido encontrado para "${codigo}".</div>`;
        return;
    }

    painel.innerHTML = `
        <div class="status-card">
            <strong>${pedido.id}</strong> — <span class="badge ${badgeClasse(pedido.status)}">${pedido.status}</span>
            <p style="margin:8px 0">Cliente: ${pedido.cliente}</p>
            <p>${pedido.produtos.map(i => `${i.quantidade}x ${i.nome}`).join(", ")}</p>
            <p>📍 ${pedido.localizacao}</p>
            <div class="acoes" style="margin-top:10px">${acoesPedidoHtml(pedido)}</div>
        </div>
    `;
}

function alternarCamera() {
    const btn = document.getElementById("btnAbrirCamera");
    if (scannerAtivo) {
        scannerAtivo.stop().then(() => { scannerAtivo = null; document.getElementById("leitorCamera").innerHTML = ""; btn.textContent = "Abrir câmera"; });
        return;
    }
    if (typeof Html5Qrcode === "undefined") {
        mostrarToast("Câmera indisponível. Use o campo manual abaixo.");
        return;
    }
    document.getElementById("leitorCamera").innerHTML = `<div id="qr-reader" style="width:100%"></div>`;
    scannerAtivo = new Html5Qrcode("qr-reader");
    scannerAtivo.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 200 },
        (decodedText) => {
            consultarPedidoPorCodigo(decodedText);
            mostrarToast("Código lido com sucesso.");
        },
        () => {}
    ).then(() => { btn.innerHTML = '<span class="material-symbols-outlined">stop_circle</span> Fechar câmera'; })
     .catch(() => { mostrarToast("Não foi possível acessar a câmera. Use o campo manual."); });
}

// ================= ADMIN: LOGÍSTICA REVERSA =================
function renderDevolucoes() {
    const pedidos = getPedidos().filter(p => p.devolucao);
    const el = document.getElementById("listaDevolucoes");
    if (pedidos.length === 0) { el.innerHTML = `<p class="vazio">Nenhuma devolução em andamento.</p>`; return; }

    el.innerHTML = pedidos.map(p => `
        <div class="devolucao-card">
            <strong>${p.id}</strong> — ${p.produtos.map(i => i.nome).join(", ")}<br>
            Motivo: ${p.devolucao.motivo}<br>
            Status: <span class="badge badge-info">${p.devolucao.status}</span>
            <div class="acoes">
                <button class="btn-primario" onclick="atualizarDevolucao('${p.id}', 'Coleta agendada')">Aceitar</button>
                <button class="btn-perigo" onclick="atualizarDevolucao('${p.id}', 'Negada')">Negar</button>
                <button class="btn-aviso" onclick="atualizarDevolucao('${p.id}', 'Recebido')">Recebido</button>
                <button class="btn-outline" onclick="reembolsarDevolucao('${p.id}')">Reembolsar</button>
            </div>
        </div>
    `).join('');
}

function atualizarDevolucao(pedidoId, novoStatus) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.devolucao) return;
    pedido.devolucao.status = novoStatus;
    if (novoStatus === "Recebido") pedido.status = "Devolvido";
    setPedidos(pedidos);
    renderDevolucoes(); renderTabelaPedidos(); renderDashboard(); renderMeusPedidos();
    mostrarToast(`Devolução: ${novoStatus}.`);
}

function reembolsarDevolucao(pedidoId) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.devolucao) return;
    pedido.devolucao.status = "Reembolsado";
    pedido.status = "Reembolsado";
    setPedidos(pedidos);
    renderDevolucoes(); renderTabelaPedidos(); renderDashboard(); renderMeusPedidos();
    mostrarToast("Reembolso registrado.");
}

// ================= START =================
inicializar();
