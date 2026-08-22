import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0c3c60] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                selectedOption.badgeColor || 'bg-blue-100 text-[#0c3c60]'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0c3c60]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 min-w-[180px] w-full bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif] ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5 px-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 text-[#0c3c60] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                          opt.badgeColor || 'bg-blue-100 text-[#0c3c60]'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0c3c60] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
