# Netlify Deployment Setup

## Required Environment Variables

To deploy this project on Netlify, you need to configure the following environment variables in your Netlify dashboard:

### Navigate to Environment Variables
1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Build & deploy** → **Environment variables**
4. Click **Add a variable** for each of the following:

### Required Variables

#### AI Providers
- `OPENAI_API_KEY` - Your OpenAI API key (for GPT-4)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (for Claude)
- `GOOGLE_AI_API_KEY` - Your Google AI API key (for Gemini)

#### YouTube Integration
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret

#### NextAuth
- `NEXTAUTH_SECRET` - Random string for NextAuth JWT encryption (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your site URL (e.g., `https://your-site.netlify.app`)

#### Supabase (for cloud storage)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

## Important Notes

### Node.js Version
The project requires **Node.js 20+** (configured in `netlify.toml`). Supabase client library doesn't support Node 18 and below.

### Build Configuration
The project uses:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Next.js Runtime plugin**: `@netlify/plugin-nextjs`

### After Adding Variables
1. Save all environment variables
2. Go to **Deploys** tab
3. Click **Trigger deploy** → **Clear cache and deploy site**
4. Wait for the build to complete

### Verifying Setup
After deployment:
1. Visit your site
2. Sign in with Google OAuth
3. Generate a DJ set
4. Try saving it to the cloud (should work if Supabase is configured)
5. Browse saved sets using the folder icon

## Troubleshooting

### "supabaseUrl is required" Error
- Make sure `NEXT_PUBLIC_SUPABASE_URL` is set correctly in Netlify
- The variable must start with `NEXT_PUBLIC_` to be available in the browser
- Clear cache and redeploy

### "Failed to save set" Error
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check that you ran the database migration in Supabase (see `SUPABASE_SETUP.md`)

### OAuth Not Working
- Make sure `NEXTAUTH_URL` matches your actual site URL
- Add your Netlify URL to Google OAuth authorized redirect URIs
- Format: `https://your-site.netlify.app/api/auth/callback/google`

### Build Fails with Node Version Error
- Netlify should use Node 20 (check `netlify.toml`)
- If using an older version, update it in **Site settings** → **Build & deploy** → **Environment** → **NODE_VERSION** = `20`

## Security Notes

- Never commit `.env.local` to git (it's in `.gitignore`)
- Use Netlify's environment variables for all secrets
- The service role key should only be used server-side
- Keep your API keys secure and rotate them if compromised
