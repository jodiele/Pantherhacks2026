import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Remove Markdown **bold** markers for plain-text chat bubbles. */
export function stripChatBoldMarkers(text: string): string {
  let s = text
  let prev = ''
  while (s !== prev) {
    prev = s
    s = s.replace(/\*\*([\s\S]*?)\*\*/g, '$1')
  }
  return s.replace(/\*\*/g, '')
}
