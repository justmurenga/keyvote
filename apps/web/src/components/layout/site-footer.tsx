import Link from 'next/link';
import { Vote } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t py-12 bg-muted/30">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <Vote className="h-6 w-6 text-primary" />
              <span className="font-bold">myVote Kenya</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Empowering Kenyans to participate actively in democracy.
            </p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/candidates" className="hover:text-primary transition-colors">Candidates</Link></li>
              <li><Link href="/polls" className="hover:text-primary transition-colors">Opinion Polls</Link></li>
              <li><Link href="/results" className="hover:text-primary transition-colors">Election Results</Link></li>
              <li><Link href="/agents" className="hover:text-primary transition-colors">Agent Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: support@myvote.ke</li>
              <li>USSD: *384*VOTE#</li>
              <li>WhatsApp: +254 700 000 000</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} myVote Kenya. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
