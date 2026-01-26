# OpportuneX Development Makefile

.PHONY: help install dev build start test lint type-check clean docker-dev docker-prod

# Default target
help:
	@echo "Available commands:"
	@echo "  install      - Install dependencies"
	@echo "  dev          - Start development server"
	@echo "  build        - Build for production"
	@echo "  start        - Start production server"
	@echo "  test         - Run tests"
	@echo "  lint         - Run ESLint"
	@echo "  type-check   - Run TypeScript type checking"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-dev   - Start development services with Docker"
	@echo "  docker-prod  - Start production services with Docker"
	@echo "  docker-stop  - Stop Docker services"
	@echo "  docker-clean - Clean Docker volumes and images"

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Start production server
start:
	npm run start

# Run tests (placeholder for now)
test:
	@echo "Tests will be implemented in subsequent phases"

# Run ESLint
lint:
	npm run lint

# Run TypeScript type checking
type-check:
	npm run type-check

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf out

# Start development services with Docker
docker-dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development services started:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis: localhost:6379"
	@echo "  Elasticsearch: localhost:9200"
	@echo "  Kibana: localhost:5601"

# Start production services with Docker
docker-prod:
	docker-compose up -d --build

# Stop Docker services
docker-stop:
	docker-compose -f docker-compose.dev.yml down
	docker-compose down

# Clean Docker volumes and images
docker-clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose down -v
	docker system prune -f

# Setup development environment
setup-dev: install docker-dev
	@echo "Development environment setup complete!"
	@echo "Run 'make dev' to start the Next.js development server"

# Full development workflow
dev-full: setup-dev dev

# Production deployment
deploy: build docker-prod
	@echo "Production deployment complete!"