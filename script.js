'use strict';
const $ = id => document.getElementById(id);
const IDLE = '__idle__';
const NAMES = {fcfs:'FCFS / FIFO', sjf:'SJF (no preemptivo)', rr:'Round Robin', mlq:'Multilevel Queue', mlfq:'Multilevel Feedback Queue'};
const EXAMPLES = {
  1:{alg:'fcfs', p:[['A',0,3],['B',1,5],['C',3,2],['D',9,5],['E',12,5]]},
  2:{alg:'sjf', p:[['A',0,4],['B',1,2],['C',2,6],['D',3,3],['E',5,2]]},
  3:{alg:'rr', q:2, p:[['A',0,5],['B',1,3],['C',2,4],['D',3,2]]},
  4:{alg:'mlq', q:2, p:[['A',0,6,1],['B',1,4,2],['C',2,3,3],['D',4,2,1],['E',5,5,2]]}
};
const POLICY = {
  fcfs:'Política: se atiende en orden de llegada. Sin expulsión: cada proceso corre hasta terminar.',
  sjf:'Política: no preemptivo. Cuando la CPU queda libre se elige, entre los procesos ya llegados, el de menor t (desempate: llegada y luego orden de captura).',
  rr:'Política: cola circular con el quantum indicado. Si el proceso no termina en su quantum, vuelve al final de la cola. Los procesos que llegan en el mismo instante en que expira un quantum entran antes que el proceso expulsado.',
  mlq:'Política: 3 colas fijas por prioridad absoluta con expulsión (Cola 1 > Cola 2 > Cola 3). Cola 1: Round Robin con quantum Q. Cola 2: Round Robin con quantum 2Q. Cola 3: FCFS. Cada proceso permanece siempre en la cola que se le asigna; una cola solo se atiende si las superiores están vacías.',
  mlfq:'Política: 3 niveles con prioridad absoluta y expulsión. Todo proceso entra en el nivel 1 (RR, quantum Q). Si agota su quantum baja de nivel: nivel 2 (RR, quantum 2Q) y nivel 3 (FCFS). Si es expulsado por un proceso de nivel superior, conserva su nivel y vuelve al final de su cola.'
};
const fmt = n => String(+n.toFixed(2));

/* ---------- tabla de entrada ---------- */
function addRow(n, a = '', b = '', q = 1) {
  const tbody = $('inTable').tBodies[0];
  if (n === undefined) n = String.fromCharCode(65 + (tbody.rows.length % 26));
  const tr = document.createElement('tr');
  tr.innerHTML = '<td><input class="n" maxlength="12" aria-label="Nombre"></td>' +
    '<td><input class="a" type="number" min="0" step="1" aria-label="Llegada"></td>' +
    '<td><input class="b" type="number" min="1" step="1" aria-label="Tiempo de ejecución"></td>' +
    '<td class="qc"><select class="qs"><option value="1">Cola 1</option><option value="2">Cola 2</option><option value="3">Cola 3</option></select></td>' +
    '<td><button class="sec x" title="Eliminar esta fila">✕</button></td>';
  tr.querySelector('.n').value = n; tr.querySelector('.a').value = a;
  tr.querySelector('.b').value = b; tr.querySelector('.qs').value = q;
  tr.querySelector('.x').onclick = () => tr.remove();
  tbody.appendChild(tr); updateUI();
}
function updateUI() {
  const alg = $('alg').value;
  $('qWrap').hidden = !['rr', 'mlq', 'mlfq'].includes(alg);
  document.querySelectorAll('.qc').forEach(e => e.style.display = alg === 'mlq' ? '' : 'none');
  $('policy').textContent = POLICY[alg];
}
function readProcs() {
  return [...$('inTable').tBodies[0].rows].map((r, i) => ({
    i, name: r.querySelector('.n').value.trim(),
    rawA: r.querySelector('.a').value.trim(), rawB: r.querySelector('.b').value.trim(),
    arr: Number(r.querySelector('.a').value), burst: Number(r.querySelector('.b').value),
    q: Number(r.querySelector('.qs').value)
  }));
}
function validate(ps, alg) {
  const err = [];
  if (!ps.length) return ['Agrega al menos un proceso.'];
  const seen = new Set();
  ps.forEach((p, k) => {
    const f = `Fila ${k + 1}`;
    if (!p.name) err.push(`${f}: el nombre no puede estar vacío.`);
    else if (seen.has(p.name.toLowerCase())) err.push(`${f}: el proceso "${p.name}" está duplicado.`);
    seen.add(p.name.toLowerCase());
    if (p.rawA === '' || !Number.isInteger(p.arr) || p.arr < 0) err.push(`${f}: el tiempo de llegada debe ser un entero ≥ 0.`);
    if (p.rawB === '' || !Number.isInteger(p.burst) || p.burst <= 0) err.push(`${f}: el tiempo de ejecución debe ser un entero > 0.`);
  });
  if (['rr', 'mlq', 'mlfq'].includes(alg)) {
    const q = Number($('quantum').value);
    if ($('quantum').value === '' || !Number.isInteger(q) || q <= 0) err.push('El quantum debe ser un entero > 0.');
  }
  return err;
}

