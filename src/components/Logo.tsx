
"use client";

import { siteConfig } from "@/config/site";
import { Code2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2" aria-label={`${siteConfig.name} homepage`}>
      <Code2 className="h-6 w-6 text-primary flex-shrink-0" />
      <span className="font-bold text-lg text-foreground whitespace-nowrap">
        {siteConfig.name}
      </span>
    </Link>
  );
}
