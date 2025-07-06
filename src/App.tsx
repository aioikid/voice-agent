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

  const handleConnect = () => {
    const roomName = 'talktune'; // 固定のルーム名
    const identity = `user-${Date.now()}`; // 毎回ユニークな参加者IDを生成
    connect(roomName, identity);
  };

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
            onConnect={handleConnect}
            onDisconnect={disconnect}
            onToggleMute={toggleMute}
          />

          {/* Error Display and Guides */}
          {state.error && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div>
                  <p className="text-yellow-800 text-sm font-medium">接続の問題</p>
                  <p className="text-yellow-700 text-sm">{state.error}</p>
                  {state.error.includes('マイクアクセスが拒否') && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm font-medium">🎤 マイクアクセス許可方法</p>
                      <div className="text-blue-700 text-sm mt-2">
                        <p className="font-medium mb-2">Chrome/Edge:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>アドレスバー左側の🔒マークをクリック</li>
                          <li>「マイク」を「許可」に変更</li>
                          <li>ページを更新</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {/* Other error guides can be added here */}
                </div>
              </div>
            </div>
          )}
          
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