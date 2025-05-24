// src/components/BenefitListItem.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface BenefitListItemProps {
  // Expecting a ReactElement that can accept a className prop, like a Lucide icon.
  icon: React.ReactElement<{ className?: string }>;
  text: string;
}

export function BenefitListItem({ icon, text }: BenefitListItemProps) {
  return (
    <li className="flex items-start">
      <span className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-foreground/5 mr-3">
        {React.cloneElement(icon, {
          className: cn(icon.props.className, "h-5 w-5") // Merge existing className with new size classes
        })}
      </span>
      <span className="text-foreground">{text}</span>
    </li>
  );
}