/* ---------- algoritmos ---------- */
const names = a => a.map(p => p.name).join(', ');

function fcfs(ps) {
  const o = [...ps].sort((a, b) => a.arr - b.arr || a.i - b.i);
  const seg = [], log = []; let t = 0;
  o.forEach((p, k) => {
    if (t < p.arr) { seg.push({n: IDLE, s: t, e: p.arr}); log.push(`Tiempo ${t}: no hay procesos disponibles. La CPU queda ociosa hasta ${p.arr}.`); t = p.arr; }
    const av = o.slice(k).filter(x => x.arr <= t);
    log.push(`Tiempo ${t}:\nDisponibles: ${names(av)}\nSe selecciona ${p.name} ` + (av.length === 1 ? 'porque es el único proceso disponible.' : 'porque llegó primero (menor tiempo de llegada).'));
    seg.push({n: p.name, s: t, e: t + p.burst}); t += p.burst;
  });
  return {seg, log};
}

function sjf(ps) {
  let pend = [...ps], t = 0; const seg = [], log = [];
  while (pend.length) {
    const av = pend.filter(p => p.arr <= t);
    if (!av.length) {
      const nx = Math.min(...pend.map(p => p.arr));
      seg.push({n: IDLE, s: t, e: nx}); log.push(`Tiempo ${t}: no hay procesos disponibles. La CPU queda ociosa hasta ${nx}.`); t = nx; continue;
    }
    av.sort((a, b) => a.burst - b.burst || a.arr - b.arr || a.i - b.i);
    const p = av[0], tie = av.filter(x => x.burst === p.burst).length > 1;
    log.push(`Tiempo ${t}:\nDisponibles: ${names(av)}\nSe selecciona ${p.name} ` + (av.length === 1 ? 'porque es el único proceso disponible.' : tie ? `porque tiene el menor tiempo de ejecución (${p.burst}); hay empate y se desempata por llegada.` : `porque tiene el menor tiempo de ejecución (${p.burst}).`));
    seg.push({n: p.name, s: t, e: t + p.burst}); t += p.burst; pend = pend.filter(x => x !== p);
  }
  return {seg, log};
}

