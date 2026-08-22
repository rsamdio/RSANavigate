import React, { useState } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';

interface LabelInputProps {
  labels: string[];
  onChange: (labels: string[]) => void;
  availableLabels?: string[];
  placeholder?: string;
  className?: string;
}

export const LabelInput: React.FC<LabelInputProps> = ({
  labels,
  onChange,
  availableLabels = [],
  placeholder = 'Type custom label & press Enter...',
  className = ''
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!labels.includes(trimmed)) {
      onChange([...labels, trimmed]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (labelToRemove: string) => {
    onChange(labels.filter((l) => l !== labelToRemove));
  };

  const handleToggleAvailable = (label: string) => {
    if (labels.includes(label)) {
      onChange(labels.filter((l) => l !== label));
    } else {
      onChange([...labels, label]);
    }
  };

  // Filter available suggestions not already selected
  const suggestions = availableLabels.filter((l) => !labels.includes(l));

  return (
    <div className={`space-y-2.5 font-['Plus_Jakarta_Sans',sans-serif] ${className}`}>
      {/* Selected Label Chips */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#0c3c60] text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs animate-fade-in"
            >
              <Tag className="w-3 h-3 text-[#0c3c60]/70" />
              <span>{label}</span>
              <button
                type="button"
                onClick={() => handleRemove(label)}
                className="w-4 h-4 rounded-full hover:bg-blue-200/80 text-[#0c3c60] flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                title={`Remove ${label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputVal.trim()}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#0c3c60] hover:text-white text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Quick suggestions from workspace */}
      {suggestions.length > 0 && (
        <div className="pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Workspace Labels:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 8).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleToggleAvailable(sug)}
                className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5 text-slate-400" />
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
