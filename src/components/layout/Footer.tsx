
import Link from 'next/link';
import { Heart, Code2, Twitter, Linkedin, Github } from 'lucide-react'; // Added Twitter, Linkedin, Github
import { siteConfig } from '@/config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card text-card-foreground border-t border-border/40 mt-auto">
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-center sm:text-left">
          <div>
            <Link href="/" className="flex items-center justify-center sm:justify-start space-x-2 mb-3">
              <Code2 className="h-7 w-7 text-primary" />
              <span className="font-bold text-xl text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/projects/new" className="text-muted-foreground hover:text-primary transition-colors">Post a Project</Link></li>
              <li><Link href="/profile" className="text-muted-foreground hover:text-primary transition-colors">Profile</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Stay Connected</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Follow us on social media for updates.
            </p>
            <div className="flex justify-center sm:justify-start space-x-4">
                <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="GitHub" className="text-muted-foreground hover:text-primary transition-colors">
                  <Github className="h-5 w-5" />
                </Link>
            </div>
          </div>
        </div>

        {/* Sub-footer content */}
        <div className="border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
          <p className="mb-1">
            © {currentYear} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center justify-center space-x-1">
            <span>Powered by Numberzz</span>
            <Heart className="h-4 w-4 text-red-500 animate-heart-blink" />
          </div>
        </div>
      </div>
    </footer>
  );
}
