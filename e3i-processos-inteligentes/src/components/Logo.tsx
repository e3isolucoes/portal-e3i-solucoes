import React from 'react';
import { useAuth } from '../context/AuthContext';
import brandLogo from '../../Logo.png';

interface LogoProps {
  className?: string;
  customLogoUrl?: string;
  companyName?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "", customLogoUrl, companyName }) => {
  const { tenant } = useAuth();
  
  const logoUrl = customLogoUrl || tenant?.customLogoUrl || brandLogo;
  const name = companyName || tenant?.name;

  return (
    <div className={`group flex select-none items-center gap-3 ${className}`}>
      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[9px] border border-[#CFD6C6] bg-[#FBFBF8] p-1.5 shadow-sm">
        <img 
          src={logoUrl} 
          alt={name || 'E3I Soluções'} 
          className="h-full w-full object-contain"
          onError={(e) => {
            // Fallback text if image isn't loaded
            const parent = e.currentTarget.parentElement;
            if (parent) {
              e.currentTarget.style.display = 'none';
            }
          }}
        />
      </div>
      <span className="hidden sm:block">
        <strong className="block font-display text-lg font-semibold leading-tight text-[#0E1A29]">E³I Soluções</strong>
        <small className="block font-mono text-[9px] uppercase tracking-[.14em] text-[#5C6672]">Portal empresarial</small>
      </span>
    </div>
  );
};





