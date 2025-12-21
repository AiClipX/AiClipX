export function VideoActions() {
  return (
    <div className="flex gap-3">
      <button className="px-4 py-2 rounded border border-neutral-700 hover:bg-neutral-800">
        Edit
      </button>
      <button className="px-4 py-2 rounded border border-neutral-700 hover:bg-neutral-800">
        Regenerate
      </button>
      <button className="px-4 py-2 rounded border border-red-600 text-red-400 hover:bg-red-500/10">
        Delete
      </button>
    </div>
  );
}
