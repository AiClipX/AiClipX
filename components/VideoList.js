import VideoCard from "./VideoCard";
import { mockVideosData } from "../data/mockVideosData";
import { useState } from 'react';

export default function VideoList() {
    const [keyword, setKeyword] = useState("");

    const filteredVideos = mockVideosData.filter(v =>
        v.title.toLowerCase().includes(keyword.toLowerCase())
    );

    return (
        <>
            <input
                type="text"
                placeholder="Search videos..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="mb-6 w-full rounded-lg bg-neutral-900 px-4 py-2 text-white placeholder-neutral-500 border border-neutral-700 focus:outline-none focus:border-blue-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(video => (
                    <VideoCard key={video.id} video={video} />
                ))}
            </div>

        </>
    );
}
