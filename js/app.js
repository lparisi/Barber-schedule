/* Interface: site do cliente e painel da equipe. Tudo é desenhado a partir do
   estado S; cada toque chama uma ação em `act`, que muda o estado e redesenha. */
(function () {
  'use strict';
  var B = window.Barber, $app = document.getElementById('app');
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var me = B.load('bs:me', { name: '', phone: '' });
  var S = {
    view: 'home', stack: [], tab: 'service',
    serviceId: undefined, proId: undefined, date: null, walkin: false, resched: null,
    sheet: null, form: {}, last: null,
    staff: { ok: false, pin: '', pro: B.tenant.pros[0].id, date: B.today() }
  };

  var I = {
    chev: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>',
    back: '<svg class="icon" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4l-7 7 7 7"/></svg>',
    fwd: '<svg class="icon" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4l7 7-7 7"/></svg>',
    check: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 21l7 7 13-15"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>'
  };

  /* ---------- utilidades ---------- */
  var initials = function (n) {
    var w = n.trim().split(/\s+/);
    return ((w[0] || '')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  };
  var first = function (n) { return n.trim().split(/\s+/)[0]; };
  var svc = function () { return S.serviceId && S.serviceId !== 'none' ? B.service(S.serviceId) : null; };
  var dur = function () { var s = svc(); return s ? s.min : 30; };
  var pros = function () {
    return S.proId && S.proId !== 'any' ? [B.pro(S.proId)] : B.prosFor(svc() ? svc().id : null);
  };
  var when = function (date, t) { return B.fmtDay(date) + ' às ' + B.fmtMin(t); };
  var svcName = function (a) { var s = a.serviceId && B.service(a.serviceId); return s ? s.name : 'Serviço a decidir na hora'; };
  var wa = function (phone, text) { return 'https://wa.me/55' + B.digits(phone) + '?text=' + encodeURIComponent(text); };
  var kv = function (k, v) { return '<div class="row plain"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; };
  var openNow = function () {
    var n = B.nowMin();
    return (B.tenant.hours[new Date().getDay()] || []).some(function (r) { return n >= B.toMin(r[0]) && n < B.toMin(r[1]); });
  };
  function toast(msg) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }
  function applyBrand() {
    var a = B.tenant.accent, el = document.getElementById('brand-style');
    if (!el) { el = document.createElement('style'); el.id = 'brand-style'; document.head.appendChild(el); }
    el.textContent = ':root{--accent:' + a.light + '}' +
      '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--accent:' + a.dark + '}}' +
      ':root[data-theme="dark"]{--accent:' + a.dark + '}';
    if (!window.__keepTitle) document.title = B.tenant.name;
  }
  function resetFlow() { S.serviceId = S.proId = undefined; S.walkin = false; S.resched = null; S.date = null; }
  function go(v) { S.stack.push(S.view); S.view = v; }
  function toTime() {
    var k = B.today(), ps = pros(); S.date = k;
    for (var i = 0; i < 14; i++, k = B.addDays(k, 1)) if (B.anySlots(ps, k, dur()).length) { S.date = k; break; }
    go('time');
  }

  /* ---------- pedaços reutilizados ---------- */
  function serviceList(list, withNone) {
    var groups = [], by = {};
    list.forEach(function (s) { if (!by[s.group]) groups.push(by[s.group] = { name: s.group, items: [] }); by[s.group].items.push(s); });
    var html = groups.map(function (g) {
      return '<section class="group"><h2>' + esc(g.name) + '</h2><div class="list">' + g.items.map(function (s) {
        return '<button class="row" data-a="pickService" data-id="' + s.id + '"><span class="main"><b>' + esc(s.name) +
          '</b><small>' + B.fmtDur(s.min) + '</small></span><span class="val">' + B.priceLabel(s) + '</span>' + I.chev + '</button>';
      }).join('') + '</div></section>';
    }).join('');
    if (withNone) html += '<section class="group"><div class="list"><button class="row" data-a="pickService" data-id="none">' +
      '<span class="main"><b>Decido na hora</b><small>Reserva 30 min com o profissional</small></span>' + I.chev + '</button></div></section>';
    return html;
  }
  function proList(list, withAny) {
    var d = dur(), rows = '';
    if (withAny && list.length > 1) {
      var nf = B.nextFree(list, d);
      rows += '<button class="row has-av" data-a="pickPro" data-id="any"><span class="av any">★</span><span class="main"><b>Primeiro disponível</b><small>' +
        (nf ? 'Próxima vaga: ' + when(nf.date, nf.t) : 'Sem vagas nos próximos dias') + '</small></span>' + I.chev + '</button>';
    }
    rows += list.map(function (p) {
      var nf = B.nextFree([p], d);
      return '<button class="row has-av" data-a="pickPro" data-id="' + p.id + '"><span class="av">' + initials(p.name) +
        '</span><span class="main"><b>' + esc(p.name) + '</b><small>' + (nf ? 'Próxima vaga: ' + when(nf.date, nf.t) : 'Sem vagas nos próximos dias') +
        '</small></span>' + I.chev + '</button>';
    }).join('');
    return '<div class="list">' + rows + '</div>';
  }
  function nav(label, right) {
    return '<nav class="nav"><button class="back" data-a="back">' + I.back + esc(label || 'Voltar') + '</button><span class="sp"></span>' + (right || '') + '</nav>';
  }
  function sheet(title, body) {
    return '<div class="scrim' + (lastSheet === S.sheet.type ? ' noanim' : '') + '"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) +
      '"><div class="grab"></div><div class="sh"><h2>' + esc(title) + '</h2><button class="x" data-a="closeSheet" aria-label="Fechar">' + I.x + '</button></div>' + body + '</div></div>';
  }

  /* ---------- telas do cliente ---------- */
  var V = {};

  V.home = function () {
    var t = B.tenant, open = openNow();
    var h = '<div class="page"><header class="brand"><div class="logo">' + initials(t.name.replace(/barbearia/i, '') || t.name) + '</div><div><h1>' + esc(t.name) +
      '</h1><p><span class="dot' + (open ? '' : ' off') + '"></span>' + (open ? 'Aberto agora' : 'Fechado agora') + ' · ' + esc(t.city) + '</p></div></header>';

    B.upcomingFor(me.phone).slice(0, 2).forEach(function (a) {
      h += '<section class="card"><span class="eyebrow">SEU HORÁRIO</span><h3>' + when(a.date, a.start) + '</h3><p>' + esc(svcName(a)) + ' · com ' +
        esc(B.pro(a.proId).name) + '</p><div class="acts"><button class="btn sm tinted" data-a="resched" data-id="' + a.id +
        '">Remarcar</button><button class="btn sm danger" data-a="askCancel" data-id="' + a.id + '">Cancelar</button></div></section>';
    });

    var nf = B.anySlots(t.pros, B.today(), 30)[0];
    if (nf) h += '<section class="card now"><div class="main"><span class="eyebrow">SEM HORA MARCADA?</span><h3>Próxima vaga hoje às ' + B.fmtMin(nf.t) +
      '</h3><p>Garanta antes de sair de casa.</p></div><button class="btn sm" data-a="walkin">Quero ir hoje</button></section>';

    h += '<section class="group"><h2>Agendar por</h2><div class="seg" role="group" aria-label="Agendar por">' +
      '<button data-a="tab" data-t="service" aria-pressed="' + (S.tab === 'service') + '">Serviço</button>' +
      '<button data-a="tab" data-t="pro" aria-pressed="' + (S.tab === 'pro') + '">Profissional</button></div></section>';
    h += S.tab === 'service' ? serviceList(t.services) : '<section class="group">' + proList(t.pros, false) + '</section>';

    var days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], wd = new Date().getDay();
    h += '<section class="group"><h2>A barbearia</h2><div class="list">' + kv('Endereço', esc(t.address)) +
      '<a class="row plain" href="' + wa(t.phone, 'Olá!') + '" target="_blank" rel="noopener"><span class="k">WhatsApp</span><span class="v">' + esc(t.phone) + '</span></a></div></section>';
    h += '<section class="group"><h2>Horários</h2><div class="list">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var r = t.hours[d];
      return '<div class="row plain"><span class="k"' + (d === wd ? ' style="color:var(--label);font-weight:600"' : '') + '>' + days[d] + '</span><span class="v val">' +
        (r ? r.map(function (p) { return p[0] + '–' + p[1]; }).join(' · ') : 'Fechado') + '</span></div>';
    }).join('') + '</div></section>';
    return h + '<button class="linkbtn" data-a="staff">Sou da equipe</button></div>';
  };

  V.service = function () {
    var p = S.proId && S.proId !== 'any' ? B.pro(S.proId) : null;
    return '<div class="page">' + nav() + '<header class="head"><h1 class="title">Qual serviço?</h1><p class="sub">' +
      (S.walkin ? 'Para hoje, na próxima vaga' : p ? 'Com ' + esc(p.name) : '') + '</p></header>' +
      serviceList(B.servicesOf(p), true) + '</div>';
  };

  V.pro = function () {
    var s = svc();
    return '<div class="page">' + nav() + '<header class="head"><h1 class="title">Com quem?</h1><p class="sub">' +
      (s ? esc(s.name) + ' · ' + B.fmtDur(s.min) + ' · ' + B.priceLabel(s) : '') + '</p></header><section class="group">' +
      proList(B.prosFor(s ? s.id : null), true) + '</section></div>';
  };

  V.time = function () {
    var s = svc(), ps = pros(), d = dur(), k = B.today();
    var who = S.proId && S.proId !== 'any' ? 'com ' + esc(B.pro(S.proId).name) : 'primeiro disponível';
    var h = '<div class="page">' + nav() + '<header class="head"><h1 class="title">' + (S.resched ? 'Novo horário' : 'Quando?') + '</h1><p class="sub">' +
      esc(s ? s.name : 'Serviço a decidir') + ' · ' + B.fmtDur(d) + ' · ' + who + '</p></header><div class="days">';
    for (var i = 0; i < 14; i++, k = B.addDays(k, 1)) {
      var dt = B.parseKey(k), n = B.anySlots(ps, k, d).length;
      h += '<button class="day" data-a="pickDay" data-k="' + k + '" aria-pressed="' + (k === S.date) + '"' + (n ? '' : ' disabled') +
        ' aria-label="' + B.fmtDay(k, true) + '"><small>' + (i === 0 ? 'hoje' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')) +
        '</small><b>' + dt.getDate() + '</b></button>';
    }
    h += '</div>';
    var slots = B.anySlots(ps, S.date, d);
    if (!slots.length) h += '<p class="empty">Sem horários livres neste dia.<br>Escolha outro dia acima.</p>';
    [['Manhã', 0, 720], ['Tarde', 720, 1080], ['Noite', 1080, 1440]].forEach(function (g) {
      var part = slots.filter(function (x) { return x.t >= g[1] && x.t < g[2]; });
      if (part.length) h += '<section class="group"><h2>' + g[0] + '</h2><div class="slots">' + part.map(function (x) {
        return '<button class="slot" data-a="pickTime" data-t="' + x.t + '" data-pro="' + x.proId + '">' + B.fmtMin(x.t) + '</button>';
      }).join('') + '</div></section>';
    });
    return h + '</div>';
  };

  V.done = function () {
    var a = S.last, p = B.pro(a.proId), s = a.serviceId && B.service(a.serviceId);
    var msg = 'Olá! Agendei pelo site: ' + svcName(a) + ' com ' + p.name + ', ' + B.fmtDay(a.date, true) + ' às ' + B.fmtMin(a.start) + '. ' + a.name;
    return '<div class="page done"><div class="check">' + I.check + '</div><header class="head"><h1 class="title">Horário confirmado</h1><p class="sub">Até lá, ' +
      esc(first(a.name)) + '.</p></header><div class="list">' + kv('Quando', B.fmtDay(a.date, true) + ' às ' + B.fmtMin(a.start)) + kv('Serviço', esc(svcName(a))) +
      kv('Profissional', esc(p.name)) + kv('Valor', B.priceLabel(s)) + kv('Onde', esc(B.tenant.address)) + '</div><div class="stack">' +
      '<a class="btn tinted" href="' + wa(B.tenant.phone, msg) + '" target="_blank" rel="noopener">Avisar a barbearia no WhatsApp</a>' +
      '<button class="btn gray" data-a="home">Voltar ao início</button></div>' +
      '<p class="sub">Para remarcar ou cancelar, é só abrir o site de novo neste aparelho.</p></div>';
  };

  /* ---------- painel da equipe ---------- */
  V.pin = function () {
    var dots = ''; for (var i = 0; i < 4; i++) dots += '<i class="' + (i < S.staff.pin.length ? 'on' : '') + '"></i>';
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button data-a="key" data-n="' + n + '">' + n + '</button>'; }).join('') +
      '<span></span><button data-a="key" data-n="0">0</button><button class="ghost" data-a="key" data-n="del" aria-label="Apagar">Apagar</button>';
    return '<div class="page center">' + nav('Site') + '<header class="head"><h1 class="title">Painel da equipe</h1><p class="sub">Digite o PIN de 4 dígitos</p></header>' +
      '<div class="pin" aria-label="' + S.staff.pin.length + ' de 4 dígitos">' + dots + '</div><div class="keys">' + keys +
      '</div><p class="sub">PIN desta demonstração: ' + esc(B.tenant.pin) + '</p></div>';
  };

  function timeline(pro, k) {
    var g = B.tenant.grid, items = B.dayOf(pro.id, k).filter(function (a) { return a.status !== 'cancelled'; });
    var rows = items.map(function (a) { return { t: a.start, a: a }; }), t0 = B.today();
    if (k >= t0) {
      var min = k === t0 ? Math.ceil(B.nowMin() / g) * g : 0;
      B.periods(pro, k).forEach(function (r) {
        var cur = Math.max(r[0], min);
        items.filter(function (a) { return (a.status === 'booked' || a.status === 'done') && a.start + a.dur > cur && a.start < r[1]; })
          .forEach(function (a) { if (a.start - cur >= g) rows.push({ t: cur, end: a.start }); cur = Math.max(cur, a.start + a.dur); });
        if (r[1] - cur >= g) rows.push({ t: cur, end: r[1] });
      });
    }
    return rows.sort(function (a, b) { return a.t - b.t; });
  }

  V.staff = function () {
    var st = S.staff, pro = B.pro(st.pro), rows = timeline(pro, st.date);
    var appts = rows.filter(function (r) { return r.a && r.a.kind !== 'block' && r.a.status !== 'noshow'; }).map(function (r) { return r.a; });
    var total = appts.reduce(function (n, a) { var s = a.serviceId && B.service(a.serviceId); return n + (s && s.price || 0); }, 0);
    var h = '<div class="page wide">' + nav('Site', '<button class="txt" data-a="settings">Ajustes</button>') +
      '<header class="head"><h1 class="title">Agenda</h1></header><div class="chips" role="group" aria-label="Profissional">' +
      B.tenant.pros.map(function (p) {
        return '<button class="chip" data-a="staffPro" data-id="' + p.id + '" aria-pressed="' + (p.id === st.pro) + '"><span class="av">' + initials(p.name) + '</span>' + esc(first(p.name)) + '</button>';
      }).join('') + '</div><div class="datebar"><button class="round" data-a="staffDay" data-n="-1" aria-label="Dia anterior">' + I.back +
      '</button><b>' + B.fmtDay(st.date, true) + '</b><button class="round" data-a="staffDay" data-n="1" aria-label="Próximo dia">' + I.fwd + '</button></div>' +
      '<div class="stats"><div class="stat"><b>' + appts.length + '</b><small>Atendimentos</small></div><div class="stat"><b>' +
      appts.filter(function (a) { return a.kind === 'walkin'; }).length + '</b><small>Encaixes</small></div><div class="stat"><b>' + B.money(total) + '</b><small>Previsto</small></div></div>';
    if (!rows.length) h += '<p class="empty">' + (B.periods(pro, st.date).length ? 'Nenhum horário neste dia.' : esc(first(pro.name)) + ' não atende neste dia.') + '</p>';
    else h += '<div class="list">' + rows.map(function (r) {
      if (!r.a) return '<button class="row free" data-a="newAt" data-t="' + r.t + '"><span class="time">' + B.fmtMin(r.t) + '</span><span class="main">Livre até ' +
        B.fmtMin(r.end) + '</span><span class="plus">Agendar</span></button>';
      var a = r.a, tag = a.status === 'done' ? '<span class="tag ok">Concluído</span>' : a.status === 'noshow' ? '<span class="tag bad">Faltou</span>' :
        a.kind === 'walkin' ? '<span class="tag walk">Encaixe</span>' : a.kind === 'block' ? '' : '<span class="tag">Marcado</span>';
      return '<button class="row' + (a.status === 'noshow' ? ' faded' : '') + '" data-a="openAppt" data-id="' + a.id + '"><span class="time">' + B.fmtMin(a.start) +
        '<small>' + B.fmtMin(a.start + a.dur) + '</small></span><span class="main"><b>' + esc(a.kind === 'block' ? 'Bloqueado' : a.name) + '</b><small>' +
        esc(a.kind === 'block' ? (a.note || 'Sem atendimento') : svcName(a)) + (a.demo ? ' · exemplo' : '') + '</small></span>' + tag + I.chev + '</button>';
    }).join('') + '</div>';
    return h + '</div><div class="dock"><div><button class="btn" data-a="newWalkin">Encaixe agora</button><button class="btn gray" data-a="newBlock">Bloquear</button></div></div>';
  };

  /* ---------- folhas ---------- */
  var SH = {}, lastSheet = null;

  SH.confirm = function () {
    var x = S.sheet, s = svc(), p = B.pro(x.proId);
    return sheet(S.resched ? 'Confirmar novo horário' : 'Confirmar', '<div class="list">' + kv('Quando', B.fmtDay(S.date, true) + ' às ' + B.fmtMin(x.t)) +
      kv('Serviço', esc(s ? s.name : 'A decidir na hora')) + kv('Profissional', esc(p.name)) + kv('Valor', B.priceLabel(s)) + '</div>' +
      '<form class="stack" data-form="confirm" novalidate><div class="list"><div class="field"><label for="f-name">Nome</label><input id="f-name" data-f="name" autocomplete="name" autocapitalize="words" placeholder="Seu nome" value="' +
      esc(S.form.name) + '"></div><div class="field"><label for="f-phone">Celular</label><input id="f-phone" data-f="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(48) 90000-0000" value="' +
      esc(S.form.phone) + '"></div></div><p class="err" role="alert"></p><p class="note">Sem cadastro e sem senha. O celular só identifica o seu horário.</p>' +
      '<button class="btn" type="submit">Confirmar agendamento</button></form>');
  };

  SH.cancel = function () {
    var a = B.find(S.sheet.id);
    return sheet('Cancelar horário?', '<div class="list">' + kv('Quando', when(a.date, a.start)) + kv('Serviço', esc(svcName(a))) + kv('Profissional', esc(B.pro(a.proId).name)) +
      '</div><div class="stack"><button class="btn danger" data-a="doCancel" data-id="' + a.id + '">Cancelar horário</button><button class="btn gray" data-a="closeSheet">Manter</button></div>');
  };

  function staffSlots() {
    var f = S.form, pro = B.pro(S.staff.pro), s = B.service(f.serviceId);
    if (f.mode === 'walkin') return B.slots(pro, B.today(), s.min);
    return B.slots(pro, S.staff.date, f.mode === 'block' ? B.tenant.grid : s.min);
  }
  SH.novo = function () {
    var f = S.form, pro = B.pro(S.staff.pro), opts = staffSlots(), block = f.mode === 'block';
    if (opts.indexOf(+f.start) < 0) f.start = opts[0];
    var seg = '<div class="seg">' + [['walkin', 'Encaixe agora'], ['book', 'Marcar'], ['block', 'Bloquear']].map(function (m) {
      return '<button data-a="mode" data-m="' + m[0] + '" aria-pressed="' + (f.mode === m[0]) + '">' + m[1] + '</button>';
    }).join('') + '</div>';
    var fields = '';
    if (!block) fields += '<div class="field"><label for="s-name">Cliente</label><input id="s-name" data-f="name" autocapitalize="words" placeholder="' +
      (f.mode === 'walkin' ? 'Nome (opcional)' : 'Nome') + '" value="' + esc(f.name) + '"></div><div class="field"><label for="s-phone">Celular</label><input id="s-phone" data-f="phone" type="tel" inputmode="tel" placeholder="Opcional" value="' +
      esc(f.phone) + '"></div><div class="field"><label for="s-svc">Serviço</label><select id="s-svc" data-f="serviceId" data-r="1">' + B.servicesOf(pro).map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === f.serviceId ? ' selected' : '') + '>' + esc(s.name) + ' · ' + B.fmtDur(s.min) + '</option>';
      }).join('') + '</select></div>';
    else fields += '<div class="field"><label for="s-note">Motivo</label><input id="s-note" data-f="note" placeholder="Almoço, folga… (opcional)" value="' + esc(f.note) + '"></div>';
    if (f.mode === 'walkin') fields += '<div class="field"><label>Início</label><span class="val">' + (opts.length ? 'Hoje às ' + B.fmtMin(opts[0]) + ' (primeira vaga)' : 'Sem vaga hoje') + '</span></div>';
    else fields += '<div class="field"><label for="s-start">Início</label><select id="s-start" data-f="start">' + (opts.length ? opts.map(function (t) {
      return '<option value="' + t + '"' + (t === +f.start ? ' selected' : '') + '>' + B.fmtMin(t) + '</option>';
    }).join('') : '<option value="">Sem vaga neste dia</option>') + '</select></div>';
    if (block) fields += '<div class="field"><label for="s-dur">Duração</label><select id="s-dur" data-f="dur">' + [15, 30, 45, 60, 90, 120, 180, 240].map(function (m) {
      return '<option value="' + m + '"' + (m === +f.dur ? ' selected' : '') + '>' + B.fmtDur(m) + '</option>';
    }).join('') + '</select></div>';
    return sheet('Agenda de ' + first(pro.name), seg + '<form class="stack" data-form="novo" novalidate><div class="list">' + fields +
      '</div><p class="err" role="alert"></p><button class="btn" type="submit">' + (block ? 'Bloquear horário' : f.mode === 'walkin' ? 'Colocar na agenda' : 'Marcar horário') + '</button></form>');
  };

  SH.appt = function () {
    var a = B.find(S.sheet.id), s = a.serviceId && B.service(a.serviceId), block = a.kind === 'block';
    var rows = kv('Horário', B.fmtMin(a.start) + '–' + B.fmtMin(a.start + a.dur));
    if (!block) rows += kv('Serviço', esc(svcName(a))) + kv('Valor', B.priceLabel(s)) + kv('Origem', a.kind === 'walkin' ? 'Encaixe' : 'Agendado') + (a.phone ? kv('Celular', esc(a.phone)) : '');
    else if (a.note) rows += kv('Motivo', esc(a.note));
    var btns = '';
    if (block) btns = '<button class="btn danger" data-a="status" data-s="cancelled">Remover bloqueio</button>';
    else if (a.status === 'booked') btns = '<button class="btn" data-a="status" data-s="done">Concluir atendimento</button>' +
      (a.phone ? '<a class="btn tinted" target="_blank" rel="noopener" href="' + wa(a.phone, 'Olá, ' + first(a.name) + '! Aqui é da ' + B.tenant.name + '.') + '">Chamar no WhatsApp</a>' : '') +
      '<button class="btn gray" data-a="status" data-s="noshow">Não compareceu</button><button class="btn danger" data-a="status" data-s="cancelled">Cancelar horário</button>';
    else btns = '<button class="btn gray" data-a="status" data-s="booked">Reabrir</button>';
    return sheet(block ? 'Bloqueado' : a.name, '<div class="list">' + rows + '</div><div class="stack">' + btns + '</div>');
  };

  SH.settings = function () {
    var h = '';
    if (B.tenants.length > 1) h += '<section class="group"><h2>Marca em exibição</h2><div class="list">' + B.tenants.map(function (t) {
      return '<button class="row" data-a="tenant" data-id="' + t.id + '"><span class="main"><b>' + esc(t.name) + '</b></span>' +
        (t.id === B.tenant.id ? '<span class="val" style="color:var(--accent)">Ativa</span>' : '') + '</button>';
    }).join('') + '</div><p class="foot">O mesmo sistema, com nome, cores, equipe e serviços de cada barbearia.</p></section>';
    return sheet('Ajustes', h + '<div class="stack"><button class="btn gray" data-a="reset">Restaurar dados de exemplo</button><button class="btn danger" data-a="logout">Sair do painel</button></div>');
  };

  /* ---------- ações ---------- */
  var act = {
    tab: function (d) { S.tab = d.t; },
    home: function () { resetFlow(); S.stack = []; S.view = 'home'; },
    back: function () {
      S.view = S.stack.pop() || 'home';
      if (S.view === 'home') { resetFlow(); if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
    },
    closeSheet: function () { S.sheet = null; },
    walkin: function () { resetFlow(); S.walkin = true; S.proId = 'any'; go('service'); },
    pickService: function (d) {
      S.serviceId = d.id;
      if (S.walkin) {
        var s = B.anySlots(pros(), B.today(), dur());
        if (s.length) { S.date = B.today(); go('time'); return openConfirm(s[0].t, s[0].proId); }
        S.walkin = false; toast('Hoje não há mais vaga para esse serviço. Veja os próximos dias.');
        return toTime();
      }
      if (S.proId === undefined) {
        var ps = B.prosFor(svc() ? svc().id : null);
        if (ps.length === 1) { S.proId = ps[0].id; toTime(); } else go('pro');
      } else toTime();
    },
    pickPro: function (d) { S.proId = d.id; if (S.serviceId === undefined) go('service'); else toTime(); },
    pickDay: function (d) { S.date = d.k; },
    pickTime: function (d) { openConfirm(+d.t, d.pro); },
    resched: function (d) {
      var a = B.find(d.id); resetFlow();
      S.resched = a.id; S.serviceId = a.serviceId || 'none'; S.proId = a.proId; toTime();
    },
    askCancel: function (d) { S.sheet = { type: 'cancel', id: d.id }; },
    doCancel: function (d) { B.setStatus(d.id, 'cancelled'); S.sheet = null; toast('Horário cancelado'); },

    staff: function () { resetFlow(); S.stack = ['home']; S.view = S.staff.ok ? 'staff' : 'pin'; if (location.hash !== '#painel') history.replaceState(null, '', '#painel'); },
    key: function (d) {
      var st = S.staff;
      if (d.n === 'del') st.pin = st.pin.slice(0, -1); else if (st.pin.length < 4) st.pin += d.n;
      if (st.pin.length === 4) {
        if (st.pin === B.tenant.pin) { st.ok = true; S.view = 'staff'; } else toast('PIN incorreto');
        st.pin = '';
      }
    },
    staffPro: function (d) { S.staff.pro = d.id; },
    staffDay: function (d) { S.staff.date = B.addDays(S.staff.date, +d.n); },
    settings: function () { S.sheet = { type: 'settings' }; },
    tenant: function (d) { B.setTenant(d.id); applyBrand(); S.staff.pro = B.tenant.pros[0].id; S.sheet = null; toast('Marca: ' + B.tenant.name); },
    reset: function () { B.resetDemo(); S.sheet = null; toast('Dados de exemplo restaurados'); },
    logout: function () { S.staff.ok = false; S.sheet = null; act.home(); },
    newWalkin: function () { openNovo('walkin'); },
    newBlock: function () { openNovo('block'); },
    newAt: function (d) { openNovo('book', +d.t); },
    mode: function (d) { S.form.mode = d.m; },
    openAppt: function (d) { S.sheet = { type: 'appt', id: d.id }; },
    status: function (d) {
      var a = B.find(S.sheet.id);
      if (d.s === 'booked' && !B.isFree(a.proId, a.date, a.start, a.dur, a.id)) return toast('Esse horário já foi ocupado por outro cliente');
      B.setStatus(a.id, d.s); S.sheet = null;
      toast({ done: 'Atendimento concluído', noshow: 'Marcado como falta', cancelled: a.kind === 'block' ? 'Bloqueio removido' : 'Horário cancelado', booked: 'Horário reaberto' }[d.s]);
    }
  };
  function openConfirm(t, proId) { S.form = { name: me.name, phone: me.phone }; S.sheet = { type: 'confirm', t: t, proId: proId }; }
  function openNovo(mode, start) {
    S.form = { mode: mode, name: '', phone: '', note: '', serviceId: B.servicesOf(B.pro(S.staff.pro))[0].id, start: start, dur: 60 };
    S.sheet = { type: 'novo' };
  }

  var submit = {
    confirm: function (err) {
      var f = S.form, x = S.sheet, name = (f.name || '').trim(), n = B.digits(f.phone).length;
      if (name.length < 2) return err('Digite o seu nome.');
      if (n < 10 || n > 11) return err('Digite o celular com DDD, por exemplo (48) 99999-0000.');
      var a = B.book({
        proId: x.proId, serviceId: svc() ? svc().id : null, date: S.date, start: x.t, dur: dur(), name: name, phone: B.maskPhone(f.phone),
        kind: S.walkin && S.date === B.today() ? 'walkin' : 'booking'
      });
      if (!a) { S.sheet = null; toast('Esse horário acabou de ser ocupado. Escolha outro.'); return true; }
      if (S.resched) B.setStatus(S.resched, 'cancelled');
      me = { name: name, phone: a.phone }; B.save('bs:me', me);
      S.last = a; S.sheet = null; resetFlow(); S.stack = []; S.view = 'done';
      return true;
    },
    novo: function (err) {
      var f = S.form, st = S.staff, opts = staffSlots(), a;
      if (f.mode === 'block') {
        if (f.start == null || f.start === '') return err('Não há horário livre neste dia.');
        if (!B.isFree(st.pro, st.date, +f.start, +f.dur)) return err('Já existe atendimento nesse período. Escolha uma duração menor.');
        a = B.book({ proId: st.pro, serviceId: null, date: st.date, start: +f.start, dur: +f.dur, name: 'Bloqueado', phone: '', note: (f.note || '').trim(), kind: 'block' });
      } else {
        var s = B.service(f.serviceId), walk = f.mode === 'walkin', name = (f.name || '').trim();
        if (!opts.length) return err(walk ? 'Sem vaga hoje para esse serviço na agenda de ' + first(B.pro(st.pro).name) + '.' : 'Não há horário livre neste dia para esse serviço.');
        if (!walk && name.length < 2) return err('Digite o nome do cliente.');
        a = B.book({
          proId: st.pro, serviceId: s.id, date: walk ? B.today() : st.date, start: walk ? opts[0] : +f.start, dur: s.min,
          name: name || 'Cliente sem hora marcada', phone: B.maskPhone(f.phone), kind: walk ? 'walkin' : 'booking'
        });
        if (a && walk) st.date = B.today();
      }
      if (!a) return err('Esse horário não está mais livre.');
      S.sheet = null; toast(f.mode === 'block' ? 'Horário bloqueado' : 'Entrou na agenda às ' + B.fmtMin(a.start));
      return true;
    }
  };

  /* ---------- desenho e eventos ---------- */
  var lastView = null;
  function render() {
    var h = V[S.view]();
    if (S.sheet) h += SH[S.sheet.type]();
    $app.innerHTML = h;
    lastSheet = S.sheet ? S.sheet.type : null;
    document.body.style.overflow = S.sheet ? 'hidden' : '';
    if (S.view !== lastView) { window.scrollTo(0, 0); lastView = S.view; }
    var sel = $app.querySelector('.day[aria-pressed="true"]');
    if (sel) sel.parentNode.scrollLeft = sel.offsetLeft - sel.parentNode.clientWidth / 2 + sel.offsetWidth / 2;
  }
  $app.addEventListener('click', function (e) {
    if (e.target.classList.contains('scrim')) { S.sheet = null; return render(); }
    var el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    act[el.dataset.a](el.dataset);
    render();
  });
  $app.addEventListener('input', function (e) {
    var f = e.target.dataset.f; if (!f) return;
    if (e.target.type === 'tel') e.target.value = B.maskPhone(e.target.value);
    S.form[f] = e.target.value;
    var box = e.target.form && e.target.form.querySelector('.err'); if (box) box.textContent = '';
    if (e.target.dataset.r) render();
  });
  $app.addEventListener('submit', function (e) {
    e.preventDefault();
    var box = e.target.querySelector('.err');
    var ok = submit[e.target.dataset.form](function (m) { box.textContent = m; });
    if (ok) render();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); }
    else if (S.view === 'pin' && /^\d$/.test(e.key)) { act.key({ n: e.key }); render(); }
    else if (S.view === 'pin' && e.key === 'Backspace') { act.key({ n: 'del' }); render(); }
  });
  function route() { if (location.hash === '#painel' && S.view !== 'staff' && S.view !== 'pin') { act.staff(); render(); } }
  window.addEventListener('hashchange', route);

  applyBrand();
  render();
  route();
})();
