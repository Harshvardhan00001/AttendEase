import React from 'react';
import { InteractiveGrid } from './ui/interactive-grid';

/**
 * AnimatedGridBackground
 * Renders the interactive light-mode grid as the global background of the application.
 */
export const AnimatedGridBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white" aria-hidden="true">
      {/* Single unified interactive grid background scaled to 2X actual size (cellSize=80) */}
      <InteractiveGrid cellSize={80} className="text-slate-900 opacity-65" />
    </div>
  );
};

export default AnimatedGridBackground;
