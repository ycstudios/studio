
"use client";

import { useState, useEffect } from 'react';
import { siteConfig } from "@/config/site";
import { Code2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  const targetName = siteConfig.name;
  const [typedName, setTypedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setTypedName(''); // Reset in case targetName changes (though unlikely)
    setShowCursor(true);

    let charIndex = 0;
    const intervalId = setInterval(() => {
      if (charIndex < targetName.length) {
        setTypedName((prev) => prev + targetName.charAt(charIndex));
        charIndex++;
      } else {
        clearInterval(intervalId);
        setShowCursor(false);
      }
    }, 150); // Adjust typing speed (milliseconds per character)

    return () => {
      clearInterval(intervalId); // Cleanup interval on component unmount
    };
  }, [targetName]); // Re-run if targetName ever changes

  return (
    <Link href="/" className="flex items-center space-x-2" aria-label={`${siteConfig.name} homepage`}>
      <Code2 className="h-6 w-6 text-primary flex-shrink-0" />
      <span className="font-bold text-lg text-foreground whitespace-nowrap">
        {typedName}
        {showCursor && <span className="typing-cursor" aria-hidden="true"></span>}
      </span>
    </Link>
  );
}
