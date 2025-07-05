import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  error
}) => {
  if (error) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
        <WifiOff className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 font-medium">Connection Error</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
        <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
        <span className="text-sm text-yellow-700 font-medium">Connecting...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
        <Wifi className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-700 font-medium">Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg">
      <WifiOff className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600 font-medium">Disconnected</span>
    </div>
  );
};

export default ConnectionStatus;