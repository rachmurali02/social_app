#!/bin/bash

# Function to install nvm and Node.js
install_nvm() {
    echo "📦 Installing nvm (Node Version Manager)..."
    echo ""
    
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    echo ""
    echo "✅ nvm installed! Now setting up Node.js..."
    echo ""
    
    # Source nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    # Install Node.js 20 (LTS)
    echo "📦 Installing Node.js 20 (LTS)..."
    nvm install 20
    nvm use 20
    nvm alias default 20
    
    echo ""
    echo "✅ Node.js 20 installed!"
    echo ""
    echo "⚠️  IMPORTANT: Restart your terminal or run:"
    echo "   source ~/.bashrc  (or ~/.zshrc on macOS)"
    echo ""
    echo "Then verify with: node --version"
}

# Check Node.js version and install nvm if needed
MIN_NODE_VERSION="18.17.0"
CURRENT_NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')

if [ -z "$CURRENT_NODE_VERSION" ]; then
    echo "❌ Node.js is not installed!"
    echo ""
    install_nvm
    exit 1
fi

# Compare versions
if [ "$(printf '%s\n' "$MIN_NODE_VERSION" "$CURRENT_NODE_VERSION" | sort -V | head -n1)" != "$MIN_NODE_VERSION" ]; then
    echo "❌ Node.js version is too old!"
    echo "   Current: v$CURRENT_NODE_VERSION"
    echo "   Required: v$MIN_NODE_VERSION or higher"
    echo ""
    
    # Check if nvm is installed
    if [ -s "$HOME/.nvm/nvm.sh" ] || command -v nvm &> /dev/null; then
        echo "✅ nvm is already installed!"
        echo ""
        echo "Upgrading Node.js with nvm..."
        source "$HOME/.nvm/nvm.sh" 2>/dev/null || export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
        nvm alias default 20
        echo ""
        echo "✅ Node.js upgraded! Restart your terminal or run: source ~/.bashrc"
        exit 1
    else
        echo "⚠️  nvm is not installed. Installing nvm now..."
        install_nvm
        exit 1
    fi
else
    echo "✅ Node.js version is compatible!"
    echo "   Current: v$CURRENT_NODE_VERSION"
    echo "   Required: v$MIN_NODE_VERSION or higher"
    exit 0
fi
