.PHONY: help build up down restart logs clean scan test

help:
	@echo "LAN Media Center - Makefile Commands"
	@echo ""
	@echo "  make build    - Build Docker images"
	@echo "  make up       - Start containers"
	@echo "  make down     - Stop containers"
	@echo "  make restart  - Restart containers"
	@echo "  make logs     - Show container logs"
	@echo "  make clean    - Remove containers and volumes"
	@echo "  make scan     - Trigger media scan"
	@echo "  make test     - Test API health endpoint"

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

clean:
	docker compose down -v
	docker compose rm -f

scan:
	@echo "Triggering media scan..."
	@curl -X POST http://localhost:1699/api/scan

test:
	@echo "Testing API health..."
	@curl -f http://localhost:1699/api/health && echo " ✓ API is healthy"

