'use client'

import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-pink-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">YT</div>
            <span className="text-lg font-extrabold tracking-tighter uppercase">YTDJ<span className="text-cyan-400">.AI</span></span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 transition-all"
          >
            Back to App
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black tracking-tight mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 15, 2025</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-400 leading-relaxed">
              Welcome to YTDJ.AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy
              and ensuring the security of your personal information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our AI-powered DJ set creation service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-white mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Account information (if you create an account): email address, username</li>
              <li>Prompts and preferences you enter for generating DJ sets</li>
              <li>Saved playlists and set configurations</li>
              <li>Feedback and communications you send to us</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (features used, interactions with the service)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-400 leading-relaxed mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Provide and improve our AI DJ set generation service</li>
              <li>Personalize your experience and remember your preferences</li>
              <li>Process and fulfill your requests</li>
              <li>Send you updates and notifications (with your consent)</li>
              <li>Analyze usage patterns to improve our service</li>
              <li>Ensure the security and integrity of our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Services</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Our service integrates with third-party services to provide functionality:
            </p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li><strong className="text-white">YouTube API:</strong> We use YouTube&apos;s API to search for and display music content. Your use is also subject to YouTube&apos;s Terms of Service and Google&apos;s Privacy Policy.</li>
              <li><strong className="text-white">AI Providers:</strong> We use various AI services (OpenAI, Anthropic, Google) to generate playlist recommendations. Prompts and preferences may be processed by these services.</li>
              <li><strong className="text-white">Analytics:</strong> We may use analytics services to understand how users interact with our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Storage and Security</h2>
            <p className="text-gray-400 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information.
              Your data may be stored locally in your browser (localStorage) and/or on our secure servers.
              While we strive to protect your information, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-400 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Disable cookies through your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Children&apos;s Privacy</h2>
            <p className="text-gray-400 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information from
              a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
            <p className="text-gray-400 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-cyan-400 mt-2">privacy@ytdj.ai</p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} YTDJ.AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
