import React from 'react';
import { useEvidenceMode } from '../../contexts/EvidenceModeContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const EvidenceModeToggle: React.FC = () => {
  const { isEnabled, toggle } = useEvidenceMode();

  return (
    <button
      onClick={toggle}
      className={`
        fixed bottom-4 left-4 z-50
        flex items-center gap-2 px-4 py-2 rounded-lg
        font-medium text-sm shadow-lg
        transition-all duration-200
        ${isEnabled 
          ? 'bg-blue-500 text-white hover:bg-blue-600' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }
      `}
      title={isEnabled ? 'Disable Evidence Mode' : 'Enable Evidence Mode'}
    >
      {isEnabled ? (
        <>
          <EyeIcon className="w-5 h-5" />
          <span>Evidence ON</span>
        </>
      ) : (
        <>
          <EyeSlashIcon className="w-5 h-5" />
          <span>Evidence OFF</span>
        </>
      )}
    </button>
  );
};

export default EvidenceModeToggle;