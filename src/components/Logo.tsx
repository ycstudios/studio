import { siteConfig } from "@/config/site";
import { Code2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <Code2 className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg text-foreground">{siteConfig.name}</span>
    </Link>
  );
}
