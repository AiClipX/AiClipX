import Link from "next/link";

export function VideoNotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
      <p className="mb-4">Video not found</p>
      <Link
        href="/dashboard"
        className="text-blue-400 hover:underline"
      >
        Back to list
      </Link>
    </div>
  );
}
