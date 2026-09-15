// mesas.js - Açaí Prime - Pedidos de Mesa (dine-in) - v2 com grid como cardápio + complementos
window.MesasDB = {
  keyMesas: 'acai_mesas',
  keyPedidos: 'acai_pedidos_mesa',
  getMesas(){ try{ return JSON.parse(localStorage.getItem(this.keyMesas)||'[]'); }catch(e){ return []; } },
  saveMesas(m){ localStorage.setItem(this.keyMesas, JSON.stringify(m)); },
  getPedidos(){ try{ return JSON.parse(localStorage.getItem(this.keyPedidos)||'[]'); }catch(e){ return []; } },
  savePedidos(p){ localStorage.setItem(this.keyPedidos, JSON.stringify(p)); },
  criarPedido({mesa, clienteNome, itens, observacoes, formaPagamento}){
    const subtotal = itens.reduce((s,i)=> s + (i.preco*(i.quantidade||1)), 0);
    const taxaServico = parseFloat((subtotal * 0.10).toFixed(2));
    const total = parseFloat((subtotal + taxaServico).toFixed(2));
    const pedido = {
      id: Date.now(),
      codigo: 'MESA-' + String(Date.now()).slice(-6),
      mesa: String(mesa).trim(),
      clienteNome: clienteNome||'Cliente Mesa',
      itens: itens.map(i=>({...i})),
      subtotal, taxaServico, total,
      formaPagamento: formaPagamento||'pix',
      observacoes: observacoes||'',
      status: 'aberto',
      createdAt: new Date().toISOString(),
      tipo: 'mesa'
    };
    const lista=this.getPedidos(); lista.unshift(pedido); this.savePedidos(lista);
    try{
      const raw=localStorage.getItem('acaiPrimeData');
      const data= raw? JSON.parse(raw): {pedidos:[]};
      if(!data.pedidos) data.pedidos=[];
      data.pedidos.unshift({...pedido, tipo: 'mesa', total_com_frete: total, data: pedido.createdAt});
      localStorage.setItem('acaiPrimeData', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('acai:new_order', {detail: pedido}));
      try{ new BroadcastChannel('acai_prime_orders').postMessage({type:'new_order', pedido}); }catch(e){}
    }catch(e){}
    if(window.notificationManager){ window.notificationManager.add('new_order', `Mesa ${mesa} - ${pedido.codigo} R$ ${total.toFixed(2).replace('.',',')}`); window.updateNotificationBadge&&window.updateNotificationBadge(); }
    return pedido;
  }
};

function getProdutosMesa(){
  // tenta AppState, depois localStorage, depois fallback cardapio
  let produtos = [];
  if(window.AppState && Array.isArray(window.AppState.produtos) && window.AppState.produtos.length>0){
    produtos = window.AppState.produtos.filter(p=>p.disponivel!==false);
  }
  if(produtos.length===0){
    try{
      const raw=localStorage.getItem('acaiPrimeData');
      if(raw){
        const data=JSON.parse(raw);
        if(data.produtos && data.produtos.length>0) produtos = data.produtos.filter(p=>p.disponivel!==false);
      }
    }catch(e){}
  }
  if(produtos.length===0){
    // fallback igual ao cardapio.js - garante que nunca fica vazio
    produtos = [
      { id: 1, nome: 'Açaí Tradicional 300ml', descricao: 'Açaí puro cremoso', preco: 18.90, categoria: 'acai', disponivel: true },
      { id: 2, nome: 'Açaí Tradicional 500ml', descricao: 'Açaí 500ml', preco: 24.90, categoria: 'acai', disponivel: true },
      { id: 3, nome: 'Açaí Premium 700ml', descricao: '700ml + 4 complementos', preco: 32.90, categoria: 'acai', disponivel: true },
      { id: 4, nome: 'Tigela Power Nutella', descricao: '500ml + Nutella, leite em pó, paçoca', preco: 29.90, categoria: 'tigelas', disponivel: true },
      { id: 5, nome: 'Tigela Tropical', descricao: 'Banana, granola, mel', preco: 27.90, categoria: 'tigelas', disponivel: true },
      { id: 6, nome: 'Barca Família 1L', descricao: 'Barca 1L + 6 complementos', preco: 54.90, categoria: 'combos', disponivel: true },
      { id: 7, nome: 'Leite em Pó', descricao: 'Complemento', preco: 3.50, categoria: 'complementos', disponivel: true },
      { id: 8, nome: 'Paçoca', descricao: 'Complemento', preco: 3.50, categoria: 'complementos', disponivel: true },
      { id: 9, nome: 'Granola', descricao: 'Complemento', preco: 3.50, categoria: 'complementos', disponivel: true },
      { id: 10, nome: 'Nutella', descricao: 'Complemento premium', preco: 5.00, categoria: 'complementos', disponivel: true },
      { id: 11, nome: 'Morango', descricao: 'Complemento fruta', preco: 4.00, categoria: 'complementos', disponivel: true },
      { id: 12, nome: 'Água 500ml', descricao: 'Água mineral', preco: 4.00, categoria: 'bebidas', disponivel: true },
      { id: 13, nome: 'Refrigerante Lata', descricao: '350ml', preco: 6.00, categoria: 'bebidas', disponivel: true }
    ];
  }
  return produtos;
}

