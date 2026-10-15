import React, { useState } from 'react';
import { FolderPlus, HardDrive, Trash2, RefreshCw } from 'lucide-react';
import type { LibrarySource } from './mockSettings';

interface Props { sources: LibrarySource[]; onChange: (sources: LibrarySource[]) => void; }
const buttonStyle: React.CSSProperties = { background: '#252D42', color: '#E2E8F0', border: '1px solid #38445A', padding: '9px 12px', borderRadius: 8, cursor: 'pointer' };

export function LibrarySourcesPanel({ sources, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const add = () => {
    const name = path.trim();
    if (!name) return;
    if (sources.some(s => s.path.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setNotice('Esta pasta já está na biblioteca.'); return;
    }
    onChange([...sources, { id: 'mock-' + Date.now(), path: name, status: 'connected', itemCount: 0 }]);
    setPath(''); setAdding(false); setNotice('Pasta adicionada à simulação.');
  };
  return <section aria-label="Gerenciamento de bibliotecas" style={{ display:'grid', gap:16 }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
      <div><h2 style={{ fontSize:18 }}>Pastas da biblioteca</h2><p style={{color:'#94A3B8',fontSize:13,marginTop:6}}>Gerencie fontes sem alterar arquivos originais.</p></div>
      <button type="button" style={buttonStyle} onClick={() => setAdding(v=>!v)}><FolderPlus size={15} style={{verticalAlign:'middle',marginRight:6}}/>Adicionar pasta</button>
    </div>
    {adding && <div style={{background:'#1B2535',padding:16,borderRadius:10,display:'grid',gap:10}}>
      <label htmlFor="mock-source-path">Caminho de demonstração</label>
      <input id="mock-source-path" value={path} onChange={e=>setPath(e.target.value)} placeholder="Ex.: F:\\Biblioteca" style={{padding:10,background:'#0D111B',border:'1px solid #475569',color:'white',borderRadius:8}}/>
      <p style={{fontSize:12,color:'#94A3B8'}}>Demonstração: nenhuma pasta real será acessada.</p>
      <div style={{display:'flex',gap:8}}><button type="button" disabled={!path.trim()} style={buttonStyle} onClick={add}>Adicionar</button><button type="button" style={buttonStyle} onClick={()=>setAdding(false)}>Cancelar</button></div>
    </div>}
    {sources.length === 0 && <p style={{padding:24,color:'#94A3B8'}}>Nenhuma pasta cadastrada. Adicione sua primeira biblioteca.</p>}
    {sources.map(source => <article key={source.id} style={{background:'#192332',border:'1px solid #2C3849',padding:16,borderRadius:12,display:'grid',gap:12}}>
      <div style={{display:'flex',gap:12,alignItems:'center'}}><HardDrive color={source.status==='connected'?'#A594FF':'#EFC18D'} size={20}/><div style={{flex:1,minWidth:0}}><strong style={{overflowWrap:'anywhere'}}>{source.path}</strong><p style={{fontSize:12,color:'#94A3B8',marginTop:4}}>{source.itemCount} itens (simulação)</p></div><span style={{color:source.status==='connected'?'#A7D8BF':'#EFC18D',fontSize:12}}>{source.status==='connected'?'Disponível':'Desconectada'}</span></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" style={buttonStyle} onClick={()=>onChange(sources.map(s=>s.id===source.id?{...s,status:s.status==='connected'?'disconnected':'connected'}:s))}><RefreshCw size={14} style={{verticalAlign:'middle',marginRight:5}}/>{source.status==='connected'?'Simular desconexão':'Reconectar'}</button><button type="button" style={buttonStyle} onClick={()=>setRemoving(source.id)}><Trash2 size={14} style={{verticalAlign:'middle',marginRight:5}}/>Retirar</button></div>
      {removing===source.id && <div role="alert" style={{padding:12,borderRadius:8,background:'#302632',display:'grid',gap:10}}><p style={{fontSize:13}}>Retirar esta fonte do catálogo simulado? Nenhum arquivo físico será excluído.</p><div style={{display:'flex',gap:8}}><button type="button" style={buttonStyle} onClick={()=>{onChange(sources.filter(s=>s.id!==source.id));setRemoving(null);setNotice('Fonte retirada apenas do catálogo simulado.');}}>Confirmar retirada</button><button type="button" style={buttonStyle} onClick={()=>setRemoving(null)}>Cancelar</button></div></div>}
    </article>)}
    {notice && <p role="status" style={{color:'#C4B5FD',fontSize:13}}>{notice}</p>}
  </section>;
}
