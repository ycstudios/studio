
"use client";

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from "@/config/site";
import { Code2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  const targetName = siteConfig.name;
  const [typedName, setTypedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const charIndexRef = useRef(0); // Use ref for charIndex

  useEffect(() => {
    // Reset state for the animation
    setTypedName('');
    setShowCursor(true);
    charIndexRef.current = 0; // Reset ref

    const intervalId = setInterval(() => {
      // Ensure targetName is accessed fresh in case of HMR or other updates, though unlikely for siteConfig
      const currentTargetName = siteConfig.name; 
      if (charIndexRef.current < currentTargetName.length) {
        setTypedName((prev) => prev + currentTargetName.charAt(charIndexRef.current));
        charIndexRef.current++; // Increment ref's current value
      } else {
        clearInterval(intervalId);
        setShowCursor(false);
      }
    }, 150); // Adjust typing speed (milliseconds per character)

    return () => {
      clearInterval(intervalId); // Cleanup interval on component unmount
    };
  }, [targetName]); // targetName ensures effect re-runs if siteConfig.name were to change (though it's static)

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
