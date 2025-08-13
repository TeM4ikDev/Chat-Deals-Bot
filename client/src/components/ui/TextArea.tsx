import { cn } from "@/utils/cn";

type Props = {
  placeholder: string;
  name: string;
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  isRequired?: boolean;
  disabled?: boolean;
};

export const TextArea = ({
  placeholder,
  name,
  error,
  value,
  onChange,
  className = '',
  rows = 6,
  isRequired = true,
  disabled = false
}: Props) => {
  return (
    <div className="flex w-full flex-col relative">
      <div className="relative group w-full">
        <textarea
          rows={rows}
          name={name}
          value={value}
          onChange={onChange}
          required={isRequired}
          disabled={disabled}
          className={cn(
            `w-full px-3 py-2 text-gray-100 rounded-lg bg-gray-700/50 
            border border-gray-600/50
            focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50
            hover:border-gray-500/50
            peer placeholder-transparent resize-none`,
            error ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50" : "",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            className
          )}
        />
        <span className={cn(
          `absolute left-2 top-2 text-gray-400 
          transition-all duration-200 pointer-events-none`,
          value ? "-translate-y-4 text-xs text-cyan-400 px-1" : "",
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
