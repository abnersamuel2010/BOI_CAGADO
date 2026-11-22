// cozinha.js — Boi Ralado Smart Kitchen (painel da cozinha)
// Lê /api/cozinha (SQLite) e muda status via POST /api/cozinha/:tipo/:id/avancar.
(function () {
  'use strict';

  var INTERVALO_MS = 4000;
  var META_PREPARO_MIN = 15;   // barra de progresso
  var ALERTA_NOVO_MIN = 10;    // novo esperando há mais que isso fica destacado
  var estado = { pedidos: [], perm: { acoes: [] }, assinatura: '', vistos: null, carregando: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function brl(n) { return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function hhmm(iso) { if (!iso) return '--:--'; var d = new Date(iso); return isNaN(d) ? '--:--' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function minutosDesde(iso) { if (!iso) return 0; var d = new Date(iso); return isNaN(d) ? 0 : Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000)); }
  function dois(n) { return n < 10 ? '0' + n : String(n); }

  function toast(msg, erro) {
    var t = document.createElement('div');
    t.className = 'kz-toast' + (erro ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function aviso(msg) { var a = $('kzAviso'); if (!msg) { a.hidden = true; return; } a.textContent = msg; a.hidden = false; }

  // ---------- relógio ----------
  function relogio() {
    var d = new Date();
    $('kzHora').textContent = dois(d.getHours()) + ':' + dois(d.getMinutes()) + ':' + dois(d.getSeconds());
    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    $('kzData').textContent = dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + '/' + d.getFullYear() + ' • ' + dias[d.getDay()];
  }

  // ---------- cartões ----------
  function podeAcao(a) { return estado.perm.acoes && estado.perm.acoes.indexOf(a) > -1; }
  function classeOrigem(o) { return o === 'Delivery' ? 'delivery' : (o === 'Comanda' ? 'comanda' : 'balcao'); }

  function botao(p) {
    var a = null, rotulo = '', cls = '', icone = '';
    if (p.etapa === 'novo')            { a = 'iniciar'; rotulo = 'Iniciar Preparação'; cls = 'novo'; icone = 'fa-play'; }
    else if (p.etapa === 'preparo')    { a = 'pronto'; rotulo = 'Marcar como Pronto'; cls = 'preparo'; icone = 'fa-check'; }
    else if (p.etapa === 'pronto' && p.tipo === 'entrega') { a = 'enviar_entrega'; rotulo = 'Enviar para Entrega'; cls = 'pronto'; icone = 'fa-motorcycle'; }
    else if (p.etapa === 'pronto')     { a = 'finalizar'; rotulo = p.origem === 'Comanda' ? 'Servir na Mesa' : 'Retirada no Balcão'; cls = 'pronto'; icone = 'fa-store'; }
    else if (p.etapa === 'em_entrega') { a = 'finalizar'; rotulo = 'Confirmar Entrega'; cls = 'rota'; icone = 'fa-flag-checkered'; }
    if (!a) return '';
    if (!podeAcao(a)) return '<div class="kz-espera"><i class="fa-regular fa-hourglass-half"></i> Aguardando outra etapa</div>';
    return '<button class="kz-btn kz-btn--' + cls + '" data-acao="' + a + '" data-tipo="' + p.tipo + '" data-id="' + p.id + '"><i class="fa-solid ' + icone + '"></i> ' + rotulo + '</button>';
  }

  function cartao(p) {
    var itens = p.itens.map(function (i) { return '<li>' + esc(i.nome) + ' (' + esc(i.qtd) + 'x)</li>'; }).join('');
    var desde = p.etapa === 'preparo' ? p.iniciado_em : (p.etapa === 'novo' ? p.criado_em : null);
    var cls = 'kz-card' + (p.etapa === 'em_entrega' ? ' kz-card--entrega-rota' : '');
    var html = '<article class="' + cls + '" data-key="' + p.tipo + p.id + '" data-etapa="' + p.etapa + '"' + (desde ? ' data-desde="' + esc(desde) + '"' : '') + '>';

    if (p.etapa === 'finalizado') {
      var rot = p.tipo === 'entrega' ? 'Entregue' : (p.origem === 'Comanda' ? 'Servido' : 'Retirado');
      return html.replace('<article', '<article') .replace('kz-card"', 'kz-card kz-click"') +
        '<div class="kz-card__head"><span class="kz-card__cod">#' + esc(p.codigo) + '</span><span class="kz-card__hora">• ' + hhmm(p.criado_em) + '</span><i class="fa-solid fa-circle-check ok" style="margin-left:auto;color:#4ADE80;font-size:22px"></i></div>' +
        '<ul class="kz-itens">' + itens + '</ul>' +
        '<div class="kz-final"><span>' + hhmm(p.finalizado_em) + ' • ' + rot + '</span></div>' +
        '<span data-detalhe="' + p.tipo + p.id + '" hidden></span></article>';
    }

    html += '<div class="kz-card__head"><span class="kz-card__cod">#' + esc(p.codigo) + '</span>' +
      '<span class="kz-card__hora"><i class="fa-regular fa-clock"></i> ' + hhmm(p.criado_em) + '</span>';
    if (p.etapa === 'preparo') html += '<span class="kz-badge kz-badge--tempo" data-tempo>00 min</span>';
    else if (p.etapa === 'em_entrega') html += '<span class="kz-badge kz-badge--delivery"><i class="fa-solid fa-motorcycle"></i> Em rota</span>';
    else html += '<span class="kz-badge kz-badge--' + classeOrigem(p.origem) + '">' + esc(p.origem) + '</span>';
    html += '</div>';

    if (p.cliente) html += '<div class="kz-card__cli"><i class="fa-regular fa-user"></i> ' + esc(p.cliente) + (p.mesa ? ' • Mesa ' + esc(p.mesa) : '') + '</div>';
    else if (p.mesa && p.mesa !== '—') html += '<div class="kz-card__cli">Mesa ' + esc(p.mesa) + '</div>';
    html += '<ul class="kz-itens">' + itens + '</ul>';
    if (p.observacao) html += '<div class="kz-obs"><i class="fa-solid fa-comment-dots"></i> ' + esc(p.observacao) + '</div>';
    if (p.tipo === 'entrega' && p.endereco) html += '<div class="kz-end"><i class="fa-solid fa-location-dot"></i> ' + esc(p.endereco) + '</div>';
    if (p.etapa === 'preparo') html += '<div class="kz-prog" data-prog><i></i></div>';

    html += '<div class="kz-acts">' + botao(p) + '<button class="kz-btn kz-btn--ver" data-ver="' + p.tipo + p.id + '" title="Detalhes"><i class="fa-solid fa-magnifying-glass"></i></button></div></article>';
    return html;
  }

  function desenhar() {
    var col = { novo: [], preparo: [], pronto: [], final: [] };
    var emEntrega = 0;
    estado.pedidos.forEach(function (p) {
      if (p.etapa === 'novo') col.novo.push(p);
      else if (p.etapa === 'preparo') col.preparo.push(p);
      else if (p.etapa === 'pronto') col.pronto.push(p);
      else if (p.etapa === 'em_entrega') { col.pronto.push(p); emEntrega++; }
      else if (p.etapa === 'finalizado') col.final.push(p);
    });
    var prontosReais = col.pronto.length - emEntrega;

    var vazios = { Novo: 'Nenhum pedido novo.', Preparo: 'Nada em preparo.', Pronto: 'Nenhum pedido pronto.', Final: 'Nada finalizado hoje.' };
    [['Novo', col.novo], ['Preparo', col.preparo], ['Pronto', col.pronto], ['Final', col.final]].forEach(function (par) {
      $('col' + par[0]).innerHTML = par[1].length ? par[1].map(cartao).join('') : '<div class="kz-vazio">' + vazios[par[0]] + '</div>';
      $('cnt' + par[0]).textContent = par[1].length;
    });
    $('stNovo').textContent = col.novo.length;
    $('stPreparo').textContent = col.preparo.length;
    $('stPronto').textContent = prontosReais;
    $('stEntrega').textContent = emEntrega;

    // animação para pedidos que acabaram de chegar
    var atuais = {};
    estado.pedidos.forEach(function (p) { atuais[p.tipo + p.id] = true; });
    if (estado.vistos) {
      Object.keys(atuais).forEach(function (k) {
        if (!estado.vistos[k]) { var el = document.querySelector('[data-key="' + k + '"]'); if (el) el.classList.add('kz-chegou'); }
      });
    }
    estado.vistos = atuais;
    tique();
  }

  // atualiza minutos, barras e alertas a cada segundo sem redesenhar
  function tique() {
    document.querySelectorAll('.kz-card[data-desde]').forEach(function (el) {
      var min = minutosDesde(el.dataset.desde);
      var etapa = el.dataset.etapa;
      if (etapa === 'preparo') {
        var b = el.querySelector('[data-tempo]'); if (b) { b.textContent = dois(min) + ' min'; b.classList.toggle('kz-over', min > META_PREPARO_MIN); }
        var pr = el.querySelector('[data-prog]');
        if (pr) { pr.querySelector('i').style.width = Math.min(100, (min / META_PREPARO_MIN) * 100) + '%'; pr.classList.toggle('kz-over', min > META_PREPARO_MIN); }
        el.classList.toggle('kz-atrasado', min > META_PREPARO_MIN + 5);
      } else if (etapa === 'novo') {
        el.classList.toggle('kz-atrasado', min >= ALERTA_NOVO_MIN);
      }
    });
  }

  // ---------- detalhes ----------
  function detalhe(chave) {
    var p = estado.pedidos.filter(function (x) { return x.tipo + x.id === chave; })[0];
    if (!p) return;
    var ov = document.createElement('div'); ov.className = 'kz-ov';
    var nomes = { novo: 'Novo', preparo: 'Em preparação', pronto: 'Pronto', em_entrega: 'Em entrega', finalizado: 'Finalizado' };
    var linhas = p.itens.map(function (i) { return '<tr><td>' + esc(i.nome) + '</td><td>' + esc(i.qtd) + 'x</td></tr>'; }).join('');
    var dl = '<dt>Origem</dt><dd>' + esc(p.origem) + '</dd><dt>Situação</dt><dd>' + nomes[p.etapa] + '</dd>' +
      (p.cliente ? '<dt>Cliente</dt><dd>' + esc(p.cliente) + '</dd>' : '') +
      (p.mesa ? '<dt>Mesa</dt><dd>' + esc(p.mesa) + '</dd>' : '') +
      (p.telefone ? '<dt>Telefone</dt><dd>' + esc(p.telefone) + '</dd>' : '') +
      (p.endereco ? '<dt>Endereço</dt><dd>' + esc(p.endereco) + '</dd>' : '') +
      (p.pagamento ? '<dt>Pagamento</dt><dd>' + esc(p.pagamento) + '</dd>' : '') +
      (p.observacao ? '<dt>Observação</dt><dd>' + esc(p.observacao) + '</dd>' : '') +
      '<dt>Recebido</dt><dd>' + hhmm(p.criado_em) + '</dd>' +
      (p.iniciado_em ? '<dt>Início preparo</dt><dd>' + hhmm(p.iniciado_em) + '</dd>' : '') +
      (p.pronto_em ? '<dt>Pronto</dt><dd>' + hhmm(p.pronto_em) + '</dd>' : '') +
      (p.saiu_em ? '<dt>Saiu p/ entrega</dt><dd>' + hhmm(p.saiu_em) + '</dd>' : '') +
      (p.finalizado_em ? '<dt>Concluído</dt><dd>' + hhmm(p.finalizado_em) + '</dd>' : '') +
      '<dt>Total</dt><dd><b>' + brl(p.total) + '</b></dd>';
    ov.innerHTML = '<div class="kz-modal"><h3>Pedido #' + esc(p.codigo) + '</h3><dl>' + dl + '</dl><table>' + linhas +
      '</table><button class="kz-btn kz-btn--preparo" style="width:100%" data-fechar>Fechar</button></div>';
    function fechar() { ov.remove(); document.removeEventListener('keydown', esc2); }
    function esc2(e) { if (e.key === 'Escape') fechar(); }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.hasAttribute('data-fechar')) fechar(); });
    document.addEventListener('keydown', esc2);
    document.body.appendChild(ov);
  }

  // ---------- rede ----------
  function carregar() {
    if (estado.carregando) return Promise.resolve();
    estado.carregando = true;
    return fetch('/api/cozinha').then(function (r) {
      return r.json().then(function (c) { return { status: r.status, corpo: c }; });
    }).then(function (r) {
      if (r.status === 401) { location.href = 'login.html'; return; }
      if (r.status === 403 || !r.corpo.ok) { aviso(r.corpo.erro || 'Sem acesso.'); return; }
      aviso('');
      var d = r.corpo.dados;
      estado.perm = d.permissoes;
      var ass = JSON.stringify(d.pedidos) + JSON.stringify(d.permissoes);
      if (ass !== estado.assinatura) { estado.assinatura = ass; estado.pedidos = d.pedidos; desenhar(); }
    }).catch(function () { aviso('Sem conexão com o servidor. Tentando novamente...'); })
      .then(function () { estado.carregando = false; });
  }

  function avancar(btn) {
    btn.disabled = true;
    fetch('/api/cozinha/' + btn.dataset.tipo + '/' + btn.dataset.id + '/avancar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: btn.dataset.acao })
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) toast(r.erro || 'Não foi possível atualizar.', true);
      estado.assinatura = '';
      return carregar();
    }).catch(function () { toast('Servidor offline.', true); btn.disabled = false; });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]');
    if (b) return avancar(b);
    var v = e.target.closest('[data-ver]');
    if (v) return detalhe(v.dataset.ver);
    var c = e.target.closest('.kz-card.kz-click');
    if (c) detalhe(c.dataset.key);
  });

  relogio();
  setInterval(function () { relogio(); tique(); }, 1000);
  carregar();
  setInterval(function () { if (!document.hidden) carregar(); }, INTERVALO_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) carregar(); });
})();
