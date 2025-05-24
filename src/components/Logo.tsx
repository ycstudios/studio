
"use client";

import { useState, useEffect, useRef } from 'react';
import { siteConfig } from "@/config/site";
import { Code2 } from "lucide-react";
import Link from "next/link";

export function Logo() {
  const [typedName, setTypedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const charIndexRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const typingSpeed = 150; // Milliseconds per character

  // siteConfig.name should be "CodeCrafter"
  // This targetName is captured by the useEffect closure and should be stable for that effect's execution.
  const targetName = siteConfig.name;

  useEffect(() => {
    // Reset animation state
    setTypedName('');
    setShowCursor(true);
    charIndexRef.current = 0;
    lastUpdateTimeRef.current = 0; // Reset last update time

    const animate = (timestamp: number) => {
      if (lastUpdateTimeRef.current === 0) {
        lastUpdateTimeRef.current = timestamp; // Initialize first timestamp
      }

      const elapsed = timestamp - lastUpdateTimeRef.current;

      if (elapsed >= typingSpeed) {
        if (charIndexRef.current < targetName.length) {
          setTypedName((prev) => prev + targetName.charAt(charIndexRef.current));
          charIndexRef.current++;
          lastUpdateTimeRef.current = timestamp; // Update last timestamp
        } else {
          // Animation finished
          setShowCursor(false);
          if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
          }
          return; // Stop requesting new frames
        }
      }

      // Continue animation if not finished
      if (charIndexRef.current < targetName.length) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else if (charIndexRef.current >= targetName.length && showCursor) {
        // If animation finished quickly but cursor still needs to be hidden
        setShowCursor(false);
      }
    };

    // Start the animation
    animationFrameIdRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [targetName, typingSpeed]); // Re-run effect if targetName or typingSpeed changes

  return (
    <Link href="/" className="flex items-center space-x-2" aria-label={`${targetName} homepage`}>
      <Code2 className="h-6 w-6 text-primary flex-shrink-0" />
      <span className="font-bold text-lg text-foreground whitespace-nowrap">
        {typedName}
        {showCursor && <span className="typing-cursor" aria-hidden="true"></span>}
      </span>
    </Link>
  );
}
