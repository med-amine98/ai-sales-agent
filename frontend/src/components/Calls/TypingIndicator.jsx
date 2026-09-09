import React from 'react';
import './TypingIndicator.css';

/**
 * Simple typing indicator with three animated dots.
 * It is positioned absolutely; the parent component should have `relative` positioning.
 */
export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  );
}
