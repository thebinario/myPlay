import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
function settings() { fireEvent.click(screen.getByRole('button',{name:/configurações/i})); }
describe('Configurações, bibliotecas e primeiro acesso simulados',()=>{
  it('navega para configurações e troca preferências',()=>{
    render(<App/>); settings();
    expect(screen.getByRole('heading',{name:'Configurações'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Reprodução'}));
    fireEvent.change(screen.getByLabelText('Velocidade padrão'),{target:{value:'1.5'}});
    expect(screen.getByLabelText('Velocidade padrão')).toHaveValue('1.5');
    fireEvent.click(screen.getByRole('button',{name:'Bibliotecas'}));
    fireEvent.click(screen.getByRole('button',{name:'Reprodução'}));
    expect(screen.getByLabelText('Velocidade padrão')).toHaveValue('1.5');
  });
  it('adiciona, desconecta e retira uma origem sem excluir arquivos',()=>{
    render(<App/>);settings();
    fireEvent.click(screen.getByRole('button',{name:'Adicionar pasta'}));
    fireEvent.change(screen.getByLabelText('Caminho de demonstração'),{target:{value:'F:\\Estudos'}});
    fireEvent.click(screen.getByRole('button',{name:'Adicionar',exact:true}));
    expect(screen.getByText('F:\\Estudos')).toBeInTheDocument();
    const card=screen.getByText('F:\\Estudos').closest('article')!;
    fireEvent.click(within(card as HTMLElement).getByRole('button',{name:'Simular desconexão'}));
    expect(card).toHaveTextContent('Desconectada');
    fireEvent.click(within(card as HTMLElement).getByRole('button',{name:'Retirar'}));
    expect(screen.getByText(/Nenhum arquivo físico será excluído/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Confirmar retirada'}));
    expect(screen.queryByText('F:\\Estudos')).not.toBeInTheDocument();
  });
  it('percorre o primeiro acesso e retorna à biblioteca',()=>{
    render(<App/>);settings();
    fireEvent.click(screen.getByRole('button',{name:/Abrir primeiro acesso/}));
    fireEvent.click(screen.getByRole('button',{name:'Começar'}));
    fireEvent.change(screen.getByLabelText('Caminho de demonstração'),{target:{value:'G:\\Cursos'}});
    fireEvent.click(screen.getByRole('button',{name:'Adicionar pasta'}));
    fireEvent.click(screen.getByRole('button',{name:'Analisar biblioteca'}));
    fireEvent.click(screen.getByRole('button',{name:'Ir à biblioteca'}));
    fireEvent.click(screen.getByRole('button',{name:'Entrar na Biblioteca'}));
    expect(screen.getByRole('heading',{name:'Biblioteca',level:1})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/configurações/i}));
    expect(screen.getByText('G:\\Cursos')).toBeInTheDocument();
  });
  it('permite configurar depois',()=>{
    render(<App/>);settings();
    fireEvent.click(screen.getByRole('button',{name:/Abrir primeiro acesso/}));
    fireEvent.click(screen.getByRole('button',{name:'Configurar depois'}));
    expect(screen.getByRole('heading',{name:'Biblioteca',level:1})).toBeInTheDocument();
  });
});
