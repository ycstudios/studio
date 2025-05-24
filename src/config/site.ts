export type NavItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  external?: boolean;
  authRequired?: boolean;
  roles?: UserRole[]; // Specify which roles can see this link
};

export type UserRole = "client" | "developer" | "admin";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  mainNav: NavItem[];
  protectedNav: NavItem[];
};

export const siteConfig: SiteConfig = {
  name: "CodeCrafter",
  description: "Connecting clients with expert developers.",
  url: "https://codecrafter.example.com", // Replace with your actual URL
  ogImage: "https://codecrafter.example.com/og.jpg", // Replace with your actual OG image
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
  ],
  protectedNav: [
    {
      title: "Dashboard",
      href: "/dashboard",
      authRequired: true,
    },
    {
      title: "Submit Project",
      href: "/projects/new",
      authRequired: true,
      roles: ["client"],
    },
    {
      title: "Profile",
      href: "/profile",
      authRequired: true,
    },
    {
      title: "Referrals",
      href: "/referrals",
      authRequired: true,
    },
    {
      title: "Billing",
      href: "/billing",
      authRequired: true,
    },
    {
      title: "Admin Panel",
      href: "/admin",
      authRequired: true,
      roles: ["admin"],
    }
  ],
};
