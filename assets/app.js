/* Human in the Loop – logica del sito: tema chiaro/scuro, avanzamento nell'elenco, quiz.
   Nessun dato lascia il dispositivo: si usa solo localStorage per tema e punteggi migliori. */
(function () {
  'use strict';

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  // ---- tema ----
  var btn = document.querySelector('.tema');
  if (btn) btn.addEventListener('click', function () {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme') ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('hitl_tema', next);
  });

  // ---- elenco: risultati migliori salvati sul dispositivo ----
  document.querySelectorAll('.voce[data-key]').forEach(function (a) {
    var best = store('hitl_best_' + a.getAttribute('data-key'));
    if (best) {
      var s = a.querySelector('.stato');
      s.textContent = best;
      var p = best.split('/');
      if (p[0] === p[1]) s.classList.add('fatto');
    }
  });

  // ---- quiz ----
  var Q = window.QUIZ, root = document.getElementById('quiz-root');
  if (!Q || !root) return;
  var LET = ['A', 'B', 'C', 'D', 'E'];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sez(r) { return r ? '§ ' + r + (Q.sezioni[r] ? ' – ' + esc(Q.sezioni[r]) : '') : ''; }

  var ordine, idx, punti, errori;

  function start() {
    ordine = shuffle(Q.domande.map(function (d, i) {
      var opz = shuffle(d.o.map(function (t, k) { return { t: t, ok: k === d.c }; }));
      return { d: d, opz: opz };
    }));
    idx = 0; punti = 0; errori = [];
    domanda();
  }

  function domanda() {
    var item = ordine[idx], tot = ordine.length;
    root.innerHTML = '';
    var bar = el('div', 'progress'); var fill = el('span'); fill.style.width = (idx / tot * 100) + '%'; bar.appendChild(fill);
    root.appendChild(bar);
    root.appendChild(el('p', 'qnum', 'Domanda ' + (idx + 1) + ' di ' + tot));
    root.appendChild(el('p', 'qtesto', esc(item.d.t)));
    var box = el('div', 'opzioni');
    item.opz.forEach(function (o, k) {
      var b = el('button', 'opz', '<span class="let">' + LET[k] + ')</span><span>' + esc(o.t) + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () { rispondi(item, k, box); });
      box.appendChild(b);
    });
    root.appendChild(box);
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function rispondi(item, k, box) {
    var giusta = item.opz[k].ok;
    var bottoni = box.querySelectorAll('.opz');
    bottoni.forEach(function (b, i) {
      b.disabled = true;
      if (item.opz[i].ok) b.classList.add('giusta');
      else if (i === k) b.classList.add('sbagliata');
    });
    if (giusta) punti++; else if (item.d.r) errori.push(item.d.r);
    var es = el('div', 'esito' + (giusta ? '' : ' ko'),
      '<strong>' + (giusta ? 'Risposta corretta' : 'Risposta non corretta') + '</strong>' + esc(item.d.s) +
      (item.d.r ? '<div class="ripasso">Nel libro: ' + sez(item.d.r) + '</div>' : ''));
    root.appendChild(es);
    var az = el('div', 'azioni');
    var next = el('button', 'btn', idx + 1 < ordine.length ? 'Avanti' : 'Vedi il risultato');
    next.type = 'button';
    next.addEventListener('click', function () { idx++; if (idx < ordine.length) domanda(); else fine(); });
    az.appendChild(next);
    root.appendChild(az);
    next.focus({ preventScroll: true });
  }

  function fine() {
    var tot = ordine.length, ratio = punti / tot;
    var luce = ratio >= 0.9 ? 'v' : (ratio >= 0.66 ? 'g' : 'r');
    var key = 'hitl_best_' + Q.key, prev = store(key);
    if (!prev || parseInt(prev, 10) < punti) store(key, punti + '/' + tot);

    var msg = '';
    (Q.griglia || []).some(function (g) {
      var m = String(g[0]).match(/(\d+)(?:–(\d+))?\//);
      if (!m) return false;
      var lo = +m[1], hi = m[2] ? +m[2] : +m[1];
      if (punti >= lo && punti <= hi) { msg = g[1]; return true; }
      return false;
    });

    root.innerHTML = '';
    var r = el('div', 'risultato');
    r.appendChild(el('div', 'semaforo', '<i class="r' + (luce === 'r' ? ' on' : '') + '"></i><i class="g' + (luce === 'g' ? ' on' : '') + '"></i><i class="v' + (luce === 'v' ? ' on' : '') + '"></i>'));
    r.appendChild(el('div', '', '<p class="punti">' + punti + '/' + tot + '</p><p>' + esc(msg) + '</p>'));
    root.appendChild(r);
    var uniq = errori.filter(function (x, i) { return errori.indexOf(x) === i; }).sort(function (a, b) {
      var pa = a.split('.'), pb = b.split('.'); return (pa[0] - pb[0]) || (pa[1] - pb[1]);
    });
    if (uniq.length) {
      root.appendChild(el('h2', '', 'Da rileggere nel libro'));
      var ul = el('ul', 'da-rileggere');
      uniq.forEach(function (x) { ul.appendChild(el('li', '', sez(x))); });
      root.appendChild(ul);
    }
    var az = el('div', 'azioni');
    var again = el('button', 'btn', 'Ripeti il quiz'); again.type = 'button'; again.addEventListener('click', start);
    var back = el('a', 'btn sec', 'Tutti i quiz'); back.href = '../../';
    az.appendChild(again); az.appendChild(back);
    root.appendChild(az);
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  start();
})();
