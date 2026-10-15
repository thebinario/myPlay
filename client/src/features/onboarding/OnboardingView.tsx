import React, { useState } from 'react';
import { BookOpen, FolderPlus, HardDrive, CheckCircle2 } from 'lucide-react';
import type { LibrarySource } from '../settings/mockSettings';
interface Props { onFinish: (sources: LibrarySource[]) => void; onCancel: () => void }
const action: React.CSSProperties={background:'#302D50',border:'1px solid #65569B',color:'#F8FAFC',padding:'11px 16px',borderRadius:9,cursor:'pointer'};
export function OnboardingView({onFinish,onCancel}:Props) {
  const [step,setStep]=useState(0);
  const [path,setPath]=useState('');
  const [paths,setPaths]=useState<string[]>([]);
  const [scenario,setScenario]=useState<'normal'|'empty'|'offline'|'denied'>('normal');
  const [progress,setProgress]=useState(25);
  const [paused,setPaused]=useState(false);
  const [error,setError]=useState('');
  const add=()=>{const value=path.trim();if(value&&!paths.some(p=>p.toLowerCase()===value.toLowerCase()))setPaths(p=>[...p,value]);setPath('');};
  const start=()=>{setStep(2);setPaused(false);setProgress(scenario==='empty'?100:25);setError(scenario==='offline'?'Unidade desconectada.':scenario==='denied'?'Permissão de leitura negada.':'');};
  const finish=()=>onFinish(paths.map((p,i)=>({id:'onboarding-'+Date.now()+'-'+i,path:p,itemCount:scenario==='normal'?Math.floor(progress/10):0,status:scenario==='offline'?'disconnected':'connected'})));
  return <main style={{maxWidth:690,width:'100%',margin:'36px auto',padding:24,display:'grid',gap:24}}>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}><strong style={{color:'#C4B5FD',display:'flex',alignItems:'center',gap:8}}><BookOpen size={22}/> MIDOTECA</strong><button type="button" style={action} onClick={onCancel}>Sair</button></header>
    <div aria-label="Etapas do primeiro acesso" style={{display:'flex',gap:6}}>{['Boas-vindas','Biblioteca','Descoberta','Concluído'].map((label,i)=><div key={label} style={{flex:1}}><div style={{height:4,borderRadius:4,background:i<=step?'#A594FF':'#334155'}}/><span style={{fontSize:11,color:i===step?'#E9D5FF':'#94A3B8'}}>{label}</span></div>)}</div>
    {step===0&&<section style={{background:'#141A28',padding:32,borderRadius:14,display:'grid',gap:18,textAlign:'center',justifyItems:'center'}}><BookOpen size={44} color="#A594FF"/><h1>Bem-vindo à Midoteca</h1><p style={{color:'#94A3B8'}}>Seus cursos, vídeos e documentos em um só lugar. Os arquivos originais permanecem intactos.</p><button type="button" style={action} onClick={()=>setStep(1)}>Começar</button><button type="button" style={action} onClick={()=>onFinish([])}>Configurar depois</button></section>}
    {step===1&&<section style={{display:'grid',gap:16}}><h1 style={{fontSize:24}}>Onde estão seus arquivos?</h1><p style={{color:'#94A3B8'}}>Escolha pastas simuladas, incluindo HDs externos.</p>
      <label style={{display:'grid',gap:8}}>Caminho de demonstração<input value={path} onChange={e=>setPath(e.target.value)} placeholder="Ex.: D:\\Cursos" style={{padding:12,background:'#192332',border:'1px solid #475569',color:'white',borderRadius:8}}/></label>
      <button type="button" style={action} disabled={!path.trim()} onClick={add}><FolderPlus size={15} style={{verticalAlign:'middle',marginRight:8}}/>Adicionar pasta</button>
      {paths.map(p=><div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:10,background:'#192332',borderRadius:8}}><HardDrive size={18}/><span style={{flex:1,overflowWrap:'anywhere'}}>{p}</span><button type="button" aria-label={'Remover '+p} style={action} onClick={()=>setPaths(x=>x.filter(v=>v!==p))}>×</button></div>)}
      <fieldset style={{display:'grid',gap:8,border:'1px solid #334155',padding:16,borderRadius:10}}><legend>Simular condição da origem</legend>{([{id:'normal',label:'Conteúdos encontrados'},{id:'empty',label:'Pasta vazia'},{id:'offline',label:'HD desconectado'},{id:'denied',label:'Sem permissão'}] as const).map(s=><label key={s.id}><input type="radio" name="onboarding-scenario" checked={scenario===s.id} onChange={()=>setScenario(s.id)}/> {s.label}</label>)}</fieldset>
      <button type="button" style={action} disabled={!paths.length} onClick={start}>Analisar biblioteca</button>
    </section>}
    {step===2&&<section style={{display:'grid',gap:16}}><h1 style={{fontSize:24}}>Preparando sua biblioteca</h1>
      {error?<div role="alert" style={{background:'#302632',padding:18,borderRadius:10}}>{error}<div style={{marginTop:12,display:'flex',gap:10}}><button type="button" style={action} onClick={()=>{setError('');setScenario('normal');setProgress(25);}}>Tentar novamente</button><button type="button" style={action} onClick={()=>setStep(1)}>Escolher outra pasta</button></div></div>:
      scenario==='empty'?<div role="status" style={{background:'#192332',padding:20,borderRadius:10}}>Nenhum conteúdo compatível encontrado.<div style={{marginTop:12}}><button type="button" style={action} onClick={()=>setStep(3)}>Continuar sem conteúdos</button></div></div>:
      <><div style={{background:'#192332',padding:18,borderRadius:10,display:'grid',gap:12}}><p role="status">{paused?'Descoberta pausada':progress===100?'Descoberta concluída':'Analisando arquivos'} · {progress}%</p><progress value={progress} max={100} style={{width:'100%',accentColor:'#A594FF'}}/><p style={{fontSize:13,color:'#94A3B8'}}>Conteúdos encontrados podem aparecer antes de finalizar a análise.</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{progress<100&&<><button type="button" style={action} disabled={paused} onClick={()=>setProgress(x=>Math.min(100,x+25))}>Avançar simulação</button><button type="button" style={action} onClick={()=>setPaused(x=>!x)}>{paused?'Retomar':'Pausar'}</button></>}<button type="button" style={action} onClick={()=>setStep(3)}>Ir à biblioteca</button></div></>}
    </section>}
    {step===3&&<section style={{display:'grid',gap:18,justifyItems:'center',textAlign:'center',background:'#141A28',padding:28,borderRadius:12}}><CheckCircle2 size={42} color="#85BC9E"/><h1>Tudo pronto para começar</h1><p style={{color:'#94A3B8'}}>A biblioteca pode ser explorada enquanto o processamento complementar acontece.</p><button type="button" style={action} onClick={finish}>Entrar na Biblioteca</button></section>}
    <p style={{fontSize:12,color:'#64748B'}}>Protótipo com dados fictícios. Nenhuma pasta do computador é acessada.</p>
  </main>;
}
