import { cn } from "@/utils/cn";

type Props = {
  placeholder: string;
  name: string;
  type?: string;
  error?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: number,
  max?: number,
  step?: number;
  isRequired?: boolean;
  disabled?: boolean;
};

export const Input = ({
  placeholder,
  name,
  type = 'text',
  step,
  error,
  value,
  min,
  max,
  onChange,
  className = '',
  isRequired = true
}: Props) => {
  const getInputMode = () => {
    if (type === 'number') {
      return step && step < 1 ? 'decimal' : 'numeric';
    }
    return 'text';
  };

  return (
    <div className="flex w-full flex-col relative">
      <div className="relative group w-full">
        <input
          inputMode={getInputMode()}
          step={step}
          type={type}
          min={min}
          max={max}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          required={isRequired}
          className={cn(
            `w-full px-4 py-2 text-gray-100 rounded-lg bg-gray-700/50 
            border border-gray-600/50
            focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50
            hover:border-gray-500/50
            peer placeholder-transparent`,
            error ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50" : "",
            className
          )}
        />
        <span className={cn(
          `absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 
          transition-all duration-200 pointer-events-none`,
          value ? "-translate-y-7 text-xs text-cyan-400 px-1" : "",
          "group-hover:text-gray-300"
        )}>
          {placeholder}
        </span>
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
