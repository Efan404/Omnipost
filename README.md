# Omnipost - Multi-Platform Content Distribution System

A powerful web-based platform enabling content creators to write once and publish to multiple platforms with intelligent content adaptation, AI-powered translation, and quality review workflows.

![Status](https://img.shields.io/badge/status-beta-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Core Features
- 📝 **Rich Markdown Editor** - WYSIWYG and source mode with Tiptap
- 🚀 **Multi-Platform Publishing** - Publish to Dev.to, Medium, and more
- 🤖 **AI Content Adaptation** - Platform-specific optimization using GPT-4/Claude
- 🌐 **Dual-AI Translation** - High-quality translation with automated review
- 🎯 **Platform Markup** - Control content visibility per platform
- 📊 **Unified Dashboard** - Manage all publications in one place
- ⚙️ **Platform Configuration** - Secure credential management
- 🔔 **Toast Notifications** - Real-time feedback on actions

### Publishing Features
- ✅ Side-by-side content comparison
- ✅ Platform-specific variant editing
- ✅ Sync status tracking
- ✅ Batch publishing to multiple platforms
- ✅ Draft auto-save
- ✅ Publication history

## 🎨 Screenshots

### Dashboard
Manage all your articles with search, filters, and status tracking.

### Editor
Write with our powerful markdown editor featuring WYSIWYG mode, platform markup, and auto-save.

### Publishing Preview
Compare original and platform-optimized content side-by-side before publishing.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Appwrite (Database, Auth, Storage)
- **Editor**: Tiptap (WYSIWYG markdown editor)
- **State Management**: Zustand with Immer
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Diff Viewer**: react-diff-viewer-continued

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Appwrite account ([cloud.appwrite.io](https://cloud.appwrite.io) or self-hosted)
- OpenAI API key (for content optimization and translation)
- Anthropic API key (optional, for translation review)
- Platform API keys (Dev.to, Medium, etc.)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd omnipost
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here

# AI Services
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  # Optional

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

4. **Setup Appwrite Database**

Run the database setup script to create all collections and indexes:

```bash
npx tsx scripts/setup-database.ts
```

This will create:
- `articles` - Article storage
- `translations` - Translation records
- `publications` - Publication status tracking
- `platform_configs` - User platform credentials
- `user_preferences` - User settings

5. **Start the development server**

```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 User Guide

### 1. Authentication

**Register**: Create your account at `/register`
- Enter your name, email, and password
- Password must be at least 8 characters

**Login**: Access your account at `/login`
- Use email and password to login
- Sessions persist across browser restarts

### 2. Configure Platform Credentials

Go to **Settings** → **Platform Credentials**

#### Dev.to Setup
1. Visit [dev.to/settings/extensions](https://dev.to/settings/extensions)
2. Generate an API key
3. Paste into Omnipost settings
4. Click "Validate" to test
5. Click "Save" to store

#### Medium Setup
1. Visit [medium.com/me/settings/security](https://medium.com/me/settings/security)
2. Generate an integration token
3. Paste into Omnipost settings
4. Click "Validate" to test
5. Click "Save" to store

### 3. Create an Article

1. Click **"New Article"** from dashboard
2. Enter article title
3. Write content in the editor
4. Add tags (optional)
5. Content auto-saves every 30 seconds

### 4. Use Platform Markup

Control which content appears on which platforms:

```markdown
## Introduction
This section appears on all platforms.

[[platforms: dev.to, medium]]
This section only appears on Dev.to and Medium.
Great for platform-specific deep dives!
[[/platforms]]

[[exclude: medium]]
This code example won't appear on Medium
(because Medium has limited code block support).
```python
def complex_example():
    pass
```
[[/exclude]]

## Conclusion
Back to all platforms.
```

See [docs/PLATFORM_MARKUP.md](./docs/PLATFORM_MARKUP.md) for complete syntax guide.

### 5. Publish Your Article

**Step 1: Select Platforms**
1. Click **"Publish"** from editor
2. Choose target platforms (Dev.to, Medium, etc.)

**Step 2: Generate Variants**
1. Click **"Generate Platform Variants"** (uses AI)
   - AI optimizes content for each platform's audience
   - Dev.to: Technical depth, code examples
   - Medium: Narrative style, fewer code blocks
2. Or click **"Skip AI & Preview"** (uses original content)

**Step 3: Review & Edit**
1. View side-by-side comparison
2. See highlighted differences
3. Edit any platform variant directly
4. Check/uncheck platforms to publish

**Step 4: Publish**
1. Click **"Publish to X Platform(s)"**
2. Wait for confirmation
3. View published URLs in dashboard

### 6. Translate Your Article (Optional)

Translation feature uses dual-AI workflow:

1. **Translator AI** (GPT-4) translates content
2. **Reviewer AI** (Claude) checks quality
3. Quality scores calculated:
   - Accuracy (40%)
   - Fluency (30%)
   - Terminology (30%)
4. Auto-approves if score ≥ 0.9
5. Otherwise, flags for manual review

## 🏗️ Project Structure

```
omnipost/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/                # Login page
│   │   └── register/             # Registration page
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/            # Article listing
│   │   ├── editor/[id]/          # Article editor
│   │   ├── publish/[id]/         # Publishing page
│   │   └── settings/             # Platform configuration
│   ├── api/                      # API routes
│   │   ├── translate/            # Translation endpoint
│   │   ├── publish/              # Publishing endpoint
│   │   └── content-process/      # Content optimization
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                   # React components
│   ├── article/                  # Article-related components
│   │   └── article-card.tsx      # Article card display
│   ├── editor/                   # Editor components
│   │   └── markdown-editor.tsx   # Tiptap editor
│   ├── publish/                  # Publishing components
│   │   └── platform-preview-modal.tsx  # Diff viewer modal
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       └── ...
│
├── lib/                          # Core libraries
│   ├── adapters/                 # Platform adapters
│   │   ├── base.ts               # Abstract adapter class
│   │   ├── devto.ts              # Dev.to integration
│   │   ├── medium.ts             # Medium integration
│   │   └── index.ts              # Adapter registry
│   ├── ai/                       # AI services
│   │   └── content-processor.ts  # Content optimization
│   ├── appwrite/                 # Appwrite integration
│   │   ├── config.ts             # Client setup
│   │   ├── auth.ts               # Authentication service
│   │   └── database.ts           # Database service
│   ├── parser/                   # Content parsers
│   │   └── platform-markup.ts    # Platform markup parser
│   └── utils.ts                  # Utility functions
│
├── store/                        # State management
│   ├── auth-store.ts             # Authentication state
│   └── article-store.ts          # Article state
│
├── types/                        # TypeScript definitions
│   └── index.ts                  # All type definitions
│
├── scripts/                      # Utility scripts
│   └── setup-database.ts         # Database setup
│
└── docs/                         # Documentation
    └── PLATFORM_MARKUP.md        # Platform markup guide
```

## 🔌 Platform Support

| Platform | Status | Auth Method | Publish | Update | Notes |
|----------|--------|-------------|---------|--------|-------|
| **Dev.to** | ✅ Implemented | API Key | ✅ Direct | ✅ Yes | Full support |
| **Medium** | ✅ Implemented | OAuth2 | ⚠️ Draft only | ❌ No | Manual publish required |
| **Juejin** | 🚧 Phase 2 | Cookie | - | - | Chinese tech community |
| **Zhihu** | 🚧 Phase 2 | Cookie | - | - | Chinese Q&A platform |
| **SSPAI** | 🚧 Phase 3 | TBD | - | - | Chinese productivity blog |

### Platform Capabilities

#### Dev.to
- ✅ Markdown native support
- ✅ External image URLs
- ✅ Code syntax highlighting
- ✅ Series/collections
- ✅ Can update published posts

#### Medium
- ⚠️ Limited markdown support
- ✅ Auto-converts images
- ✅ Tags support (max 5)
- ❌ API only creates drafts
- ❌ Cannot update via API

## 🎯 Development Roadmap

### ✅ Completed (Phase 1-3)

- [x] **Phase 1**: Core Infrastructure (100%)
  - Next.js 14 setup
  - TypeScript configuration
  - Tailwind CSS + shadcn/ui
  - Appwrite integration
  - Type definitions

- [x] **Phase 2**: Editor & Content Management (100%)
  - Markdown editor (Tiptap)
  - WYSIWYG + source mode
  - Platform markup parser
  - Auto-save functionality
  - Tag management

- [x] **Phase 3**: Platform Integration (100%)
  - Abstract platform adapter
  - Dev.to adapter
  - Medium adapter
  - Credential management
  - Publishing workflow

- [x] **Phase 4**: AI Content Adaptation (100%)
  - GPT-4 content processor
  - Platform-specific optimization
  - Diff visualization
  - Variant editing

- [x] **Phase 5**: Translation Service (100%)
  - Dual-AI translation
  - Quality review system
  - Auto-approval logic
  - Manual review UI

- [x] **Phase 6**: Dashboard & Monitoring (100%)
  - Article dashboard
  - Status tracking
  - Sync warnings
  - Search and filters

### 🚧 In Progress

- [ ] **Phase 7**: Polish & Testing
  - [ ] E2E testing
  - [ ] Performance optimization
  - [ ] Error boundaries
  - [ ] Analytics integration

### 📅 Future Enhancements

- [ ] Juejin, Zhihu integration (cookie authentication)
- [ ] Scheduled publishing
- [ ] Content calendar
- [ ] Analytics dashboard
- [ ] Team collaboration
- [ ] AI-powered image generation
- [ ] Video platform support
- [ ] Browser extension

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Run tests (when implemented)
npm test
```

## 📊 API Endpoints

### POST /api/translate
Translate content with dual-AI review.

**Request:**
```json
{
  "content": "markdown content",
  "sourceLang": "en",
  "targetLang": "zh",
  "domain": "technical"
}
```

**Response:**
```json
{
  "translationId": "trans_...",
  "translatedContent": "translated markdown",
  "reviewReport": {
    "accuracyScore": 0.95,
    "fluencyScore": 0.92,
    "terminologyScore": 0.93,
    "overallScore": 0.94
  },
  "status": "auto_approved"
}
```

### POST /api/publish
Publish article to multiple platforms.

**Request:**
```json
{
  "articleId": "article_id",
  "userId": "user_id",
  "platforms": ["devto", "medium"],
  "useVariants": true
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "platform": "devto",
      "success": true,
      "url": "https://dev.to/..."
    }
  ]
}
```

### POST /api/content-process
Generate platform-specific variants.

**Request:**
```json
{
  "articleId": "article_id",
  "userId": "user_id",
  "platforms": ["devto", "medium"],
  "useAI": true
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Follow TypeScript best practices
2. Use Prettier for code formatting
3. Write meaningful commit messages
4. Add tests for new features
5. Update documentation

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Appwrite](https://appwrite.io) - Backend services
- [Tiptap](https://tiptap.dev) - Editor framework
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [OpenAI](https://openai.com) - AI services
- [Anthropic](https://anthropic.com) - Claude AI

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed progress

---

**Built with ❤️ by the Omnipost team**

Write once, publish everywhere! 🚀
