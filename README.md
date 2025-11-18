# Omnipost - Multi-Platform Content Distribution System

A web-based platform enabling content creators to write once and publish to multiple platforms with intelligent content adaptation, AI-powered translation, and quality review workflows.

## Features

- **Multi-Platform Publishing**: Publish to Dev.to, Medium, Juejin, Zhihu, and more
- **Smart Content Adaptation**: AI-powered platform-specific content optimization
- **Translation Engine**: Dual-AI translation with quality review
- **Platform-Specific Markup**: Control content visibility per platform
- **Unified Dashboard**: Manage all your publications in one place

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Appwrite (Database, Auth, Storage)
- **Editor**: Tiptap
- **State Management**: Zustand
- **AI**: OpenAI GPT-4, Anthropic Claude

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Appwrite account (cloud or self-hosted)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd omnipost
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
omnipost/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── editor/           # Markdown editor
│   └── platform/         # Platform-specific components
├── lib/                   # Utility functions
│   ├── adapters/         # Platform adapters
│   ├── appwrite/         # Appwrite configuration
│   ├── ai/               # AI services
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript type definitions
└── store/                # Zustand state management
```

## Platform Support

| Platform | Status | Auth Method | Features |
|----------|--------|-------------|----------|
| Dev.to | ✅ Implemented | API Key | Full support |
| Medium | ✅ Implemented | OAuth2 | Draft creation |
| Juejin | 🚧 Planned | Cookie | Phase 2 |
| Zhihu | 🚧 Planned | Cookie | Phase 2 |

## Development Roadmap

- [x] Phase 1: Core Infrastructure
- [x] Phase 2: Editor & Content Management
- [ ] Phase 3: Platform Integration (In Progress)
- [ ] Phase 4: AI Content Adaptation
- [ ] Phase 5: Translation Service
- [ ] Phase 6: Dashboard & Monitoring
- [ ] Phase 7: Polish & Testing

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details
