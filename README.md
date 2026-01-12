# YTDJ.AI - AI-Powered DJ Set Creator

Create perfect DJ sets with AI-powered music curation and intelligent transitions.

## Features

- **AI-Powered Set Generation**: Generate complete DJ sets from natural language prompts
- **Multi-Provider AI Support**: Switch between OpenAI GPT-4, Claude, and Google Gemini
- **Intelligent Transitions**: AI analyzes BPM, key, and energy for smooth transitions
- **Visual Timeline**: See your entire set with transition quality indicators
- **Drag & Drop Reordering**: Easily rearrange tracks with drag-and-drop
- **AI Track Swapping**: Let AI suggest alternatives that maintain flow
- **Constraint-Based Generation**: Set BPM ranges, moods, and exclusions

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
cd ytdjai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Configure your AI providers in `.env.local`:

```env
# AI Provider API Keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key

# Optional: Google OAuth for YouTube Music export
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth (for authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Usage

### Generate a Set

1. Click on the "AI Generate" tab
2. Describe your perfect DJ set in the prompt field
3. Optionally configure advanced settings:
   - Track count
   - BPM range
   - Mood tags
   - Excluded artists
4. Click "Generate Set"

### Edit Your Set

- **Drag & Drop**: Reorder tracks by dragging them
- **AI Swap**: Click the menu on any track and select "AI Swap Track" for alternatives
- **Remove**: Delete tracks that don't fit
- **Move Up/Down**: Quick reordering buttons

### AI Providers

Switch between AI providers in the header:
- **GPT-4**: Best for creative and diverse recommendations
- **Claude**: Excellent for nuanced understanding of genres
- **Gemini**: Fast inference with good music knowledge

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── ai/
│   │       ├── generate/   # Playlist generation endpoint
│   │       └── swap/       # Track swap endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── features/           # Feature components
│   │   ├── TrackCard.tsx
│   │   ├── PlaylistTimeline.tsx
│   │   ├── AIPromptPanel.tsx
│   │   └── AISettingsModal.tsx
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── WorkspacePanel.tsx
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── ai-service.ts       # AI service client
│   └── utils.ts            # Utility functions
├── store/
│   └── index.ts            # Zustand store
├── styles/
│   └── globals.css         # Global styles
└── types/
    └── index.ts            # TypeScript types
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **AI Providers**: OpenAI, Anthropic, Google AI
- **Drag & Drop**: Framer Motion Reorder
- **Icons**: Lucide React
- **Deployment**: Netlify

## Deploy to Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/ytdjai)

### Manual Deployment

1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Configure build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables in Netlify dashboard:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_AI_API_KEY`
7. Click "Deploy site"

### Environment Variables on Netlify

Go to **Site settings** → **Environment variables** and add:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | Your Anthropic/Claude API key |
| `GOOGLE_AI_API_KEY` | Your Google AI/Gemini API key |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

---

Built with love for DJs by YTDJ.AI
