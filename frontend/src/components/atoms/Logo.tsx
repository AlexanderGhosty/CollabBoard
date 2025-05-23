import { useThemeStore } from '@/store/useThemeStore';
import clsx from 'clsx';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

export default function Logo({ className, size = 'md', alt = 'CollabBoard Logo' }: LogoProps) {
  const theme = useThemeStore(state => state.theme);
  const systemTheme = useThemeStore(state => state.systemTheme);
  
  // Determine the current effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  
  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <svg
      width="512"
      height="512"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        sizeClasses[size],
        'transition-all duration-300',
        className
      )}
      aria-label={alt}
    >
      {/* Background gradient */}
      <rect 
        width="512" 
        height="512" 
        rx="100" 
        fill={effectiveTheme === 'dark' ? 'url(#paint0_linear_dark)' : 'url(#paint0_linear_light)'} 
      />
      
      {/* Board columns */}
      <rect 
        x="96" 
        y="128" 
        width="80" 
        height="256" 
        rx="16" 
        fill={effectiveTheme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'} 
      />
      <rect 
        x="216" 
        y="128" 
        width="80" 
        height="256" 
        rx="16" 
        fill={effectiveTheme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'} 
      />
      <rect 
        x="336" 
        y="128" 
        width="80" 
        height="256" 
        rx="16" 
        fill={effectiveTheme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'} 
      />
      
      {/* Cards in columns */}
      <rect 
        x="108" 
        y="152" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      <rect 
        x="108" 
        y="208" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      <rect 
        x="108" 
        y="264" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      
      <rect 
        x="228" 
        y="152" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      <rect 
        x="228" 
        y="208" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      
      <rect 
        x="348" 
        y="152" 
        width="56" 
        height="40" 
        rx="8" 
        fill={effectiveTheme === 'dark' ? '#60a5fa' : '#3B82F6'} 
      />
      
      {/* Gradient definitions */}
      <defs>
        {/* Light theme gradient */}
        <linearGradient 
          id="paint0_linear_light" 
          x1="0" 
          y1="0" 
          x2="512" 
          y2="512" 
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EFF6FF" />
          <stop offset="1" stopColor="#E0E7FF" />
        </linearGradient>
        
        {/* Dark theme gradient */}
        <linearGradient 
          id="paint0_linear_dark" 
          x1="0" 
          y1="0" 
          x2="512" 
          y2="512" 
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
