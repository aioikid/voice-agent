import React from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isConnected,
  isConnecting,
  isMuted,
  onConnect,
  onDisconnect,
  onToggleMute
}) => {
  return (
    <div className="flex items-center justify-center space-x-4">
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-200 transform hover:scale-105 active:scale-95
          shadow-lg hover:shadow-xl
          ${isConnected
            ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isConnected ? (
          <PhoneOff className="w-6 h-6 text-white" />
        ) : (
          <Phone className="w-6 h-6 text-white" />
        )}
      </button>

      <button
        onClick={onToggleMute}
        disabled={!isConnected}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 transform hover:scale-105 active:scale-95
          shadow-lg hover:shadow-xl
          ${isMuted
            ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
            : 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600'
          }
          ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isMuted ? (
          <MicOff className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
};

export default VoiceControls;