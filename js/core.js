/* Regras de negócio e armazenamento. A interface (app.js) só fala com este
   arquivo, então trocar o localStorage por uma API real fica concentrado aqui. */
(function () {
  'use strict';
  var B = (window.Barber = {});
  var mem = {};

  B.load = function (k, d) {
    if (k in mem) return mem[k];
    try { var v = localStorage.getItem(k); if (v != null) return (mem[k] = JSON.parse(v)); } catch (e) {}
    return d;
  };
  B.save = function (k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  };

  B.remove = function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} };

  /* ---------- datas ---------- */
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  B.dateKey = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  B.parseKey = function (k) { var a = k.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  B.addDays = function (k, n) { var d = B.parseKey(k); d.setDate(d.getDate() + n); return B.dateKey(d); };
  B.today = function () { return B.dateKey(new Date()); };
  B.nowMin = function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  B.toMin = function (s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; };
  B.fmtMin = function (m) { return p2(Math.floor(m / 60)) + ':' + p2(m % 60); };
  B.fmtDur = function (m) { return m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + 'h' + p2(m % 60) : m / 60 + ' h'); };
  B.fmtDay = function (k, long) {
    var t = B.today();
    var s = B.parseKey(k).toLocaleDateString('pt-BR', long
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { weekday: 'short', day: 'numeric', month: 'short' });
    if (k === t) return long ? 'Hoje, ' + s : 'Hoje';
    if (k === B.addDays(t, 1)) return long ? 'Amanhã, ' + s : 'Amanhã';
    return s;
  };
  B.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  B.maskPhone = function (s) {
    var d = B.digits(s).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  };
  B.money = function (v) { return 'R$ ' + (v % 1 ? v.toFixed(2).replace('.', ',') : v); };
  B.priceLabel = function (s) { return !s || s.none ? 'A combinar' : s.price ? B.money(s.price) : s.plan ? 'No plano' : 'A combinar'; };

  /* ---------- marca (white label) ---------- */
  B.tenants = window.TENANTS || [];
  B.setTenant = function (id) {
    B.tenant = B.tenants.filter(function (t) { return t.id === id; })[0] || B.tenants[0];
    B.save('bs:tenant', B.tenant.id);
    appts = null;
    seed();
    B.purge();
  };
  B.pro = function (id) { return B.tenant.pros.filter(function (p) { return p.id === id; })[0]; };
  B.service = function (id) { return B.tenant.services.filter(function (s) { return s.id === id; })[0]; };
  B.prosFor = function (serviceId) {
    return B.tenant.pros.filter(function (p) { return !serviceId || !p.services || p.services.indexOf(serviceId) >= 0; });
  };
  B.servicesOf = function (pro) {
    return B.tenant.services.filter(function (s) { return !pro || !pro.services || pro.services.indexOf(s.id) >= 0; });
  };

  /* ---------- serviço principal + adicionais ---------- */
  // Soma duração e valor. Se as partes formam um combo, vale o combo.
  B.total = function (serviceId, extras) {
    if (!serviceId || !B.service(serviceId)) return { none: true, min: 30, price: 0, name: 'Serviço a decidir na hora' };
    var ids = [serviceId].concat(extras || []);
    B.tenant.services.forEach(function (b) {
      if (b.bundle && b.bundle.every(function (id) { return ids.indexOf(id) >= 0; })) {
        ids = ids.filter(function (id) { return b.bundle.indexOf(id) < 0; });
        ids.unshift(b.id);
      }
    });
    var list = ids.map(B.service);
    return {
      min: list.reduce(function (n, x) { return n + x.min; }, 0),
      price: list.reduce(function (n, x) { return n + (x.price || 0); }, 0),
      plan: list.some(function (x) { return x.plan; }),
      name: list.map(function (x) { return x.name; }).join(' + ')
    };
  };
  // Adicionais que fazem sentido oferecer junto do que já foi escolhido.
  B.extrasFor = function (serviceId, extras, pro) {
    var have = [], kinds = [];
    [serviceId].concat(extras || []).forEach(function (id) { var x = B.service(id); have = have.concat(x.bundle || [id]); });
    have.forEach(function (id) { var x = B.service(id); if (x && x.kind) kinds.push(x.kind); });
    return B.servicesOf(pro).filter(function (x) {
      return x.extra && have.indexOf(x.id) < 0 && (!x.kind || kinds.indexOf(x.kind) < 0);
    });
  };

  /* ---------- agenda ---------- */
  var appts = null;
  var key = function () { return 'bs:' + B.tenant.id + ':appts'; };
  B.appts = function () { return appts || (appts = B.load(key(), [])); };
  B.commit = function () { B.save(key(), appts); };
  B.find = function (id) { return B.appts().filter(function (a) { return a.id === id; })[0]; };
  var holds = function (a) { return a.status === 'booked' || a.status === 'done'; };

  // Períodos de trabalho de um profissional num dia: [[início, fim], ...] em minutos.
  B.periods = function (pro, k) {
    var wd = B.parseKey(k).getDay();
    if ((pro.off || []).indexOf(wd) >= 0) return [];
    var h = (pro.hours || B.tenant.hours)[wd] || [];
    return h.map(function (r) { return [B.toMin(r[0]), B.toMin(r[1])]; });
  };
  B.dayOf = function (proId, k) {
    return B.appts().filter(function (a) { return a.proId === proId && a.date === k; })
      .sort(function (a, b) { return a.start - b.start; });
  };
  B.isFree = function (proId, k, start, dur, ignoreId) {
    return !B.dayOf(proId, k).some(function (a) {
      return holds(a) && a.id !== ignoreId && start < a.start + a.dur && a.start < start + dur;
    });
  };
  // Horários de início livres de um profissional para uma duração.
  B.slots = function (pro, k, dur) {
    var g = B.tenant.grid, out = [], t0 = B.today();
    if (k < t0) return out;
    var min = k === t0 ? Math.ceil(B.nowMin() / g) * g : 0;
    B.periods(pro, k).forEach(function (r) {
      for (var t = r[0]; t + dur <= r[1]; t += g) if (t >= min && B.isFree(pro.id, k, t, dur)) out.push(t);
    });
    return out;
  };
  // Cabe? Livre e inteiro dentro de um período de trabalho.
  B.fits = function (pro, k, start, dur, ignoreId) {
    return B.isFree(pro.id, k, start, dur, ignoreId) &&
      B.periods(pro, k).some(function (r) { return start >= r[0] && start + dur <= r[1]; });
  };
  // Horários oferecidos ao cliente. A agenda tem precisão de 5 min, mas mostrar
  // todos seria uma parede de botões e deixaria buracos sem uso entre clientes.
  // Então cada trecho livre é oferecido "sem sobra": encostado no atendimento
  // anterior, de serviço em serviço, e também encostado no seguinte.
  B.offers = function (pro, k, dur) {
    var all = B.slots(pro, k, dur);
    if (B.tenant.clientSlots === 'all') return all;
    var g = B.tenant.grid, out = [], i = 0;
    while (i < all.length) {
      var j = i; while (j + 1 < all.length && all[j + 1] === all[j] + g) j++;   // trecho contínuo all[i..j]
      for (var t = all[i]; t <= all[j]; t += dur) out.push(t);
      if (out[out.length - 1] !== all[j]) out.push(all[j]);
      i = j + 1;
    }
    return out;
  };
  // "Primeiro disponível": une as agendas e, em cada horário, escolhe quem
  // está com o dia mais leve, para distribuir os clientes entre a equipe.
  B.anySlots = function (pros, k, dur) {
    var map = {};
    pros.forEach(function (p) {
      var load = B.dayOf(p.id, k).filter(holds).length;
      B.offers(p, k, dur).forEach(function (t) {
        if (!map[t] || load < map[t].load) map[t] = { t: t, proId: p.id, load: load };
      });
    });
    return Object.keys(map).map(function (t) { return map[t]; }).sort(function (a, b) { return a.t - b.t; });
  };
  B.nextFree = function (pros, dur, days) {
    var k = B.today();
    for (var i = 0; i < (days || 14); i++, k = B.addDays(k, 1)) {
      var s = B.anySlots(pros, k, dur);
      if (s.length) return { date: k, t: s[0].t, proId: s[0].proId };
    }
    return null;
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  // Grava um horário. Devolve null se alguém ocupou a vaga nesse meio-tempo.
  B.book = function (a) {
    if (!B.isFree(a.proId, a.date, a.start, a.dur)) return null;
    a.id = uid(); a.status = 'booked'; a.createdAt = Date.now();
    if (a.kind !== 'block') a.code = code();
    B.appts().push(a); B.commit();
    return a;
  };
  // Retenção: nome e celular existem só enquanto o horário está em aberto.
  // Concluiu, faltou ou cancelou: os dados pessoais são apagados na hora e
  // sobra um registro anônimo (horário, serviço, valor) para o caixa do dia.
  var scrub = function (a) { if (a.kind !== 'block') { a.name = ''; a.phone = ''; } };
  B.setStatus = function (id, status) {
    var a = B.find(id); if (!a) return;
    a.status = status; if (status !== 'booked') scrub(a);
    B.commit();
  };
  B.setDur = function (id, dur) {
    var a = B.find(id);
    if (!a || !B.isFree(a.proId, a.date, a.start, dur, a.id)) return false;
    a.dur = dur; B.commit(); return true;
  };
  // Rede de segurança: nada com nome sobrevive à virada do dia.
  B.purge = function () {
    var t = B.today(), n = 0;
    B.appts().forEach(function (a) { if (a.date < t && (a.name || a.phone) && a.kind !== 'block') { scrub(a); n++; } });
    if (n) B.commit();
  };
  // Direito de eliminação: cancela os horários em aberto e apaga os dados.
  B.erase = function (ids) {
    B.appts().forEach(function (a) { if (ids.indexOf(a.id) >= 0) { if (a.status === 'booked') a.status = 'cancelled'; scrub(a); } });
    B.commit();
  };
  // Código do horário: sorteado, não derivado de nenhum dado da pessoa.
  var ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  function code() {
    var r = new Uint32Array(6), out = '';
    try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 6; i++) r[i] = Math.floor(Math.random() * 4294967296); }
    for (var j = 0; j < 6; j++) out += ALPHA[r[j] % ALPHA.length];
    return out;
  }
  // Texto da confirmação que vai para o WhatsApp do cliente. Fica aqui para o
  // servidor de envio usar exatamente o mesmo texto que a tela mostra.
  B.confirmText = function (a) {
    var s = a.serviceId && B.service(a.serviceId);
    return 'Olá, ' + (a.name || 'tudo bem') + '! Seu horário na ' + B.tenant.name + ' está confirmado: ' + (s ? s.name : 'atendimento') + ' com ' +
      B.pro(a.proId).name + ', ' + B.fmtDay(a.date, true).replace(/^Hoje, |^Amanhã, /, '') + ' às ' + B.fmtMin(a.start) + '. Código: ' + B.fmtCode(a.code) +
      '. Para remarcar ou cancelar, abra o site da barbearia' + (B.tenant.url ? ': ' + B.tenant.url : '.');
  };
  B.fmtCode = function (c) { return c ? c.slice(0, 3) + '-' + c.slice(3) : ''; };
  // Horários futuros a partir das referências guardadas no aparelho do cliente.
  B.upcomingFor = function (ids) {
    var t = B.today(), n = B.nowMin();
    return B.appts().filter(function (a) {
      return ids.indexOf(a.id) >= 0 && a.status === 'booked' && (a.date > t || (a.date === t && a.start + a.dur > n));
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start; });
  };

  /* ---------- dados de exemplo (só para a demonstração) ---------- */
  var NAMES = ['Bruno S.', 'Thiago R.', 'Lucas M.', 'Rafael C.', 'Pedro A.', 'João V.', 'Mateus F.', 'Gustavo L.', 'Felipe N.', 'Vítor P.', 'Daniel O.', 'Henrique B.'];
  function seed() {
    if (B.load(key(), null)) return;
    var x = 7; var rnd = function () { x = (x * 16807) % 2147483647; return x / 2147483647; };
    var list = [], k = B.today(), now = B.nowMin();
    for (var d = 0; d < 7; d++, k = B.addDays(k, 1)) {
      B.tenant.pros.forEach(function (p) {
        var svcs = B.servicesOf(p).filter(function (s) { return !s.plan; });
        B.periods(p, k).forEach(function (r) {
          var t = r[0];
          while (t < r[1]) {
            var s = svcs[Math.floor(rnd() * svcs.length)];
            if (rnd() < 0.42 - d * 0.04 && t + s.min <= r[1]) {
              var past = d === 0 && t + s.min <= now;
              list.push({
                id: 'seed' + list.length, proId: p.id, serviceId: s.id, date: k, start: t, dur: s.min,
                name: past ? '' : NAMES[Math.floor(rnd() * NAMES.length)], phone: '', demo: true,
                kind: rnd() < 0.2 && d === 0 ? 'walkin' : 'booking', status: past ? 'done' : 'booked'
              });
              t += s.min;
            } else t += 30;
          }
        });
      });
    }
    appts = list; B.commit();
  }
  B.resetDemo = function () { appts = null; mem[key()] = null; try { localStorage.removeItem(key()); } catch (e) {} delete mem[key()]; seed(); };

  B.setTenant(B.load('bs:tenant', (B.tenants[0] || {}).id));
})();
