/* script.js - IndexedDB + UI + Chart.js */

// ---- utilidades ----
const $ = id => document.getElementById(id);
const formatBR = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

// ---- estado ----
let db = null;
let graficoAtivo = null;

// ---- iniciar DB ----
const DB_NAME = 'financeiroDB_v2';
const DB_VERSION = 1;
const req = indexedDB.open(DB_NAME, DB_VERSION);

req.onupgradeneeded = function(e){
  db = e.target.result;
  if(!db.objectStoreNames.contains('rendas')){
    db.createObjectStore('rendas',{ keyPath:'id', autoIncrement:true });
  }
  if(!db.objectStoreNames.contains('gastos')){
    db.createObjectStore('gastos',{ keyPath:'id', autoIncrement:true });
  }
};

req.onsuccess = function(e){
  db = e.target.result;
  setupUI();
  refreshAll();
};

req.onerror = function(){ alert('Erro ao abrir IndexedDB.'); };

// ---- helpers Promise para ler store ----
function getAllFrom(storeName){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName,'readonly');
    const store = tx.objectStore(storeName);
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

function addTo(storeName, obj){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName,'readwrite');
    const store = tx.objectStore(storeName);
    const r = store.add(obj);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function delFrom(storeName, id){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName,'readwrite');
    const store = tx.objectStore(storeName);
    const r = store.delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

// ---- UI: evento botões ----
function setupUI(){
  $('btnAddRenda').addEventListener('click', async ()=>{
    const mes = $('mesRenda').value;
    const valor = parseFloat($('valorRenda').value);
    if(!mes || !valor || Number.isNaN(valor)){ return alert('Preencha mês e valor corretamente.'); }
    await addTo('rendas',{ mes, valor });
    $('mesRenda').value=''; $('valorRenda').value='';
    refreshAll();
  });

  $('btnAddGasto').addEventListener('click', async ()=>{
    const data = $('dataGasto').value;
    const desc = $('descGasto').value.trim();
    const valor = parseFloat($('valorGasto').value);
    if(!data || !desc || !valor || Number.isNaN(valor)){ return alert('Preencha data, descrição e valor.'); }
    await addTo('gastos',{ data, desc, valor });
    $('dataGasto').value=''; $('descGasto').value=''; $('valorGasto').value='';
    refreshAll();
  });

  // delegação para remoção (listas)
  $('listaRendas').addEventListener('click', async (ev)=>{
    if(ev.target && ev.target.dataset && ev.target.dataset.action === 'del-renda'){
      const id = Number(ev.target.dataset.id);
      if(confirm('Remover esta renda?')){ await delFrom('rendas', id); refreshAll(); }
    }
  });

  $('listaGastos').addEventListener('click', async (ev)=>{
    if(ev.target && ev.target.dataset && ev.target.dataset.action === 'del-gasto'){
      const id = Number(ev.target.dataset.id);
      if(confirm('Remover este gasto?')){ await delFrom('gastos', id); refreshAll(); }
    }
  });

  // botões gráficos
  $('btnGrafRenda').addEventListener('click', gerarGraficoRendas);
  $('btnGrafGasto').addEventListener('click', gerarGraficoGastos);
  $('btnGrafSaldo').addEventListener('click', gerarGraficoSaldoPorMes);
}

// ---- atualizar tudo ----
async function refreshAll(){
  await Promise.all([renderRendas(), renderGastos(), atualizarResumo()]);
  // destrói gráfico se existir para evitar render duplicado
  if(graficoAtivo){ graficoAtivo.destroy(); graficoAtivo = null; }
}

