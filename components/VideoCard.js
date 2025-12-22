export default function VideoCard({ video }) {
    return (
        <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition">

            {/* Preview area */}
            <div className="relative aspect-video bg-gradient-to-br from-neutral-700
             to-neutral-800 flex items-center justify-center">

                <div className="absolute w-20 h-20 rounded-full bg-blue-500/20 blur-xl"></div>

                {/* Play button */}
                <div className="
                relative
                flex items-center justify-center
                w-16 h-16
                rounded-full
                bg-neutral-900/80
                border border-blue-400/40
                text-blue-400
                text-3xl
                shadow-xl
                ">
                    Play
                </div>

            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-white font-medium leading-snug">
                    {video.title}
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                    <span>Duration: </span>
                    {video.duration} <span className="mx-2">&bull;</span> 
                    <span>AI Generated</span>
                </p>
            </div>
        </div>
    );
}
