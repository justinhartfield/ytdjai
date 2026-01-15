'use client'

import Link from 'next/link'

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-black tracking-tight mb-8">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 15, 2025</p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-400 leading-relaxed">
              By accessing or using YTDJ.AI (&quot;the Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service. We reserve the
              right to modify these Terms at any time, and your continued use of the Service constitutes
              acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-400 leading-relaxed">
              YTDJ.AI is an AI-powered platform that helps users create and curate DJ sets and playlists.
              The Service uses artificial intelligence to generate track recommendations based on user
              prompts and preferences, utilizing content available through YouTube&apos;s platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
            <p className="text-gray-400 leading-relaxed mb-4">By using the Service, you agree to:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-2">
              <li>Provide accurate information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service in compliance with all applicable laws</li>
              <li>Not use the Service for any illegal or unauthorized purpose</li>
              <li>Not attempt to interfere with or disrupt the Service</li>
              <li>Not reverse engineer or attempt to extract source code from the Service</li>
              <li>Respect the intellectual property rights of others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property</h2>
            <h3 className="text-lg font-semibold text-white mb-2">4.1 Our Content</h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              The Service, including its design, features, and underlying technology, is owned by YTDJ.AI
              and protected by intellectual property laws. You may not copy, modify, distribute, or create
              derivative works without our express written permission.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2">4.2 Third-Party Content</h3>
            <p className="text-gray-400 leading-relaxed">
              Music and video content accessed through the Service is owned by respective artists, labels,
              and content creators. We do not claim ownership of any third-party content. Your use of such
              content is subject to YouTube&apos;s Terms of Service and applicable copyright laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. YouTube API Services</h2>
            <p className="text-gray-400 leading-relaxed">
              The Service uses YouTube API Services. By using our Service, you also agree to be bound by
              YouTube&apos;s Terms of Service (<a href="https://www.youtube.com/t/terms" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">https://www.youtube.com/t/terms</a>)
              and Google&apos;s Privacy Policy (<a href="https://policies.google.com/privacy" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. AI-Generated Content</h2>
            <p className="text-gray-400 leading-relaxed">
              Playlists and recommendations generated by our AI are provided for entertainment and convenience.
              We do not guarantee the accuracy, appropriateness, or availability of AI-generated suggestions.
              The AI may occasionally produce unexpected or imperfect results. You are responsible for reviewing
              and curating any generated content before use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-gray-400 leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              OR SECURE. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-400 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, YTDJ.AI SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US (IF ANY) IN THE TWELVE MONTHS
              PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Indemnification</h2>
            <p className="text-gray-400 leading-relaxed">
              You agree to indemnify, defend, and hold harmless YTDJ.AI and its officers, directors,
              employees, and agents from any claims, damages, losses, or expenses arising from your
              use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
            <p className="text-gray-400 leading-relaxed">
              We reserve the right to suspend or terminate your access to the Service at any time,
              with or without cause, and with or without notice. Upon termination, your right to use
              the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
            <p className="text-gray-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which YTDJ.AI operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
            <p className="text-gray-400 leading-relaxed">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-cyan-400 mt-2">legal@ytdj.ai</p>
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
