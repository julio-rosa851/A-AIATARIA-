// print.js - Impressão térmica 80mm Açaí Prime
window.imprimirPedido = function(pedido){
  const isMesa = pedido.tipo==='mesa' || pedido.mesa;
  const titulo = isMesa ? `MESA ${pedido.mesa} - ${pedido.codigo||pedido.codigo_pedido||pedido.id}` : `DELIVERY - ${pedido.codigo_pedido||pedido.codigo||pedido.id}`;
  const cliente = pedido.cliente_nome || pedido.clienteNome || 'Cliente';
  const telefone = pedido.cliente_telefone || pedido.clienteTelefone || '';
  const endereco = pedido.cliente_endereco || pedido.endereco || '';
  const itens = (pedido.itens||[]).map(i=> `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dashed #ccc;"><span>${i.quantidade}x ${i.nome}</span><span>R$ ${(i.preco*i.quantidade).toFixed(2).replace('.',',')}</span></div>`).join('');
  const subtotal = pedido.subtotal ?? pedido.total ?? 0;
  const frete = pedido.frete ?? 0;
  const imposto = pedido.imposto ?? pedido.taxaServico ?? 0;
  const total = pedido.total_com_frete ?? pedido.totalWithShipping ?? pedido.total ?? 0;
  const html = `
  <html><head><meta charset="utf-8"><title>Impressao</title><style>
  @media print { @page { size: 80mm auto; margin: 4mm; } body { width:80mm; } }
  body{ font-family: monospace, 'Courier New'; font-size:12px; color:#000; padding:8px; }
  h1{ font-size:16px; text-align:center; margin:0 0 6px; }
  .center{ text-align:center; }
  .line{ border-top:1px dashed #000; margin:8px 0; }
  .small{ font-size:11px; color:#333; }
  </style></head><body>
  <h1>ACAI PRIME</h1><div class="center small">Acaiteria Premium<br>${new Date(pedido.createdAt||pedido.created_at||pedido.data||Date.now()).toLocaleString('pt-BR')}<br>${titulo}</div>
  <div class="line"></div>
  <div><strong>Cliente:</strong> ${cliente} ${telefone? ' - '+telefone:''}</div>
  ${endereco? `<div><strong>Endereco:</strong> ${endereco}</div>`:''}
  ${pedido.observacoes? `<div><strong>Obs:</strong> ${pedido.observacoes}</div>`:''}
  <div><strong>Pagamento:</strong> ${pedido.formaPagamento||pedido.forma_pagamento||'pix'} | <strong>Entrega:</strong> ${pedido.tipo_entrega||pedido.tipo||'entrega'}</div>
  <div class="line"></div>
  <div><strong>ITENS</strong></div>${itens}
  <div class="line"></div>
  <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>R$ ${Number(subtotal).toFixed(2).replace('.',',')}</span></div>
  ${frete? `<div style="display:flex;justify-content:space-between;"><span>Frete</span><span>R$ ${Number(frete).toFixed(2).replace('.',',')}</span></div>`:''}
  ${imposto? `<div style="display:flex;justify-content:space-between;"><span>Taxa/Imposto</span><span>R$ ${Number(imposto).toFixed(2).replace('.',',')}</span></div>`:''}
  <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;border-top:1px solid #000;margin-top:6px;padding-top:6px;"><span>TOTAL</span><span>R$ ${Number(total).toFixed(2).replace('.',',')}</span></div>
  <div class="line"></div><div class="center small">Obrigado pela preferencia! Volte sempre! 💜</div>
  <script>window.onload=function(){ window.print(); setTimeout(()=>window.close(),600); }<\/script>
  </body></html>`;
  const w=window.open('', '_blank', 'width=340,height=600');
  if(!w){ showToast('Permita popups para imprimir','error'); return; }
  w.document.open(); w.document.write(html); w.document.close();
};
window.imprimirUltimoPedido = function(){
  try{
    const raw=localStorage.getItem('acaiPrimeData');
    const data=raw? JSON.parse(raw):{};
    const ultimo=(data.pedidos||[])[0];
    if(ultimo) window.imprimirPedido(ultimo); else showToast('Nenhum pedido para imprimir','error');
  }catch(e){ showToast('Erro ao buscar pedido','error'); }
};