// ---- render renda ----
async function renderRendas(){
  const arr = await getAllFrom('rendas');
  const ul = $('listaRendas');
  ul.innerHTML = '';
  arr.sort((a,b)=> a.mes < b.mes ? 1 : -1); // mostrar mais recentes primeiro
  for(const r of arr){
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-left">
        <strong>${r.mes}</strong>
        <span class="muted">${formatBR(r.valor)}</span>
      </div>
      <div class="item-actions">
        <button data-action="del-renda" data-id="${r.id}" title="Remover">🗑</button>
      </div>
    `;
    ul.appendChild(li);
  }
  $('totalRenda').innerText = formatBR(arr.reduce((s,x)=>s + Number(x.valor||0),0));
}

// ---- render gastos ----
async function renderGastos(){
  const arr = await getAllFrom('gastos');
  const ul = $('listaGastos');
  ul.innerHTML = '';
  arr.sort((a,b)=> a.data < b.data ? 1 : -1);
  for(const g of arr){
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-left">
        <strong>${g.desc}</strong>
        <span class="muted">${g.data} • ${formatBR(g.valor)}</span>
      </div>
      <div class="item-actions">
        <button data-action="del-gasto" data-id="${g.id}" title="Remover">🗑</button>
      </div>
    `;
    ul.appendChild(li);
  }
  $('totalGasto').innerText = formatBR(arr.reduce((s,x)=>s + Number(x.valor||0),0));
}

// ---- resumo saldo ----
async function atualizarResumo(){
  const [rendas, gastos] = await Promise.all([getAllFrom('rendas'), getAllFrom('gastos')]);
  const totalR = rendas.reduce((s,x)=> s + Number(x.valor||0), 0);
  const totalG = gastos.reduce((s,x)=> s + Number(x.valor||0), 0);
  $('totalRenda').innerText = formatBR(totalR);
  $('totalGasto').innerText = formatBR(totalG);
  $('saldoValor').innerText = formatBR(totalR - totalG);
}

// ---- GRÁFICOS ----
function criarGrafico(labels, valores, titulo, tipo='bar'){
  const ctx = document.getElementById('grafico').getContext('2d');
  if(graficoAtivo) graficoAtivo.destroy();
  graficoAtivo = new Chart(ctx, {
    type: tipo,
    data: {
      labels,
      datasets: [{
        label: titulo,
        data: valores,
        backgroundColor: labels.map((_,i)=> `rgba(37,99,235, ${0.6 - (i*0.02)})`),
        borderColor: labels.map(()=> 'rgba(37,99,235,0.9)'),
        borderWidth:1
      }]
    },
    options: {
      responsive:true,
      plugins:{ legend:{display:false} },
      scales:{ y:{ beginAtZero:true, ticks:{callback: v => formatBR(v)} } }
    }
  });
}

async function gerarGraficoRendas(){
  const arr = await getAllFrom('rendas');
  if(!arr.length){ alert('Nenhuma renda registrada.'); return; }
  // ordenar por mês ascendente para gráfico (mes string 'YYYY-MM')
  arr.sort((a,b)=> a.mes.localeCompare(b.mes));
  const labels = arr.map(r => r.mes);
  const valores = arr.map(r => Number(r.valor || 0));
  criarGrafico(labels, valores, 'Rendas por Mês', 'bar');
}

async function gerarGraficoGastos(){
  const arr = await getAllFrom('gastos');
  if(!arr.length){ alert('Nenhum gasto registrado.'); return; }
  // agrupar gastos por data (ou mostrar cada registro)
  // aqui mostra cada registro (data - desc) como label (cuidado com muitos pontos)
  const labels = arr.map(g => `${g.data}\n${g.desc}`);
  const valores = arr.map(g => Number(g.valor || 0));
  criarGrafico(labels, valores, 'Gastos (por registro)', 'bar');
}

async function gerarGraficoSaldoPorMes(){
  // soma rendas e gastos por mês (mês YYYY-MM)
  const [rendas, gastos] = await Promise.all([getAllFrom('rendas'), getAllFrom('gastos')]);

  // preparar mapa por mês
  const map = new Map();

  for(const r of rendas){
    const m = r.mes;
    map.set(m, (map.get(m) || 0) + Number(r.valor || 0));
  }

  for(const g of gastos){
    // converter data 'YYYY-MM-DD' -> mês 'YYYY-MM'
    const m = (g.data || '').slice(0,7);
    map.set(m, (map.get(m) || 0) - Number(g.valor || 0));
  }

  const labels = Array.from(map.keys()).sort();
  const valores = labels.map(l => map.get(l) || 0);

  if(!labels.length){ alert('Sem dados para gráfico de saldo.'); return; }
  criarGrafico(labels, valores, 'Saldo por Mês', 'line');
}
