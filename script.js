// ================= CONFIGURAÇÃO INICIAL =================
const DADOS_INICIAIS = [
    { nome: "Caixa de Leite", preco: 5.50, qtd: 20, codigo: "LEITE123" },
    { nome: "Kit Fósforos", preco: 3.00, qtd: 50, codigo: "FOS456" },
    { nome: "Molho Especial", preco: 1.20, qtd: 100, codigo: "MOL789" },
    { nome: "Bala Gourmet", preco: 0.50, qtd: 200, codigo: "BAL321" }
];

function inicializar() {
    if (!localStorage.getItem("estoque")) localStorage.setItem("estoque", JSON.stringify(DADOS_INICIAIS));
    if (!localStorage.getItem("pedidos")) localStorage.setItem("pedidos", "[]");
    if (!localStorage.getItem("devolucoes")) localStorage.setItem("devolucoes", "[]");
    vitrine();
}

let carrinho = [];

// ================= NAVEGAÇÃO =================
function mostrarAba(id, btn) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(id).classList.add('active');
    btn.classList.add('active');

    if (id === "consumidor") vitrine();
    if (id === "empresa") dashboard();
}

// ================= LÓGICA DO CONSUMIDOR =================
function vitrine() {
    const v = document.getElementById("vitrine");
    const estoque = JSON.parse(localStorage.getItem("estoque"));
    v.innerHTML = estoque.map(p => `
        <div class="produto">
            <strong>${p.nome}</strong>
            <div class="preco">R$ ${p.preco.toFixed(2)}</div>
            <div class="qtd-estoque">Disp: ${p.qtd} un</div>
            <button onclick="addCarrinho('${p.codigo}')" ${p.qtd <= 0 ? 'disabled' : ''}>
                ${p.qtd <= 0 ? 'Esgotado' : 'Adicionar'}
            </button>
        </div>
    `).join('');
}

function addCarrinho(cod) {
    const estoque = JSON.parse(localStorage.getItem("estoque"));
    const produto = estoque.find(p => p.codigo === cod);

    if (produto.qtd > 0) {
        carrinho.push({...produto});
        atualizarCarrinho();
    }
}

function atualizarCarrinho() {
    const c = document.getElementById("carrinho");
    c.innerHTML = carrinho.map((i, index) => `
        <li>
            <span>📦 ${i.nome}</span>
            <strong>R$ ${i.preco.toFixed(2)}</strong>
        </li>
    `).join('');
}

function checkout() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    let estoque = JSON.parse(localStorage.getItem("estoque"));
    let pedidos = JSON.parse(localStorage.getItem("pedidos"));
    const codPedido = "PED-" + Math.floor(Date.now() / 1000);

    // Abater estoque real
    carrinho.forEach(itemNoCarrinho => {
        const index = estoque.findIndex(p => p.codigo === itemNoCarrinho.codigo);
        if (estoque[index].qtd > 0) estoque[index].qtd--;
    });

    pedidos.push({
        codigo: codPedido,
        itens: carrinho.length,
        status: "Em Separação",
        local: "CD Santana de Parnaíba - SP"
    });

    localStorage.setItem("estoque", JSON.stringify(estoque));
    localStorage.setItem("pedidos", JSON.stringify(pedidos));

    carrinho = [];
    atualizarCarrinho();
    vitrine();
    document.getElementById("msgCompra").innerHTML = `✅ Sucesso! ID: <strong>${codPedido}</strong>`;
}

function rastrear() {
    const cod = document.getElementById("codigoRastreio").value.trim();
    const p = JSON.parse(localStorage.getItem("pedidos")).find(p => p.codigo === cod);
    const res = document.getElementById("resultadoRastreio");

    if (p) {
        res.innerHTML = `<strong>Status:</strong> ${p.status} <br> <strong>Local:</strong> ${p.local}`;
        res.style.display = "block";
    } else {
        res.innerHTML = "❌ Pedido não localizado.";
    }
}

// ================= LÓGICA DA EMPRESA =================
function dashboard() {
    const pedidos = JSON.parse(localStorage.getItem("pedidos"));
    const estoque = JSON.parse(localStorage.getItem("estoque"));

    document.getElementById("totalPedidos").textContent = pedidos.length;
    document.getElementById("totalEstoque").textContent = estoque.reduce((a, b) => a + b.qtd, 0);

    const corpoTabela = document.getElementById("listaPedidosCorpo");
    corpoTabela.innerHTML = pedidos.map(p => `
        <tr>
            <td>${p.codigo}</td>
            <td>${p.itens} produtos</td>
            <td><span class="badge">${p.status}</span></td>
            <td>${p.local}</td>
        </tr>
    `).join('');
}

inicializar();
