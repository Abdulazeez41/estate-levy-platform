import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-sm transition focus-within:border-gold">
      <Search className="h-4 w-4 text-ink-soft" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
      />
    </div>
  );
}
