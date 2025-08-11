import { cn } from "@/utils/cn";
import { ChevronDown } from 'lucide-react';
import { useState } from "react";

type Option = {
  value: string | number;
  label: string;
};

type Props = {
  placeholder: string;
  name: string;
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  error?: string;
  isRequired?: boolean;
};

export const Select = ({
  placeholder,
  name,
  options,
  value,
  onChange,
  className = '',
  error,
  isRequired = true
}: Props) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex w-full flex-col relative">
      <div className="relative group">
        <select
          name={name}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            e.target.blur();
          }}
          required={isRequired}
          className={cn("w-full px-4 py-1.5 text-gray-100 rounded-lg bg-gray-700/50 appearance-none", className)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <option value="" disabled className="text-gray-900">
            {placeholder}
          </option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-gray-700 text-gray-100"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-200" style={{ transform: focused ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-1.5 px-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-500"></span>
          {error}
        </p>
      )}
    </div>
  );
};
