# LLM PR Reviewer Lite

A lightweight, AI-powered PR review system that automatically analyzes pull requests using LLMs and GitHub API.

## 🚀 Features

- Automated PR code review using OpenAI GPT models
- GitHub webhook integration for real-time PR analysis
- Support for multiple file types and programming languages
- Comprehensive code quality and security analysis
- Automated PR comment posting

## 📋 Prerequisites

- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key
- GitHub Webhook Secret

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# GitHub Configuration
GH_TOKEN=your_github_personal_access_token_here
WEBHOOK_SECRET=your_webhook_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables
3. Build the project:
```bash
npm run build
```

## 🚀 Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

## 🔧 GitHub Webhook Setup

1. Go to your GitHub repository settings
2. Navigate to Webhooks → Add webhook
3. Configure:
   - **Payload URL**: `http://your-server.com/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your `WEBHOOK_SECRET`
   - **Events**: Pull requests

## 📁 Project Structure

```
llm-pr-reviewer-lite/
├── src/
│   ├── index.ts          # Main server bootstrap
│   ├── github.ts         # GitHub API integration
│   ├── webhook.ts        # Webhook handling
│   ├── llm.ts           # LLM integration
│   ├── analyzePipeline.ts # Main analysis pipeline
│   └── postComment.ts    # PR comment posting
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - see LICENSE file for details.