// Motor por unidades de tiempo para RR, MLQ y MLFQ.
function engine(ps, qs, lvl, demote) {
  const L = qs.length, Q = Array.from({length: L}, () => []), rem = {}, level = {};
  const seg = [], log = [];
  ps.forEach(p => { rem[p.name] = p.burst; level[p.name] = lvl(p); });
  const order = [...ps].sort((a, b) => a.arr - b.arr || a.i - b.i);
  let t = 0, k = 0, left = ps.length, cur = null, used = 0, pend = null, fresh = false, idleLogged = false;
  while (left > 0) {
    while (k < order.length && order[k].arr <= t) { const p = order[k++]; Q[level[p.name]].push(p); log.push(`Tiempo ${t}: llega ${p.name}` + (L > 1 ? ` a la Cola ${level[p.name] + 1}.` : '.')); }
    if (pend) { Q[level[pend.name]].push(pend); pend = null; }
    if (cur) {
      const hi = Q.findIndex(q => q.length);
      if (hi >= 0 && hi < level[cur.name]) {
        log.push(`Tiempo ${t}: ${cur.name} es expulsado porque hay un proceso en una cola de mayor prioridad (Cola ${hi + 1}). ${cur.name} vuelve al final de la Cola ${level[cur.name] + 1}.`);
        Q[level[cur.name]].push(cur); cur = null;
      }
    }
    if (!cur) {
      const li = Q.findIndex(q => q.length);
      if (li >= 0) {
        const wait = Q[li].slice(); cur = Q[li].shift(); used = 0; fresh = true; idleLogged = false;
        const qtxt = qs[li] === Infinity ? 'FCFS (sin quantum)' : `quantum ${qs[li]}`;
        log.push(`Tiempo ${t}:\n${L > 1 ? `Cola ${li + 1} (${qtxt}) — ` : ''}Disponibles: ${names(wait)}\nSe selecciona ${cur.name} porque está al frente de ${L > 1 ? 'la cola de mayor prioridad no vacía' : 'la cola'}.`);
      } else if (!idleLogged) { log.push(`Tiempo ${t}: no hay procesos listos. La CPU queda ociosa.`); idleLogged = true; }
    }
    const last = seg[seg.length - 1];
    if (cur) {
      if (!fresh && last && last.n === cur.name && last.e === t) last.e++; else seg.push({n: cur.name, s: t, e: t + 1});
      fresh = false; rem[cur.name]--; used++;
      const lv = level[cur.name];
      if (rem[cur.name] === 0) { left--; log.push(`Tiempo ${t + 1}: ${cur.name} termina su ejecución.`); cur = null; }
      else if (used >= qs[lv]) {
        let msg = `Tiempo ${t + 1}: ${cur.name} agota su quantum (${qs[lv]})`;
        if (demote && lv < L - 1) { level[cur.name] = lv + 1; msg += ` y baja a la Cola ${lv + 2}.`; } else msg += ` y vuelve al final de su cola.`;
        log.push(msg); pend = cur; cur = null;
      }
    } else if (last && last.n === IDLE && last.e === t) last.e++; else seg.push({n: IDLE, s: t, e: t + 1});
    t++;
  }
  return {seg, log};
}

function simulate(alg, ps, q) {
  if (alg === 'fcfs') return fcfs(ps);
  if (alg === 'sjf') return sjf(ps);
  if (alg === 'rr') return engine(ps, [q], () => 0, false);
  if (alg === 'mlq') return engine(ps, [q, 2 * q, Infinity], p => p.q - 1, false);
  return engine(ps, [q, 2 * q, Infinity], () => 0, true);
}

/* ---------- resultados ---------- */
function stats(ps, seg) {
  return ps.map(p => {
    const mine = seg.filter(s => s.n === p.name);
    const start = Math.min(...mine.map(s => s.s)), end = Math.max(...mine.map(s => s.e));
    const T = end - p.arr, E = T - p.burst, P = p.burst > 0 ? T / p.burst : null;
    return {name: p.name, arr: p.arr, t: p.burst, start, end, T, E, P};
  });
}
const colorOf = (name, ps) => name === IDLE ? '#e3e6ec' : `hsl(${(ps.findIndex(p => p.name === name) * 67 + 200) % 360},70%,78%)`;
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function gantt(seg, ps) {
  const total = seg[seg.length - 1].e, W = 1000, P = 24, H = 70, Y = 16;
  const X = t => P + t / total * W;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W + 2 * P} 130" font-family="Segoe UI,Arial,sans-serif">`;
  seg.forEach(s => {
    const x = X(s.s), w = X(s.e) - x, c = s.n === IDLE ? '#8a93a3' : '#1d2433';
    o += `<rect x="${x}" y="${Y}" width="${w}" height="${H}" fill="${colorOf(s.n, ps)}" stroke="#1d2433" stroke-width="2"/>`;
    o += `<text x="${x + w / 2}" y="${Y + H / 2 + 6}" text-anchor="middle" font-size="${w < 22 ? 12 : 20}" font-weight="600" fill="${c}">${s.n === IDLE ? (w < 40 ? '' : 'Ocioso') : esc(s.n)}</text>`;
  });
  o += `<line x1="${P}" y1="${Y + H}" x2="${P + W}" y2="${Y + H}" stroke="#1d2433" stroke-width="2"/>`;
  const xs = [...new Set(seg.flatMap(s => [s.s, s.e]))].sort((a, b) => a - b), drawn = [];
  const lab = (t, bold) => {
    const x = X(t); if (drawn.some(d => Math.abs(d - x) < 18)) return; drawn.push(x);
    o += `<line x1="${x}" y1="${Y + H}" x2="${x}" y2="${Y + H + 8}" stroke="#1d2433" stroke-width="${bold ? 2 : 1}"/>`;
    o += `<text x="${x}" y="${Y + H + 28}" text-anchor="middle" font-size="16" fill="#1d2433"${bold ? ' font-weight="600"' : ''}>${t}</text>`;
  };
  xs.forEach(t => lab(t, true));
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 5000].find(s => total / s <= 25) || 10000;
  for (let t = 0; t <= total; t += step) lab(t, false);
  return o + '</svg>';
}

