# Variáveis
FRONTEND_DIR = ./client
BACKEND_DIR = ./backends

# Comandos principais
.PHONY: start
start: start-backend start-frontend

# Inicia o backend
.PHONY: start-backend
start-backend:
	cd $(BACKEND_DIR) && npm run start:dev

# Inicia o frontend
.PHONY: start-frontend
start-frontend:
	cd $(FRONTEND_DIR) && npm run dev

# Instala dependências
.PHONY: install
install:
	cd $(BACKEND_DIR) && npm install
	cd $(FRONTEND_DIR) && npm install

# Para desenvolvimento, inicia ambos em paralelo
.PHONY: dev
dev:
	make start-backend & make start-frontend

.PHONY: migrate
migrate:
	cd $(BACKEND_DIR) && npm run migration:run

.PHONY: migrate-create
migrate-create:
	cd $(BACKEND_DIR) && npm run migration:generate