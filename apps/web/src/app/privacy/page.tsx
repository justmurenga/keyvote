import { SiteHeader, SiteFooter } from '@/components/layout';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 lg:py-24">
          <div className="container max-w-4xl prose prose-neutral dark:prose-invert mx-auto">
            <h1>Privacy Policy</h1>
            <p className="lead">Last updated: April 20, 2026</p>

            <h2>1. Introduction</h2>
            <p>
              myVote Kenya (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, including our website, mobile application, and USSD service.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>Personal Information</h3>
            <ul>
              <li>Full name and national ID number</li>
              <li>Phone number and email address</li>
              <li>County, constituency, ward, and polling station</li>
              <li>Profile photo (optional)</li>
              <li>Political party affiliation (for candidates)</li>
            </ul>
            <h3>Usage Information</h3>
            <ul>
              <li>Device information and IP address</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and features used</li>
              <li>Poll participation and candidate follows</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <ul>
              <li>To create and manage your account</li>
              <li>To provide election-related services and features</li>
              <li>To send notifications about candidates, polls, and results</li>
              <li>To verify your identity and prevent fraud</li>
              <li>To improve our platform and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2>4. Data Protection</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, regular security audits, and access controls.
            </p>

            <h2>5. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share your data with:
            </p>
            <ul>
              <li>Service providers who assist in platform operations (SMS, payment processing)</li>
              <li>Law enforcement when required by law</li>
              <li>Electoral bodies for verification purposes (with your consent)</li>
            </ul>

            <h2>6. Your Rights</h2>
            <p>Under the Kenya Data Protection Act, 2019, you have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and preferences. We do not use tracking cookies for advertising purposes.
            </p>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              Our platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact us:
            </p>
            <ul>
              <li>Email: support@keyvote.online</li>
              <li>WhatsApp: +254 733 638 940</li>
              <li>USSD: *384*VOTE#</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
