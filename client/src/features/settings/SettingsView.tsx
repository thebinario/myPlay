import React, { useState } from 'react';
import { LibrarySourcesPanel } from './LibrarySourcesPanel';
import type { AppPreferences, LibrarySource } from './mockSettings';

type Section = 'libraries' | 'playback' | 'appearance' | 'processing' | 'about';
interface Props { sources: LibrarySource[]; onSourcesChange: (v: LibrarySource[]) => void; preferences: AppPreferences; onPreferencesChange: (v: AppPreferences) => void; onOpenOnboarding: () => void }
const sections: {id:Section;label:string}[] = [{id:'libraries',label:'Bibliotecas'},{id:'playback',label:'Reprodução'},{id:'appearance',label:'Aparência'},{id:'processing',label:'Processamento'},{id:'about',label:'Sobre'}];
const field: React.CSSProperties={background:'#192332',border:'1px solid #334155',padding:12,borderRadius:10,color:'#F8FAFC',maxWidth:330};
export function SettingsView({sources,onSourcesChange,preferences,onPreferencesChange,onOpenOnboarding}: Props) {
  const [section,setSection]=useState<Section>('libraries');
  const update = <K extends keyof AppPreferences>(key:K,value:AppPreferences[K]) => onPreferencesChange({...preferences,[key]:value});
  return <div style={{padding:'32px clamp(16px,4vw,40px)',maxWidth:1120,width:'100%',margin:'0 auto',display:'grid',gap:24}}>
    <header><h1 style={{fontSize:28}}>Configurações</h1><p style={{fontSize:14,color:'#94A3B8',marginTop:8}}>Preferências e bibliotecas em um só lugar.</p></header>
    <nav aria-label="Categorias de configurações" style={{display:'flex',flexWrap:'wrap',gap:8}}>{sections.map(s=><button key={s.id} type="button" aria-pressed={section===s.id} onClick={()=>setSection(s.id)} style={{...field,cursor:'pointer',background:section===s.id?'#302D50':'#192332',borderColor:section===s.id?'#A594FF':'#334155'}}>{s.label}</button>)}</nav>
    {section==='libraries' && <><LibrarySourcesPanel sources={sources} onChange={onSourcesChange}/><button type="button" onClick={onOpenOnboarding} style={{...field,cursor:'pointer',width:'fit-content'}}>Abrir primeiro acesso (demonstração)</button></>}
    {section==='playback' && <section style={{display:'grid',gap:18}}><h2 style={{fontSize:18}}>Preferências do player</h2>
      <label style={{display:'grid',gap:8}}>Velocidade padrão<select aria-label="Velocidade padrão" style={field} value={preferences.speed} onChange={e=>update('speed',e.target.value)}>{['0.75','1','1.25','1.5','2'].map(v=><option key={v} value={v}>{v}×</option>)}</select></label>
      <label style={{display:'grid',gap:8}}>Legendas preferidas<select aria-label="Legendas preferidas" style={field} value={preferences.subtitles} onChange={e=>update('subtitles',e.target.value)}><option value="pt-BR">Português (Brasil)</option><option value="en">Inglês</option><option value="off">Desativadas</option></select></label>
      <label><input type="checkbox" checked={preferences.resume} onChange={e=>update('resume',e.target.checked)}/> Retomar de onde parei</label>
      <label><input type="checkbox" checked={preferences.autoNext} onChange={e=>update('autoNext',e.target.checked)}/> Reproduzir próxima aula automaticamente</label>
    </section>}
    {section==='appearance' && <section style={{display:'grid',gap:18}}><h2 style={{fontSize:18}}>Interface e idioma</h2>
      <label style={{display:'grid',gap:8}}>Tema<select aria-label="Tema" style={field} value={preferences.theme} onChange={e=>update('theme',e.target.value)}><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Seguir sistema</option></select></label>
      <label style={{display:'grid',gap:8}}>Idioma<select aria-label="Idioma" style={field} value={preferences.language} onChange={e=>update('language',e.target.value)}><option value="pt-BR">Português (Brasil)</option><option value="en">English</option></select></label>
      <p style={{fontSize:12,color:'#94A3B8'}}>As opções são simuladas; o tema global permanece escuro nesta versão.</p>
    </section>}
    {section==='processing' && <section style={{display:'grid',gap:18}}><h2 style={{fontSize:18}}>Organização e processamento</h2>
      <label><input type="checkbox" checked={preferences.indexing} onChange={e=>update('indexing',e.target.checked)}/> Indexação ativada (simulação)</label>
      <label><input type="checkbox" checked={preferences.saveBattery} onChange={e=>update('saveBattery',e.target.checked)}/> Reduzir processamento ao usar bateria</label>
      <p style={{fontSize:13,color:'#94A3B8'}}>A reprodução sempre terá prioridade. Nenhuma tarefa real é iniciada aqui.</p>
    </section>}
    {section==='about' && <section style={{display:'grid',gap:12}}><h2 style={{fontSize:18}}>Midoteca</h2><p style={{color:'#94A3B8'}}>Demonstração de frontend com dados simulados. Seus arquivos originais são preservados.</p></section>}
    <p style={{fontSize:12,color:'#64748B'}}>Modo demonstração · Alterações mantidas apenas durante esta sessão do aplicativo.</p>
  </div>;
}
