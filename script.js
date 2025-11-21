// --- CONFIGURAÇÃO DO BANCO ---
let db;
const request = indexedDB.open("FinanceDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("rendas")) {
        db.createObjectStore("rendas", { keyPath: "id", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains("gastos")) {
        db.createObjectStore("gastos", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    carregarRendas();
    carregarGastos();
};

request.onerror = function () {
    alert("Erro ao abrir o banco de dados.");
};


// --- FUNÇÕES PARA RENDAS ---
function adicionarRenda() {
    const valor = Number(document.getElementById("rendaValor").value);
    const mes = document.getElementById("rendaMes").value;

    if (!valor || !mes) return alert("Preencha os campos!");

    const tx = db.transaction("rendas", "readwrite");
    const store = tx.objectStore("rendas");

    store.add({ mes, valor });

    tx.oncomplete = carregarRendas;
}

document.getElementById("addRenda").onclick = adicionarRenda;


function carregarRendas() {
    const tabela = document.querySelector("#rendaTabela tbody");
    tabela.innerHTML = "";

    let total = 0;

    const tx = db.transaction("rendas", "readonly");
    const store = tx.objectStore("rendas");

    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const item = cursor.value;

            tabela.innerHTML += `
                <tr>
                    <td>${item.mes}</td>
                    <td>R$ ${item.valor.toFixed(2)}</td>
                </tr>
            `;

            total += item.valor;

            cursor.continue();
        } else {
            document.getElementById("totalRenda").innerText =
                "Total de Rendas: R$ " + total.toFixed(2);

            calcularSaldo();
        }
    };
}


// --- FUNÇÕES PARA GASTOS ---
function adicionarGasto() {
    const desc = document.getElementById("gastoDesc").value;
    const valor = Number(document.getElementById("gastoValor").value);
    const data = document.getElementById("gastoData").value;

    if (!desc || !valor || !data) return alert("Preencha todos os campos!");

    const tx = db.transaction("gastos", "readwrite");
    const store = tx.objectStore("gastos");

    store.add({ desc, valor, data });

    tx.oncomplete = carregarGastos;
}

document.getElementById("addGasto").onclick = adicionarGasto;


function carregarGastos() {
    const tabela = document.querySelector("#gastoTabela tbody");
    tabela.innerHTML = "";

    let total = 0;

    const tx = db.transaction("gastos", "readonly");
    const store = tx.objectStore("gastos");

    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const item = cursor.value;

            tabela.innerHTML += `
                <tr>
                    <td>${item.data}</td>
                    <td>${item.desc}</td>
                    <td>R$ ${item.valor.toFixed(2)}</td>
                </tr>
            `;

            total += item.valor;
            cursor.continue();
        } else {
            document.getElementById("totalGasto").innerText =
                "Total de Gastos: R$ " + total.toFixed(2);

            calcularSaldo();
        }
    };
}


// --- SALDO ---
function calcularSaldo() {
    let totalR = 0;
    let totalG = 0;

    const tx1 = db.transaction("rendas", "readonly");
    tx1.objectStore("rendas").openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            totalR += cursor.value.valor;
            cursor.continue();
        }
    };

    const tx2 = db.transaction("gastos", "readonly");
    tx2.objectStore("gastos").openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            totalG += cursor.value.valor;
            cursor.continue();
        }
    };

    tx2.oncomplete = function () {
        const saldo = totalR - totalG;
        document.getElementById("saldoRestante").innerText =
            "Saldo Restante: R$ " + saldo.toFixed(2);
    };
}
