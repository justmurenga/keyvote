import { SiteHeader, SiteFooter } from '@/components/layout';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 lg:py-24">
          <div className="container max-w-4xl prose prose-neutral dark:prose-invert mx-auto">
            <h1>Terms and Conditions</h1>
            <p className="lead">Last updated: April 20, 2026</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using myVote Kenya (&quot;the Platform&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform.
            </p>

            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old to use the Platform.</li>
              <li>You must be a Kenyan citizen or resident.</li>
              <li>You must provide accurate and truthful information during registration.</li>
            </ul>

            <h2>3. Account Responsibilities</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>You agree not to share your account credentials with others.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the Platform for any illegal or unauthorized purpose</li>
              <li>Post false, misleading, or defamatory content about candidates</li>
              <li>Attempt to manipulate polls or election results</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Platform&apos;s operations</li>
              <li>Collect or harvest other users&apos; personal information</li>
              <li>Use automated systems or bots to access the Platform</li>
              <li>Incite violence, hate speech, or discrimination</li>
            </ul>

            <h2>5. Candidate Accounts</h2>
            <p>
              Candidates who register on the Platform must provide verifiable information about their candidacy. We reserve the right to verify candidate information and suspend accounts that provide false information.
            </p>

            <h2>6. Agent Accounts</h2>
            <p>
              Election agents are appointed by candidates and are responsible for accurate reporting of results from their assigned polling stations. Agents must act in accordance with Kenyan electoral laws.
            </p>

            <h2>7. Payments & Wallet</h2>
            <ul>
              <li>All payments are processed through M-Pesa.</li>
              <li>Wallet balances are non-transferable except through authorized transactions.</li>
              <li>We reserve the right to freeze accounts suspected of fraudulent activity.</li>
              <li>Refund requests are processed within 7 business days.</li>
            </ul>

            <h2>8. Content & Intellectual Property</h2>
            <p>
              All content on the Platform, including logos, text, graphics, and software, is the property of myVote Kenya or its licensors. You may not reproduce, distribute, or create derivative works without our written consent.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              myVote Kenya provides the Platform &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform.
            </p>

            <h2>10. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms shall be governed by the laws of Kenya and resolved through arbitration in Nairobi, Kenya.
            </p>

            <h2>11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms. You may also delete your account by contacting support.
            </p>

            <h2>12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.
            </p>

            <h2>13. Contact</h2>
            <p>For questions about these Terms, contact us:</p>
            <ul>
              <li>Email: support@myvote.ke</li>
              <li>WhatsApp: +254 733 638 940</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
