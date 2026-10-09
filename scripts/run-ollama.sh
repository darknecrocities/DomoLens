#!/usr/bin/env bash
# ==============================================================================
# DomoLens - Ollama Local LLM Runner & Health Check
# ==============================================================================

set -e

OLLAMA_PORT="11434"
OLLAMA_HOST="http://127.0.0.1:${OLLAMA_PORT}"
RECOMMENDED_MODEL="llama3.2:latest"

echo "🔍 Checking Ollama setup for DomoLens AI Director..."

# 1. Locate Ollama executable
OLLAMA_BIN=""
if command -v ollama >/dev/null 2>&1; then
  OLLAMA_BIN="$(command -v ollama)"
elif [ -f "/usr/local/bin/ollama" ]; then
  OLLAMA_BIN="/usr/local/bin/ollama"
elif [ -f "/opt/homebrew/bin/ollama" ]; then
  OLLAMA_BIN="/opt/homebrew/bin/ollama"
elif [ -f "$HOME/.local/bin/ollama" ]; then
  OLLAMA_BIN="$HOME/.local/bin/ollama"
fi

if [ -z "$OLLAMA_BIN" ]; then
  echo ""
  echo "❌ Ollama is not installed on your system."
  echo "👉 Please download and install Ollama from: https://ollama.com/download"
  echo "   or on macOS via Homebrew: brew install ollama"
  echo ""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening Ollama download page in your browser..."
    open "https://ollama.com/download" || true
  fi
  exit 1
fi

echo "✓ Found Ollama binary at: $OLLAMA_BIN"

# 2. Check if Ollama server is already running
if curl -s "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
  echo "✓ Ollama server is already running at ${OLLAMA_HOST}"
else
  echo "🚀 Starting Ollama background server..."
  nohup "$OLLAMA_BIN" serve >/dev/null 2>&1 &
  sleep 2
  
  # Wait for it to become ready
  MAX_TRIES=10
  TRIES=0
  while ! curl -s "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
      echo "⚠️ Ollama server did not respond within 10 seconds."
      echo "Please run: ollama serve manually in a separate terminal."
      exit 1
    fi
    sleep 1
  done
  echo "✓ Ollama server successfully started and responding at ${OLLAMA_HOST}"
fi

# 3. Check available models
echo "📋 Inspecting installed models..."
TAGS_JSON=$(curl -s "${OLLAMA_HOST}/api/tags")

if echo "$TAGS_JSON" | grep -q "\"name\""; then
  echo "✓ Installed models found:"
  echo "$TAGS_JSON" | grep -o '"name":"[^"]*"' | sed 's/"name":"/  • /g' | sed 's/"//g'
else
  echo "⚠️ No models found in Ollama. Pulling recommended fast model (${RECOMMENDED_MODEL})..."
  "$OLLAMA_BIN" pull "$RECOMMENDED_MODEL"
fi

echo ""
echo "🎉 DomoLens AI Director is ready to use Ollama at ${OLLAMA_HOST}!"
