# MyPlay - Player de Vídeo Portátil

Este projeto é um player de vídeo portátil projetado para rodar diretamente de dispositivos externos (pendrives, HDs externos, etc). Ele escaneia automaticamente os vídeos do dispositivo onde está rodando, permitindo uma experiência plug-and-play.

## 🎯 Objetivo

O MyPlay foi criado para ser uma solução portátil e prática para reprodução de vídeos:
- Roda diretamente de pendrives ou HDs externos
- Escaneia automaticamente os vídeos do dispositivo
- Mantém o histórico de reprodução
- Interface moderna e intuitiva
- Não depende de diretórios fixos do computador

## 🏗️ Arquitetura do Projeto

### Frontend (Client)

O frontend é uma aplicação React moderna construída com TypeScript, utilizando Material-UI para a interface do usuário.

#### Tecnologias Principais
- **React 19**
- **TypeScript**
- **Material-UI v7**
- **Video.js** para reprodução de vídeo
- **HLS.js** para streaming HLS
- **Axios** para requisições HTTP

#### Estrutura do Frontend
```
client/
├── src/           # Código fonte da aplicação
├── public/        # Arquivos públicos
└── package.json   # Dependências e scripts
```

### Backend (Video Server)

O backend é construído com NestJS, um framework Node.js progressivo que utiliza TypeScript.

#### Tecnologias Principais
- **NestJS 11**
- **TypeScript**
- **TypeORM** para persistência de dados
- **PostgreSQL** como banco de dados
- **Node Media Server** para streaming
- **FFmpeg** para processamento de vídeo

#### Estrutura do Backend
```
backend/
├── src/           # Código fonte do servidor
├── test/          # Arquivos de teste
├── dist/          # Código compilado
├── uploads/       # Diretório para uploads
├── public/        # Arquivos públicos
└── video-server/  # Configurações do servidor de vídeo
```

## 🚀 Como Executar

### Pré-requisitos

#### Banco de Dados
O projeto utiliza PostgreSQL como banco de dados. A aplicação criará automaticamente:
- Role `myPlay` com senha `myPlay`
- Banco de dados `video_server`
- Todas as tabelas necessárias

Você só precisa ter:
1. PostgreSQL instalado e rodando
2. Usuário `postgres` com senha `postgres` (ou atualizar as credenciais em `backend/src/config/database.config.ts`)

A URL de conexão final será:
```
postgresql://myPlay:myPlay@localhost:5432/video_server
```

### Instalação em um Dispositivo Externo

1. Copie todo o projeto para seu dispositivo externo (pendrive, HD externo, etc)

2. Instale as dependências do frontend:
```bash
cd client
npm install
```

3. Instale as dependências do backend:
```bash
cd backend
npm install
```

4. Execute o projeto:
```bash
# No diretório backend
npm run start:dev

# Em outro terminal, no diretório client
npm start
```

O sistema irá:
1. Detectar automaticamente o diretório raiz do dispositivo onde está rodando
2. Escanear recursivamente todos os vídeos encontrados
3. Criar um banco de dados local para armazenar o histórico de reprodução

## 📝 Funcionalidades

- Escaneamento automático de vídeos do dispositivo
- Reprodução de vídeos com controles avançados
- Histórico de reprodução (última posição assistida)
- Interface responsiva
- Suporte a múltiplos formatos de vídeo
- Lista de reprodução dinâmica
- Navegação entre vídeos (anterior/próximo)

## 🎮 Como Usar

1. Copie o projeto para seu dispositivo externo
2. Execute o backend e frontend
3. O sistema automaticamente:
   - Detecta o diretório raiz do dispositivo
   - Escaneia todos os vídeos compatíveis
   - Cria um banco de dados local para o histórico
   - Exibe a lista de vídeos encontrados

## 📁 Formatos Suportados

- MP4 (.mp4)
- AVI (.avi)
- MKV (.mkv)
- MOV (.mov)
- WMV (.wmv)

## 🛠️ Scripts Disponíveis

### Frontend
- `npm start`: Inicia o servidor de desenvolvimento
- `npm build`: Compila o projeto para produção
- `npm test`: Executa os testes

### Backend
- `npm run start:dev`: Inicia o servidor em modo desenvolvimento
- `npm run start:prod`: Inicia o servidor em modo produção
- `npm run build`: Compila o projeto

## 🔧 Configuração

O sistema é projetado para ser plug-and-play, não necessitando de configurações específicas de diretório. Ele automaticamente:
1. Detecta o dispositivo onde está rodando
2. Escaneia os vídeos disponíveis
3. Cria um banco de dados local para o histórico

## 📱 Responsividade

A interface se adapta automaticamente a diferentes tamanhos de tela:
- **Desktop**: Layout lado a lado (player + lista)
- **Tablet**: Layout ajustável
- **Mobile**: Layout empilhado

## 📚 Documentação Adicional

A API do backend possui documentação Swagger disponível em `/api-docs` quando o servidor está em execução.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença UNLICENSED. Veja o arquivo `LICENSE` para mais detalhes. 