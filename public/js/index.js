// index.js — Lógica específica da página inicial (Dashboard)
(function () {
  'use strict';

  function brl(n) {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // =========================================================
  // PRODUTOS EM DESTAQUE (mesma ordem dos cards no HTML)
  // =========================================================
  var PRODUTOS = [
    {
      nome: 'Boi Ralado Tradicional',
      preco: 34.90,
      img: '../img/produtos/boi-ralado.jpg',
      estoque: 50,
      categoria: 'Prato Principal',
      descricao: 'O clássico da casa! Carne bovina desfiada e refogada no ponto certo, servida com arroz branco soltinho, feijão tropeiro, farofa crocante e vinagrete fresco.'
    },
    {
      nome: 'Hambúrguer Boi Ralado',
      preco: 32.00,
      img: '../img/produtos/hamburguer.jpg',
      estoque: 40,
      categoria: 'Lanches',
      descricao: 'Blend especial de 180g preparado na chapa quente, servido no pão brioche artesanal. Acompanha queijo cheddar, bacon crocante, cebola caramelizada e molho secreto.'
    },
    {
      nome: 'Pastel de Boi Ralado',
      preco: 14.00,
      img: '../img/produtos/pastel.jpg',
      estoque: 80,
      categoria: 'Salgados',
      descricao: 'Pastel grande e crocante, recheado com boi ralado temperado, queijo mussarela derretido e um toque de orégano. Frito na hora.'
    },
    {
      nome: 'Picanha na Chapa',
      preco: 68.90,
      img: '../img/produtos/picanha.jpg',
      estoque: 25,
      categoria: 'Prato Principal',
      descricao: 'Picanha nobre fatiada, grelhada na chapa quente. Acompanha arroz, farofa da casa, vinagrete e batata frita crocante.'
    },
    {
      nome: 'Prato Executivo da Casa',
      preco: 29.90,
      img: '../img/produtos/executivo.jpg',
      estoque: 60,
      categoria: 'Executivo',
      descricao: 'Arroz, feijão, bife grelhado, batata frita e salada fresca. A refeição completa do dia a dia com sabor caseiro.'
    },
    {
      nome: 'Batata Rústica',
      preco: 24.90,
      img: '../img/produtos/batata.jpg',
      estoque: 90,
      categoria: 'Acompanhamento',
      descricao: 'Batatas com casca em gomos grossos, temperadas com páprica, alho e ervas finas. Acompanha maionese verde.'
    },
    {
      nome: 'Suco de Laranja',
      preco: 9.00,
      img: '../img/produtos/suco.jpg',
      estoque: 100,
      categoria: 'Bebida',
      descricao: 'Suco de laranja 100% natural, feito na hora, sem açúcar adicionado, sem conservantes. 400ml gelado.'
    },
    {
      nome: 'Mousse de Maracujá',
      preco: 12.00,
      img: '../img/produtos/mousse.webp',
      estoque: 45,
      categoria: 'Sobremesa',
      descricao: 'Mousse cremosa com polpa de maracujá natural, leite condensado e creme de leite. Doce e azedinho na medida.'
    }
  ];

  // =========================================================
  // MODAL DE DETALHES DO PRODUTO
  // =========================================================
  function abrirDetalheProduto(produto) {
    var ov = document.createElement('div');
    ov.className = 'br-ov';
    ov.innerHTML =
      '<div class="produto-detalhe">' +
        '<div class="produto-detalhe__img">' +
          '<img src="' + produto.img + '" alt="' + produto.nome + '" onerror="this.style.display=\'none\'">' +
          '<div class="produto-detalhe__close" id="fecharDetalhe"><i class="fa-solid fa-xmark"></i></div>' +
        '</div>' +
        '<div class="produto-detalhe__body">' +
          '<span class="produto-detalhe__tag">' + produto.categoria + '</span>' +
          '<h3>' + produto.nome + '</h3>' +
          '<p class="produto-detalhe__desc">' + produto.descricao + '</p>' +
          '<div class="produto-detalhe__info">' +
            '<div class="produto-detalhe__info-item">' +
              '<div class="produto-detalhe__info-label">Preço Unitário</div>' +
              '<div class="produto-detalhe__info-valor">' + brl(produto.preco) + '</div>' +
            '</div>' +
            '<div class="produto-detalhe__info-item">' +
              '<div class="produto-detalhe__info-label">Estoque</div>' +
              '<div class="produto-detalhe__info-valor">' + produto.estoque + ' un</div>' +
            '</div>' +
          '</div>' +
          '<a href="pedido.html" class="produto-detalhe__btn">' +
            '<i class="fa-solid fa-cart-plus"></i> Adicionar ao Pedido' +
          '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    function fechar() { ov.remove(); }

    ov.querySelector('#fecharDetalhe').addEventListener('click', fechar);
    ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); }
    });
  }

  // =========================================================
  // CLIQUE NOS CARDS DO CARDÁPIO
  // =========================================================
  var pgrid = document.getElementById('pgridCardapio');
  if (pgrid) {
    pgrid.addEventListener('click', function (e) {
      var card = e.target.closest('.pcard');
      if (!card) return;
      var idx = parseInt(card.dataset.produto, 10);
      if (isNaN(idx) || !PRODUTOS[idx]) return;
      abrirDetalheProduto(PRODUTOS[idx]);
    });
  }

  // =========================================================
  // DASHBOARD DINÂMICO — ATUALIZA CARDS, GRÁFICOS E PEDIDOS
  // =========================================================
  function atualizarDashboard() {
    // Dados de exemplo para os cards (podem ser substituídos por chamadas de API)
    var dadosExemplo = {
      vendasHoje: 3482.50,
      pedidos: 42,
      delivery: 18,
      clientes: 60
    };

    // Tenta carregar dados reais do localStorage (pedidos salvos)
    var pedidos = [];
    try { pedidos = JSON.parse(localStorage.getItem('br_pedidos')) || []; } catch (e) {}
    var entregas = [];
    try { entregas = JSON.parse(localStorage.getItem('br_entregas')) || []; } catch (e) {}

    // Calcula totais reais
    var totalVendas = dadosExemplo.vendasHoje;
    var totalPedidos = dadosExemplo.pedidos;
    var totalDelivery = dadosExemplo.delivery;
    var totalClientes = dadosExemplo.clientes;

    // Soma os pedidos e entregas salvos
    pedidos.forEach(function (p) {
      totalVendas += parseFloat(String(p.total).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      totalPedidos++;
    });
    entregas.forEach(function (e) {
      totalVendas += parseFloat(String(e.total).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      totalDelivery++;
    });

    // Atualiza os cards
    var elVendas = document.getElementById('statVendas');
    if (elVendas) elVendas.textContent = brl(totalVendas);
    var elPedidos = document.getElementById('statPedidos');
    if (elPedidos) elPedidos.textContent = totalPedidos;
    var elDelivery = document.getElementById('statDelivery');
    if (elDelivery) elDelivery.textContent = totalDelivery;
    var elClientes = document.getElementById('statClientes');
    if (elClientes) elClientes.textContent = totalClientes;

    // Atualiza gráfico "Mais vendidos" com dados dinâmicos
    var maisVendidos = [
      { nome: 'Boi Ralado', qtd: 132 },
      { nome: 'Hambúrguer', qtd: 108 },
      { nome: 'Picanha', qtd: 84 },
      { nome: 'Pastel', qtd: 70 },
      { nome: 'Batata Rústica', qtd: 54 },
      { nome: 'Mousse', qtd: 37 }
    ];
    var maxQtd = maisVendidos[0].qtd;
    var chartHtml = maisVendidos.map(function (item) {
      var w = Math.round((item.qtd / maxQtd) * 100);
      return '<div class="hb"><span>' + item.nome + '</span><div><i style="--w:' + w + '%"></i></div><b>' + item.qtd + '</b></div>';
    }).join('');
    var chartContainer = document.getElementById('maisVendidosChart');
    if (chartContainer) chartContainer.innerHTML = chartHtml;

    // Atualiza gráfico "Faturamento — 7 dias"
    var faturamento = [
      { dia: 'Qui', valor: 2940 },
      { dia: 'Sex', valor: 3210 },
      { dia: 'Sáb', valor: 4480 },
      { dia: 'Dom', valor: 4120 },
      { dia: 'Seg', valor: 2680 },
      { dia: 'Ter', valor: 2350 },
      { dia: 'Qua', valor: 3482 }
    ];
    var maxFat = 4480;
    var fatHtml = faturamento.map(function (item) {
      var h = Math.round((item.valor / maxFat) * 100);
      return '<div title="' + brl(item.valor) + '"><i style="--h:' + h + '%"></i>' + item.dia + '</div>';
    }).join('');
    var fatContainer = document.getElementById('faturamentoChart');
    if (fatContainer) fatContainer.innerHTML = fatHtml;

    // Atualiza "Últimos Pedidos"
    var tbody = document.getElementById('ultimosPedidosTbody');
    if (tbody) {
      var ultimos = pedidos.slice(0, 5);
      if (!ultimos.length) {
        // Dados de exemplo se não houver pedidos salvos
        ultimos = [
          { numero: '#1104', cliente: 'Maria Oliveira', mesa: 'Mesa 03', tipo: 'Balcão', total: 84.90, status: 'Pago', hora: '13:22' },
          { numero: '#1103', cliente: 'Carlos Souza', mesa: '—', tipo: 'Delivery', total: 62.40, status: 'Pago', hora: '13:08' },
          { numero: '#1102', cliente: 'Ana Silva', mesa: 'Mesa 07', tipo: 'Balcão', total: 128.60, status: 'Pago', hora: '12:54' },
          { numero: '#1101', cliente: 'Bruno Costa', mesa: '—', tipo: 'Delivery', total: 45.80, status: 'Pago', hora: '12:40' },
          { numero: '#1100', cliente: 'Fernanda Lima', mesa: 'Mesa 01', tipo: 'Balcão', total: 96.30, status: 'Pago', hora: '12:22' }
        ];
      }
      tbody.innerHTML = ultimos.map(function (p) {
        return '<tr>' +
          '<td><strong>' + (p.numero || '#000') + '</strong></td>' +
          '<td>' + (p.cliente || 'Cliente') + '</td>' +
          '<td>' + (p.mesa || '—') + '</td>' +
          '<td>' + (p.tipo || 'Balcão') + '</td>' +
          '<td class="num">' + brl(p.total) + '</td>' +
          '<td><span class="pill pill--paid">' + (p.status || 'Pago') + '</span></td>' +
          '<td>' + (p.hora || '12:00') + '</td>' +
        '</tr>';
      }).join('');
    }
  }

  // Chama a atualização do dashboard ao carregar
  atualizarDashboard();

  // Atualiza o dashboard a cada 30 segundos (simulando tempo real)
  setInterval(atualizarDashboard, 30000);

})();