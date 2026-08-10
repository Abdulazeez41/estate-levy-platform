import { cn } from '@/lib/utils';

interface FilterPillsProps {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterPills({ items, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition',
            value === item.value ? 'border-green-deep bg-green-deep text-white' : 'border-line bg-white text-ink hover:bg-green-wash',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