window.criarPedidoMesaUI = function(){
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  if(!modal||!title||!body) return;
  title.textContent = 'Novo Pedido de Mesa';
  const produtos = getProdutosMesa();
  const categorias = ['todos','acai','tigelas','complementos','bebidas','combos'];
  const catLabels = {todos:'Todos', acai:'Açaí', tigelas:'Tigelas', complementos:'Complementos', bebidas:'Bebidas', combos:'Barcas'};
  const catIcons = {todos:'th-large', acai:'ice-cream', tigelas:'bowl-rice', complementos:'plus-circle', bebidas:'glass-cheers', combos:'layer-group'};

  body.innerHTML = `
    <form id="formMesa" style="display:flex;flex-direction:column;gap:14px;max-height:75vh;overflow:hidden;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group" style="margin:0;"><label>Mesa *</label><input type="text" id="mesaNumero" placeholder="Ex: 05" required style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;"></div>
        <div class="form-group" style="margin:0;"><label>Cliente</label><input type="text" id="mesaCliente" placeholder="Nome (opcional)" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;"></div>
      </div>

      <div style="background:rgba(123,31,162,0.06);border:1px solid rgba(123,31,162,0.12);border-radius:12px;padding:10px;">
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;flex-wrap:nowrap;" id="mesaCatTabs">
          ${categorias.map(c=> `<button type="button" data-cat="${c}" onclick="filtrarMesaCat('${c}')" class="cat-tab ${c==='todos'?'active':''}" style="padding:8px 14px;border-radius:999px;font-size:12px;white-space:nowrap;border:1px solid var(--border);background:${c==='todos'?'var(--primary)':'#fff'};color:${c==='todos'?'#fff':'var(--text-secondary)'};cursor:pointer;"><i class="fas fa-${catIcons[c]}"></i> ${catLabels[c]}</button>`).join('')}
        </div>
        <div id="mesaProdutosGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;max-height:260px;overflow-y:auto;padding:6px 2px;"></div>
      </div>

      <div class="form-group" style="margin:0;">
        <label>Itens selecionados</label>
        <div id="mesaItens" style="display:flex;flex-direction:column;gap:8px;min-height:44px;max-height:140px;overflow-y:auto;padding:6px;background:#fff;border:1px solid var(--border);border-radius:10px;"></div>
      </div>

      <div class="form-group" style="margin:0;"><label>Observações</label><textarea id="mesaObs" rows="2" placeholder="Ex: sem leite em pó, extra Nutella" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;"></textarea></div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
        <div class="form-group" style="margin:0;"><label>Pagamento</label><select id="mesaPagamento" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:#fff;"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Crédito</option><option value="cartao_debito">Débito</option></select></div>
        <div style="background:#fff;border:1px solid rgba(123,31,162,0.12);border-radius:12px;padding:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Subtotal</span><strong id="mesaSubtotal">R$ 0,00</strong></div><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Taxa serviço 10% (imposto)</span><strong id="mesaTaxa">R$ 0,00</strong></div><div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px;border-top:1px solid var(--border);padding-top:6px;"><span>Total</span><strong id="mesaTotal" style="color:var(--primary);">R$ 0,00</strong></div></div>
      </div>
      <div style="background:rgba(123,31,162,0.06);border:1px solid rgba(123,31,162,0.12);border-radius:12px;padding:12px;">
        <label style="font-size:12px;font-weight:700;color:var(--primary);display:block;margin-bottom:8px;"><i class="fas fa-share-alt"></i> Finalização — como enviar?</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;"><input type="radio" name="mesaDestino" value="sistema" checked> <i class="fas fa-print"></i> Sistema / Imprimir</label>
          <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;"><input type="radio" name="mesaDestino" value="whatsapp"> <i class="fab fa-whatsapp"></i> WhatsApp</label>
          <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;"><input type="radio" name="mesaDestino" value="ambos"> <i class="fas fa-check-double"></i> Ambos</label>
        </div>
        <small style="color:var(--text-secondary);font-size:11px;display:block;margin-top:6px;">Igual ao cardápio: cálculo (subtotal + taxa) já incluso. Escolha o destino.</small>
      </div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:14px;"><i class="fas fa-utensils"></i> Finalizar Pedido Mesa <span id="mesaPreviewNum">--</span></button>
    </form>
  `;

  window._mesaItens = [];
  window._mesaFiltro = 'todos';
  const grid = document.getElementById('mesaProdutosGrid');

  function getIcon(cat){
    const m={acai:'ice-cream', tigelas:'bowl-rice', complementos:'plus-circle', bebidas:'glass-cheers', combos:'layer-group'};
    return m[cat]||'ice-cream';
  }
  function renderProdutosMesa(){
    const filtro = window._mesaFiltro;
    const lista = filtro==='todos' ? produtos : produtos.filter(p=>p.categoria===filtro);
    if(lista.length===0){
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);padding:20px;">Nenhum produto nesta categoria</p>';
      return;
    }
    grid.innerHTML = lista.map(p=> `
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.2s;">
        <div style="height:78px;background:linear-gradient(135deg, #F3E8FF 0%, #EDE7F6 100%);display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--primary);">
          <i class="fas fa-${getIcon(p.categoria)}"></i>
        </div>
        <div style="padding:10px;display:flex;flex-direction:column;gap:6px;flex:1;">
          <span style="font-size:10px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">${p.categoria}</span>
          <strong style="font-size:12px;line-height:1.2;">${p.nome}</strong>
          <span style="font-size:11px;color:var(--text-secondary);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.descricao||''}</span>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid var(--border);">
            <strong style="color:var(--primary);font-size:13px;">R$ ${p.preco.toFixed(2).replace('.',',')}</strong>
            <button type="button" onclick="addItemMesaById(${p.id})" style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-plus" style="font-size:12px;"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.filtrarMesaCat = function(cat){
    window._mesaFiltro = cat;
    document.querySelectorAll('#mesaCatTabs .cat-tab').forEach(b=>{
      const isActive = b.dataset.cat===cat;
      b.style.background = isActive ? 'var(--primary)' : '#fff';
      b.style.color = isActive ? '#fff' : 'var(--text-secondary)';
    });
    renderProdutosMesa();
  };

  window.addItemMesaById = function(pid){
    const prod=produtos.find(p=>String(p.id)===String(pid));
    if(!prod) return;
    const exist=window._mesaItens.find(i=>String(i.produtoId)===String(pid));
    if(exist) exist.quantidade+=1; else window._mesaItens.push({produtoId: prod.id, nome: prod.nome, preco: prod.preco, quantidade: 1});
    renderMesaItens();
  };
  // compat antiga
  window.addItemMesa = function(){
    const sel=document.getElementById('mesaAddProduto');
    if(sel) { const pid=parseInt(sel.value); if(pid) window.addItemMesaById(pid); }
  };

  window.renderMesaItens = function(){
    const wrap=document.getElementById('mesaItens');
    if(!wrap) return;
    if(window._mesaItens.length===0) wrap.innerHTML='<p style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px;">Nenhum item. Clique em + nos produtos acima.</p>';
    else wrap.innerHTML=window._mesaItens.map((it,idx)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#F8F5FF;border:1px solid rgba(123,31,162,0.12);border-radius:10px;"><span style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="background:var(--primary);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;">${it.quantidade}</span> ${it.nome}</span><span style="display:flex;align-items:center;gap:6px;"><button type="button" onclick="window._mesaItens[${idx}].quantidade=Math.max(1,window._mesaItens[${idx}].quantidade-1);renderMesaItens();" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">−</button><strong style="font-size:12px;min-width:54px;text-align:right;">R$ ${(it.preco*it.quantidade).toFixed(2).replace('.',',')}</strong><button type="button" onclick="window._mesaItens[${idx}].quantidade+=1;renderMesaItens();" style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;border:none;cursor:pointer;">+</button><button type="button" onclick="window._mesaItens.splice(${idx},1);renderMesaItens();" style="background:none;border:none;color:var(--error);cursor:pointer;margin-left:4px;"><i class="fas fa-trash" style="font-size:12px;"></i></button></span></div>`).join('');
    const sub=window._mesaItens.reduce((s,i)=>s+i.preco*i.quantidade,0);
    const taxa=sub*0.10; const tot=sub+taxa;
    const elS=document.getElementById('mesaSubtotal'); if(elS) elS.textContent='R$ '+sub.toFixed(2).replace('.',',');
    const elT=document.getElementById('mesaTaxa'); if(elT) elT.textContent='R$ '+taxa.toFixed(2).replace('.',',');
    const elTot=document.getElementById('mesaTotal'); if(elTot) elTot.textContent='R$ '+tot.toFixed(2).replace('.',',');
  };

  // atualiza preview mesa
  document.getElementById('mesaNumero')?.addEventListener('input', e=>{
    const v=e.target.value.trim()||'--';
    const el=document.getElementById('mesaPreviewNum'); if(el) el.textContent=v;
  });

  renderProdutosMesa();
  renderMesaItens();

  document.getElementById('formMesa').addEventListener('submit', (e)=>{
    e.preventDefault();
    if(window._mesaItens.length===0){ showToast('Adicione ao menos um item','error'); return; }
    const mesa=document.getElementById('mesaNumero').value.trim();
    if(!mesa){ showToast('Informe a mesa','error'); document.getElementById('mesaNumero').focus(); return; }
    const destino = document.querySelector('input[name="mesaDestino"]:checked')?.value || 'sistema';
    const pedido=window.MesasDB.criarPedido({mesa, clienteNome: document.getElementById('mesaCliente').value.trim(), itens: window._mesaItens, observacoes: document.getElementById('mesaObs').value.trim(), formaPagamento: document.getElementById('mesaPagamento').value});
    closeModal();
    showToast(`Pedido Mesa ${mesa} criado! Total R$ ${pedido.total.toFixed(2).replace('.',',')}`,'success');
    if(typeof renderPedidos==='function') renderPedidos();
    if(typeof renderDashboard==='function') renderDashboard();
    // Finalização igual cardápio: whatsapp e/ou sistema
    const enviarWhats = destino==='whatsapp' || destino==='ambos';
    const enviarSistema = destino==='sistema' || destino==='ambos';
    if(enviarWhats){
      let phone='5524992552754';
      try{ const raw=localStorage.getItem('acaiPrimeData'); if(raw){ const d=JSON.parse(raw); const n=d.whatsapp?.number?.replace(/\D/g,'')||d.settings?.companyPhone?.replace(/\D/g,''); if(n&&n.length>=10) phone=n; } }catch(e){}
      let msg=`*Pedido Mesa ${mesa} - ${pedido.codigo}*%0A`;
      msg+=`Cliente: ${pedido.clienteNome}%0A`;
      pedido.itens.forEach(i=>{ msg+=`• ${i.quantidade}x ${i.nome} - R$ ${(i.preco*i.quantidade).toFixed(2).replace('.',',')}%0A`; });
      msg+=`%0ASubtotal: R$ ${pedido.subtotal.toFixed(2).replace('.',',')}%0A`;
      msg+=`Taxa 10%: R$ ${pedido.taxaServico.toFixed(2).replace('.',',')}%0A`;
      msg+=`*Total: R$ ${pedido.total.toFixed(2).replace('.',',')}*`;
      if(pedido.observacoes) msg+=`%0AObs: ${pedido.observacoes}`;
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }
    if(enviarSistema && window.imprimirPedido) window.imprimirPedido(pedido);
  });
  document.getElementById('modalOverlay')?.classList.remove('hidden');
};
