# 🔧 サーバー側でのReactコンポーネントファイル作成

## 📍 現在の状況
❌ `src/App.tsx` ファイルが見つからない  
❌ その他のReactコンポーネントファイルが不足  
✅ 基本的なプロジェクト構造は作成済み  

## 🛠️ 以下のコマンドを順番に実行してください

### 1. srcディレクトリ構造を確認・作成
```bash
# 現在のディレクトリ確認
pwd
ls -la

# srcディレクトリ構造を作成
mkdir -p src/components src/hooks src/types
```

### 2. メインのApp.tsxファイルを作成
```bash
cat > src/App.tsx << 'EOF'
import React, { useState } from 'react';
import { Settings, MessageCircle, Mic2 } from 'lucide-react';
import { useLiveKitVoiceAgent } from './hooks/useLiveKitVoiceAgent';
import AudioVisualizer from './components/AudioVisualizer';
import ConnectionStatus from './components/ConnectionStatus';
import VoiceControls from './components/VoiceControls';
import ConfigModal from './components/ConfigModal';

function App() {
  const [config, setConfig] = useState({
    url: 'wss://talktune-exng0106.livekit.cloud',
    token: '',
    roomName: 'talktune'
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { state, connect, disconnect, toggleMute } = useLiveKitVoiceAgent(config);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Voice Agent</h1>
                <p className="text-sm text-gray-600">AI-Powered Voice Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus 
                isConnected={state.isConnected}
                isConnecting={state.isConnecting}
                error={state.error}
              />
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Voice Interface Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {state.isConnected ? 'Connected to Voice Agent' : 'Ready to Connect'}
            </h2>
            <p className="text-gray-600">
              {state.isConnected 
                ? 'Start speaking to interact with your AI assistant'
                : 'Click the connect button to start your voice session'
              }
            </p>
          </div>

          {/* Audio Visualizer */}
          <div className="mb-8">
            <AudioVisualizer
              audioLevel={state.audioLevel}
              isListening={state.isListening}
              isConnected={state.isConnected}
            />
          </div>

          {/* Voice Controls */}
          <VoiceControls
            isConnected={state.isConnected}
            isConnecting={state.isConnecting}
            isMuted={state.isMuted}
            onConnect={connect}
            onDisconnect={disconnect}
            onToggleMute={toggleMute}
          />

          {/* Error Display */}
          {state.error && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div>
                  <p className="text-yellow-800 text-sm font-medium">接続の問題</p>
                  <p className="text-yellow-700 text-sm">{state.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Agent Status */}
          {state.isConnected && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-blue-600 mt-0.5">✅</div>
                <div>
                  <p className="text-blue-800 text-sm font-medium">LiveKitルームに接続済み</p>
                  <p className="text-blue-700 text-sm">
                    AIエージェントが接続されました。数秒後に挨拶が聞こえるはずです。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Voice Recognition</h3>
            <p className="text-gray-600 text-sm">
              Advanced speech-to-text powered by OpenAI Whisper for accurate voice understanding
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Conversation</h3>
            <p className="text-gray-600 text-sm">
              Intelligent responses powered by OpenAI's language models for natural conversations
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 12.5l-4.343 4.343a2 2 0 01-2.828 0l-4.343-4.343a2 2 0 010-2.828l4.343-4.343a2 2 0 012.828 0l4.343 4.343a2 2 0 010 2.828z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Natural Speech</h3>
            <p className="text-gray-600 text-sm">
              High-quality text-to-speech synthesis with natural-sounding voice responses
            </p>
          </div>
        </div>
      </main>

      {/* Configuration Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={setConfig}
        currentConfig={config}
      />
    </div>
  );
}

export default App;
EOF
```

### 3. TypeScript型定義ファイルを作成
```bash
cat > src/types/index.ts << 'EOF'
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
EOF
```

### 4. LiveKitフックを作成
```bash
cat > src/hooks/useLiveKitVoiceAgent.ts << 'EOF'
import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
import { VoiceAgentState, LiveKitConfig } from '../types';

export const useLiveKitVoiceAgent = (config: LiveKitConfig) => {
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isListening: false,
    audioLevel: 0,
    error: null,
  });

  const roomRef = useRef<Room | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (!roomRef.current) return;

    const localTrack = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
    if (localTrack && localTrack.kind === Track.Kind.Audio) {
      const level = localTrack.getAudioLevel();
      setState(prev => ({ ...prev, audioLevel: level }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!config.url || !config.token) {
      setState(prev => ({ ...prev, error: 'Missing configuration' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        enableMicrophone(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          isListening: false
        }));
        
        if (audioLevelInterval.current) {
          clearInterval(audioLevelInterval.current);
          audioLevelInterval.current = null;
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: true }));
          const audioElement = track.attach();
          if (audioElement) {
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: false }));
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach(element => {
            if (element.srcObject === track.mediaStream) {
              element.remove();
            }
          });
        }
      });

      await room.connect(config.url, config.token);
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config, updateAudioLevel]);

  const enableMicrophone = useCallback(async (room: Room) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this environment');
        return;
      }

      await room.localParticipant.enableCameraAndMicrophone(false, true);
      
    } catch (error) {
      console.warn('Microphone not available in this environment:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (roomRef.current) {
      const audioTrack = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
      if (audioTrack) {
        const newMutedState = !audioTrack.isMuted;
        audioTrack.setMuted(newMutedState);
        setState(prev => ({ ...prev, isMuted: newMutedState }));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    connect,
    disconnect,
    toggleMute,
  };
};
EOF
```

### 5. Reactコンポーネントを作成

#### AudioVisualizer.tsx
```bash
cat > src/components/AudioVisualizer.tsx << 'EOF'
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
EOF
```

#### ConnectionStatus.tsx
```bash
cat > src/components/ConnectionStatus.tsx << 'EOF'
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
EOF
```

#### VoiceControls.tsx
```bash
cat > src/components/VoiceControls.tsx << 'EOF'
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
EOF
```

#### ConfigModal.tsx
```bash
cat > src/components/ConfigModal.tsx << 'EOF'
import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { url: string; token: string; roomName: string }) => void;
  currentConfig: { url: string; token: string; roomName: string };
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentConfig
}) => {
  const [config, setConfig] = useState(currentConfig);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-800">LiveKit Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LiveKit URL
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="wss://your-livekit-server.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token
            </label>
            <textarea
              value={config.token}
              onChange={(e) => setConfig({ ...config, token: e.target.value })}
              placeholder="Your LiveKit access token"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={config.roomName}
              onChange={(e) => setConfig({ ...config, roomName: e.target.value })}
              placeholder="voice-agent-room"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
EOF
```

### 6. ファイル確認
```bash
# 作成されたファイルを確認
ls -la src/
ls -la src/components/
ls -la src/hooks/
ls -la src/types/
```

### 7. Docker再ビルド
```bash
# 再ビルドして起動
/usr/local/bin/docker-compose build --no-cache
/usr/local/bin/docker-compose up -d

# ログ確認
/usr/local/bin/docker-compose logs -f
```

### 8. 動作確認
```bash
# コンテナ状態確認
/usr/local/bin/docker-compose ps

# ヘルスチェック
curl http://localhost:8000/health
```

## ⚠️ 重要な注意事項

1. **ファイル作成順序**: 上記の順序で作成してください
2. **ディレクトリ構造**: `src/components`, `src/hooks`, `src/types` ディレクトリが正しく作成されていることを確認
3. **APIキー設定**: `.env`ファイルに実際のAPIキーが設定されていることを確認

これでReactコンポーネントファイルが作成され、フロントエンドのビルドエラーが解決されるはずです。