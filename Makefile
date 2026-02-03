.PHONY: dev build test deploy-local seed

dev:
	docker compose up --build

build:
	cd backend && npm install && npm run build
	cd frontend && npm install && npm run build

test:
	npm install
	npm test

deploy-local:
	docker compose up --build -d

seed:
	npx ts-node scripts/seed_demo_data.ts
