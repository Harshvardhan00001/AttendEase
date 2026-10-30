import React from 'react';

interface LogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  versionBadge?: string;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const Logo: React.FC<LogoProps> = ({
  className = '',
  imgClassName = '',
  size = 'md',
  showText = false,
  versionBadge,
}) => {
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${sizeClass} shrink-0 rounded-2xl overflow-hidden transition-transform duration-200`}>
        {/* Light mode logo */}
        <img
          src="/light mode logo.png"
          alt="AttendEase Logo"
          className={`w-full h-full object-contain ${imgClassName}`}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              Attend<span className="text-indigo-600">Ease</span>
            </span>
            {versionBadge && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 font-mono">
                {versionBadge}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase font-mono mt-0.5">
            Cryptographic Biometric Attendance
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
