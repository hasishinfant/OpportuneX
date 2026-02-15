#!/bin/bash

# OpportuneX SDK Generation Script
# Generates client SDKs for popular programming languages

set -e

echo "🔧 OpportuneX SDK Generator"
echo "=========================="

# Check if OpenAPI Generator is installed
if ! command -v openapi-generator-cli &> /dev/null; then
    echo "❌ OpenAPI Generator CLI not found"
    echo "📦 Installing OpenAPI Generator..."
    npm install -g @openapitools/openapi-generator-cli
fi

# Create output directory
SDK_DIR="./sdks"
mkdir -p "$SDK_DIR"

SPEC_FILE="./docs/api/third-party-api.yaml"

if [ ! -f "$SPEC_FILE" ]; then
    echo "❌ OpenAPI specification not found at $SPEC_FILE"
    exit 1
fi

echo "📄 Using specification: $SPEC_FILE"
echo ""

# Generate JavaScript/TypeScript SDK
echo "🟨 Generating JavaScript/TypeScript SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g typescript-axios \
    -o "$SDK_DIR/javascript" \
    --additional-properties=npmName=@opportunex/sdk,npmVersion=1.0.0,supportsES6=true

echo "✅ JavaScript/TypeScript SDK generated at $SDK_DIR/javascript"
echo ""

# Generate Python SDK
echo "🐍 Generating Python SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g python \
    -o "$SDK_DIR/python" \
    --additional-properties=packageName=opportunex,projectName=opportunex-sdk,packageVersion=1.0.0

echo "✅ Python SDK generated at $SDK_DIR/python"
echo ""

# Generate Go SDK
echo "🔵 Generating Go SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g go \
    -o "$SDK_DIR/go" \
    --additional-properties=packageName=opportunex

echo "✅ Go SDK generated at $SDK_DIR/go"
echo ""

# Generate Ruby SDK
echo "💎 Generating Ruby SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g ruby \
    -o "$SDK_DIR/ruby" \
    --additional-properties=gemName=opportunex,gemVersion=1.0.0

echo "✅ Ruby SDK generated at $SDK_DIR/ruby"
echo ""

# Generate Java SDK
echo "☕ Generating Java SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g java \
    -o "$SDK_DIR/java" \
    --additional-properties=groupId=com.opportunex,artifactId=opportunex-sdk,artifactVersion=1.0.0

echo "✅ Java SDK generated at $SDK_DIR/java"
echo ""

# Generate PHP SDK
echo "🐘 Generating PHP SDK..."
openapi-generator-cli generate \
    -i "$SPEC_FILE" \
    -g php \
    -o "$SDK_DIR/php" \
    --additional-properties=packageName=OpportuneX,invokerPackage=OpportuneX\\SDK

echo "✅ PHP SDK generated at $SDK_DIR/php"
echo ""

echo "🎉 All SDKs generated successfully!"
echo ""
echo "📦 SDK Locations:"
echo "  - JavaScript/TypeScript: $SDK_DIR/javascript"
echo "  - Python: $SDK_DIR/python"
echo "  - Go: $SDK_DIR/go"
echo "  - Ruby: $SDK_DIR/ruby"
echo "  - Java: $SDK_DIR/java"
echo "  - PHP: $SDK_DIR/php"
echo ""
echo "📚 Next steps:"
echo "  1. Review generated SDKs"
echo "  2. Add custom examples and documentation"
echo "  3. Publish to package registries (npm, PyPI, etc.)"
