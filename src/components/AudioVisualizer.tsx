import React from 'react';
import { AudioVisualizerProps } from '../types';

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioLevel, 
  isListening, 
  isConnected 
}) => {
  const bars = Array.from({ length: 20 }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center space-x-1 h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
      {bars.map((bar) => {
        const height = isListening && isConnected
          ? Math.random() * audioLevel * 80 + 20
          : 20;
        
        return (
          <div
            key={bar}
            className={`w-1 rounded-full transition-all duration-150 ${
              isListening && isConnected
                ? 'bg-gradient-to-t from-purple-500 to-blue-400'
                : 'bg-gray-300'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};

export default AudioVisualizer;