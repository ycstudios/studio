"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import type { FC } from 'react';

interface CarouselImage {
  src: string;
  alt: string;
  dataAiHint: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  interval?: number; // in milliseconds
  className?: string;
}

export const ImageCarousel: FC<ImageCarouselProps> = ({ images, interval = 10000, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return; // No need to cycle if 0 or 1 image
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearTimeout(timer); // Cleanup on component unmount or when dependencies change
  }, [currentIndex, images.length, interval]);

  if (!images || images.length === 0) {
    // Fallback or placeholder if no images are provided
    return (
        <div className={`relative w-full aspect-video overflow-hidden rounded-xl shadow-lg bg-muted ${className}`}>
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No images to display.</p>
            </div>
        </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className={`relative w-full aspect-square max-w-[500px] overflow-hidden rounded-xl shadow-lg ${className}`}>
      {images.map((image, index) => (
        <div
          key={image.src + index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none" 
          }`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            width={500}
            height={500}
            className="w-full h-full object-cover"
            data-ai-hint={image.dataAiHint}
            priority={index === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-primary scale-125" : "bg-muted-foreground/50 hover:bg-primary/70"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
