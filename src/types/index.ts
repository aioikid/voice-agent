export interface VoiceAgentState {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isListening: boolean;
  audioLevel: number;
  error: string | null;
}

export interface LiveKitConfig {
  url: string;
  token: string;
  roomName: string;
}

export interface AudioVisualizerProps {
  audioLevel: number;
  isListening: boolean;
  isConnected: boolean;
}