"use client";

import { siteConfig, NavItem, UserRole } from "@/config/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { UserNav } from "./UserNav";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, UserPlus, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getFilteredNav = (navItems: NavItem[]): NavItem[] => {
    if (isLoading) return [];
    return navItems.filter(item => {
      if (item.authRequired && !user) return false;
      if (item.roles && user && !item.roles.includes(user.role)) return false;
      return true;
    });
  };
  
  const mainNavLinks = getFilteredNav(siteConfig.mainNav);
  const protectedNavLinks = getFilteredNav(siteConfig.protectedNav);
  const allVisibleLinks = user ? protectedNavLinks : [];

  const NavLinks = ({ className }: { className?: string }) => (
    <>
      {mainNavLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-all duration-150 ease-in-out border-b-2 px-2 py-[22px] sm:py-[22px]", 
            pathname === item.href
              ? "text-primary border-primary font-semibold" 
              : "text-foreground/70 border-transparent hover:text-primary hover:border-primary/70",
            className
          )}
        >
          {item.title}
        </Link>
      ))}
      {user && allVisibleLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-all duration-150 ease-in-out border-b-2 px-2 py-[22px] sm:py-[22px]", 
            pathname === item.href
              ? "text-primary border-primary font-semibold" 
              : "text-foreground/70 border-transparent hover:text-primary hover:border-primary/70",
            className
          )}
        >
          {item.title}
        </Link>
      ))}
    </>
  );

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200",
      isScrolled && "shadow-sm"
    )}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center space-x-6">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/login" className="px-4">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild className="hidden sm:flex">
                <Link href="/signup" className="px-4">
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                </Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden ml-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <NavLinks className="border-none py-2" />
                {!user && (
                  <div className="flex flex-col gap-2 mt-4">
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" /> Login
                      </Link>
                    </Button>
                    <Button asChild className="justify-start">
                      <Link href="/signup">
                        <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                      </Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
