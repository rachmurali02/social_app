# Node.js Upgrade Instructions

## The Problem
You're running Node.js v12.16.3, but Next.js 14 requires Node.js 18.17.0 or higher.

## Solution: Upgrade Node.js

### Option 1: Using nvm (Node Version Manager) - Recommended

1. **Install nvm** (if not already installed):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

2. **Restart your terminal** or run:
```bash
source ~/.bashrc
# or
source ~/.zshrc
```

3. **Install Node.js 18**:
```bash
nvm install 18
nvm use 18
```

4. **Verify installation**:
```bash
node --version
# Should show v18.x.x or higher
```

5. **Install dependencies and run**:
```bash
npm install
npm run dev
```

### Option 2: Using Homebrew (macOS)

```bash
brew install node@18
brew link node@18 --force
```

### Option 3: Download from nodejs.org

1. Visit https://nodejs.org/
2. Download Node.js 18 LTS
3. Install the package
4. Restart your terminal

## After Upgrading

Once Node.js 18+ is installed:

```bash
# Verify version
node --version

# Install dependencies
npm install

# Run development server
npm run dev
```

## Note for Vercel Deployment

Vercel automatically uses Node.js 18+, so you can deploy without upgrading locally. However, you'll need Node.js 18+ to test locally.
