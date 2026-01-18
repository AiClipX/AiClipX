import React from 'react';
import { useRouter } from 'next/router';
import { 
  MagnifyingGlassIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';

interface NotFoundProps {
  videoId?: string;
  message?: string;
}

const NotFound: React.FC<NotFoundProps> = ({ 
  videoId, 
  message = 'Video not found' 
}) => {
  const router = useRouter();

  const handleBackToList = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <MagnifyingGlassIcon className="w-24 h-24 mx-auto text-gray-300" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {message}
        </h1>
        
        <p className="text-gray-600 mb-2">
          The video you're looking for doesn't exist or has been deleted.
        </p>
        
        {videoId && (
          <p className="text-sm text-gray-500 font-mono mb-6">
            ID: {videoId}
          </p>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleBackToList}
            className="
              w-full flex items-center justify-center gap-2
              px-6 py-3 rounded-lg
              bg-blue-600 hover:bg-blue-700 text-white
              font-medium transition-colors
            "
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Video List</span>
          </button>
          
          <p className="text-sm text-gray-500">
            or check if the video ID is correct
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;