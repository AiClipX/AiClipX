import VideoList from "../components/VideoList";

export default function MockVideosPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Mock Video Library
        </h1>
        <p className="text-neutral-400 mb-6">
          Frontend-only demo using static mock data
        </p>
        <VideoList />
      </div>
    </main>
  );
}
