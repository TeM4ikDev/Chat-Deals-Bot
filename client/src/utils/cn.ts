export function cn(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
} 