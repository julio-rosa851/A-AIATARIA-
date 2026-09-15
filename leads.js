// leads.js - Açaí Prime - Captura de leads via QR Code
window.LeadsDB = {
  key: 'acai_leads',
  getAll(){ try{ return JSON.parse(localStorage.getItem(this.key)||'[]'); }catch(e){ return []; } },
  saveAll(list){ localStorage.setItem(this.key, JSON.stringify(list)); try{ window.dispatchEvent(new Event('storage')); }catch(e){} },
  add(lead){ const list=this.getAll(); lead.id=String(Date.now()); lead.createdAt=new Date().toISOString(); list.unshift(lead); this.saveAll(list); return lead; },
  remove(id){ const list=this.getAll().filter(l=>String(l.id)!==String(id)); this.saveAll(list); }
};

function renderLeads(){
  const listEl=document.getElementById('leadsList');
  const canvas=document.getElementById('qrCodeCanvas');
  if(!listEl && !canvas) return;
  const leads=window.LeadsDB.getAll();
  const baseUrl = location.origin + location.pathname.replace(/\/[^\/]*$/, '/') ;
  const cardapioUrl = baseUrl + 'cardapio.html?lead=1';
  if(canvas){
    if(window.QRious){
      try{ new QRious({element: canvas, value: cardapioUrl, size: 180, background: '#FFFFFF', foreground: '#7B1FA2', level: 'H'}); canvas.style.display=''; }catch(e){ console.warn(e); }
    } else {
      canvas.style.display='none';
      const wrap=document.getElementById('qrContainer');
      if(wrap && !document.getElementById('qrFallback')) {
        const div=document.createElement('div');
        div.id='qrFallback';
        div.innerHTML=`<div style="padding:14px;background:#fff;border-radius:12px;border:1px solid var(--border);word-break:break-all;font-size:12px;">${cardapioUrl}<br><a href="${cardapioUrl}" target="_blank" class="btn-primary" style="margin-top:10px;display:inline-flex;">Abrir Cardápio</a></div>`;
        wrap.appendChild(div);
      }
    }
    const p=canvas && canvas.parentElement ? canvas.parentElement.querySelector('p') : null;
    if(p) p.textContent = cardapioUrl;
    // also allow manual lead capture via prompt
    if(!document.getElementById('btnAddLead')){
      const btn=document.createElement('button');
      btn.id='btnAddLead';
      btn.className='btn-secondary';
      btn.style.marginTop='12px';
      btn.innerHTML='<i class="fas fa-plus"></i> Adicionar Lead de Teste';
      btn.onclick=()=>{
        const nome=prompt('Nome do lead:');
        const tel=prompt('WhatsApp:');
        if(nome&&tel){ window.LeadsDB.add({nome, telefone: tel, origem: 'manual'}); renderLeads(); }
      };
      canvas.parentElement.appendChild(btn);
    }
  }
  if(listEl){
    if(leads.length===0){
      listEl.innerHTML = `<li style="padding:18px;text-align:center;color:var(--text-secondary);list-style:none;border:1px dashed var(--border);border-radius:12px;">Nenhum lead ainda. Compartilhe o QR do cardápio. Leads vindos do cardápio aparecerão aqui automaticamente.</li>`;
      return;
    }
    listEl.innerHTML = leads.map(l=>`
      <li style="display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:rgba(255,255,255,0.96);">
        <div>
          <strong>${escapeHtml(l.nome||'Lead')}</strong> <span style="color:var(--text-secondary);font-size:12px;">${escapeHtml(l.telefone||'')}</span><br>
          <small style="color:var(--text-secondary);">${new Date(l.createdAt).toLocaleString('pt-BR')} • ${escapeHtml(l.origem||'QR Cardápio')}</small>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="window.open('https://wa.me/${(l.telefone||'').replace(/\\D/g,'')}','_blank')" style="background:rgba(0,200,83,0.12);border:none;color:#0A7A3A;padding:8px 10px;border-radius:8px;cursor:pointer;"><i class="fab fa-whatsapp"></i></button>
          <button onclick="window.LeadsDB.remove('${l.id}');renderLeads();" style="background:none;border:none;color:var(--error);cursor:pointer;padding:8px;"><i class="fas fa-trash"></i></button>
        </div>
      </li>
    `).join('');
  }
}

// captura automática quando cardapio é aberto com ?lead=1
(function(){
  try{
    const params=new URLSearchParams(location.search);
    if(params.get('lead')==='1'){
      // se for cardapio.html, tenta capturar nome/telefone se preencher checkout
      // para dashboard, apenas garante render
    }
  }catch(e){}
})();

window.renderLeads = renderLeads;
window.capturarLead = function(nome, telefone){
  if(!nome || !telefone) return null;
  const lead=window.LeadsDB.add({nome, telefone, origem: 'cardapio'});
  try{ if(window.acaiChannel) window.acaiChannel.postMessage({type:'new_lead'}); }catch(e){}
  renderLeads();
  return lead;
};

// se houver checkout nome/telefone no cardapio, captura lead automaticamente ao finalizar
document.addEventListener('DOMContentLoaded', renderLeads);
window.addEventListener('storage', (e)=>{ if(e.key==='acai_leads') renderLeads(); });
try{
  const ch=new BroadcastChannel('acai_prime_orders');
  ch.onmessage=(ev)=>{ if(ev.data && ev.data.type==='new_lead') renderLeads(); };
}catch(e){}
