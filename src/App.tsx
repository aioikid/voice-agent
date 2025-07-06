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
                  {state.error.includes('HTTPS') && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm font-medium">🔒 HTTPS接続が必要です</p>
                      <p className="text-blue-700 text-sm mb-2">
                        マイクアクセスにはHTTPS接続が必要です。以下のリンクからアクセスしてください：
                      </p>
                      <a 
                        href="https://talktune.biz" 
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        HTTPS版にアクセス
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HTTPS Notice */}
          {!state.error && window.location.protocol === 'http:' && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-amber-600 mt-0.5">🔒</div>
                <div>
                  <p className="text-amber-800 text-sm font-medium">マイクアクセスにはHTTPS接続が推奨されます</p>
                  <p className="text-amber-700 text-sm mb-3">
                    現在HTTP接続のため、マイクアクセスが制限される可能性があります。
                    完全な機能を利用するにはHTTPS版をご利用ください。
                  </p>
                  <a 
                    href="https://talktune.biz" 
                    className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    HTTPS版にアクセス
                  </a>
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