interface Props {
  value: "newest" | "oldest";
  onChange: (v: "newest" | "oldest") => void;
}

export function SortByDate({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      className="bg-neutral-800 text-sm px-3 py-1 rounded mb-6"
    >
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
    </select>
  );
}
