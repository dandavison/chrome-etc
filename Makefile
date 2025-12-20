# Chrome Extension Build System

# Default target: build the extension
.PHONY: build
build: ## Build the TypeScript files to JavaScript
	@echo "🔨 Building extension..."
	npm run build
	@echo "✅ Build complete!"
	@echo ""
	@echo "📦 Extension built in: dist/"
	@echo ""
	@echo "To load in Chrome:"
	@echo "  1. Open chrome://extensions"
	@echo "  2. Enable 'Developer mode' (top right)"
	@echo "  3. Click 'Load unpacked'"
	@echo "  4. Select the 'dist' folder from this project"
	@echo ""
	@echo "To reload after changes:"
	@echo "  1. Run 'make build' again"
	@echo "  2. Click the refresh icon in chrome://extensions"

.PHONY: clean
clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/background/*.js dist/background/*.map
	rm -rf dist/content/*.js dist/content/*.map
	@echo "✅ Clean complete!"

.PHONY: dev
dev: ## Build and watch for changes
	@echo "👁️  Building and watching for changes..."
	@echo "Note: You'll need to manually refresh the extension in Chrome after changes"
	npx tsc --watch

.PHONY: test
test: ## Run all tests
	@echo "🧪 Running tests..."
	npm run test:comment-unit
	npm run test:mermaid-unit

.PHONY: test-integration
test-integration: ## Run integration tests (opens browser)
	@echo "🌐 Running integration tests..."
	npm run test:comment-editor

.PHONY: install
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

.PHONY: help
help: ## Show this help message
	@echo "Chrome Extension Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Default target
.DEFAULT_GOAL := build