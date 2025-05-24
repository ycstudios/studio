
"use client";

import { siteConfig, NavItem, UserRole } from "@/config/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { UserNav } from "./UserNav";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, UserPlus } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

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


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-auto min-h-16 max-w-screen-2xl items-center py-2 sm:py-0">
        <Logo />
        <nav className="ml-6 flex flex-wrap items-center gap-x-1 lg:gap-x-2 gap-y-1">
          {mainNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-all duration-150 ease-in-out border-b-2 px-2 py-[22px] sm:py-[22px]", // Adjusted padding for consistent height with border
                pathname === item.href
                  ? "text-primary border-primary font-semibold" // Active state
                  : "text-foreground/70 border-transparent hover:text-primary hover:border-primary/70" // Default and hover states
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
                "text-sm font-medium transition-all duration-150 ease-in-out border-b-2 px-2 py-[22px] sm:py-[22px]", // Adjusted padding
                pathname === item.href
                  ? "text-primary border-primary font-semibold" // Active state
                  : "text-foreground/70 border-transparent hover:text-primary hover:border-primary/70" // Default and hover states
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2 ml-auto">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