function run() {
  const alg = $('alg').value, ps = readProcs(), err = validate(ps, alg), box = $('error');
  if (err.length) { box.innerHTML = err.map(esc).join('<br>'); box.hidden = false; $('results').hidden = true; return; }
  box.hidden = true;
  const q = Number($('quantum').value) || 1;
  const {seg, log} = simulate(alg, ps, q), rows = stats(ps, seg);
  const avg = k => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  const pv = rows.filter(r => r.P !== null), avgP = pv.length ? pv.reduce((s, r) => s + r.P, 0) / pv.length : null;
  let h = '<thead><tr><th>Proceso</th><th>Tiempo de Llegada</th><th>t</th><th>Inicio</th><th>Fin</th><th>T</th><th>E</th><th>P</th></tr></thead><tbody>';
  rows.forEach(r => h += `<tr><td>${esc(r.name)}</td><td>${r.arr}</td><td>${r.t}</td><td>${r.start}</td><td>${r.end}</td><td>${r.T}</td><td>${r.E}</td><td>${r.P === null ? '--' : fmt(r.P)}</td></tr>`);
  h += `<tr class="avg"><td>Promedio</td><td>--</td><td>${fmt(avg('t'))}</td><td>--</td><td>--</td><td>${fmt(avg('T'))}</td><td>${fmt(avg('E'))}</td><td>${avgP === null ? '--' : fmt(avgP)}</td></tr></tbody>`;
  $('outTable').innerHTML = h;
  $('algName').textContent = NAMES[alg] + (['rr', 'mlq', 'mlfq'].includes(alg) ? ` · Q = ${q}` : '');
  $('gantt').innerHTML = gantt(seg, ps);
  $('log').innerHTML = `<li>${esc(POLICY[alg])}</li>` + log.map(l => `<li>${esc(l).replace(/\n/g, '<br>')}</li>`).join('');
  const total = seg[seg.length - 1].e, busy = seg.filter(s => s.n !== IDLE).reduce((s, x) => s + x.e - x.s, 0);
  const card = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  $('stats').innerHTML = card(fmt(avg('E')), 'Tiempo promedio de espera') + card(fmt(avg('T')), 'Tiempo promedio de retorno') +
    card(avgP === null ? '--' : fmt(avgP), 'Penalización promedio') + card(total, 'Tiempo total') + card(fmt(busy / total * 100) + ' %', 'Uso de CPU');
  $('results').hidden = false;
  $('results').scrollIntoView({behavior: 'smooth'});
}

function loadExample(n) {
  const ex = EXAMPLES[n];
  $('inTable').tBodies[0].innerHTML = '';
  ex.p.forEach(p => addRow(p[0], p[1], p[2], p[3] || 1));
  $('alg').value = ex.alg; if (ex.q) $('quantum').value = ex.q;
  $('error').hidden = true; $('results').hidden = true; updateUI();
}

function download() {
  const html = `<!DOCTYPE html><html lang="es"><meta charset="UTF-8"><title>Resultados</title><style>body{font-family:Segoe UI,Arial,sans-serif;max-width:900px;margin:24px auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px;text-align:center}th{background:#eee}.avg td{font-weight:bold}svg{width:100%;height:auto}</style>` +
    `<h1>Simulación: ${esc($('algName').textContent)}</h1><table>${$('outTable').innerHTML}</table><h2>Diagrama de Gantt</h2>${$('gantt').innerHTML}<h2>Proceso de selección</h2><ol>${$('log').innerHTML}</ol>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
  a.download = 'resultados-planificacion.html'; a.click(); URL.revokeObjectURL(a.href);
}

$('alg').onchange = updateUI;
$('add').onclick = () => addRow();
$('delLast').onclick = () => { const b = $('inTable').tBodies[0]; if (b.rows.length) b.deleteRow(-1); };
$('clear').onclick = () => { $('inTable').tBodies[0].innerHTML = ''; $('results').hidden = true; $('error').hidden = true; };
$('run').onclick = run;
$('print').onclick = () => window.print();
$('download').onclick = download;
document.querySelectorAll('.ex').forEach(b => b.onclick = () => loadExample(b.dataset.ex));
loadExample(1);
