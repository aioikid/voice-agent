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
                  {state.error.includes('マイク') && (
                    <div className="mt-2 text-xs text-yellow-600">
                      <p><strong>解決方法:</strong></p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        <li>ブラウザでマイクアクセスを許可してください</li>
                        <li>マイクが接続されていることを確認してください</li>
                        <li>他のアプリケーションがマイクを使用していないか確認してください</li>
                        <li>ページを更新して再度お試しください</li>
                      </ul>
                    </div>
                  )}
                  {state.error.includes('Missing configuration') && (
                    <div className="mt-2 text-xs text-yellow-600">
                      <p><strong>解決方法:</strong> 設定ボタン（⚙️）をクリックしてLiveKit URLとアクセストークンを設定してください</p>
                    </div>
                  )}
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
                    聞こえない場合は、Pythonエージェントを再起動してください:
                  </p>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs mt-1 inline-block">python agent.py dev</code>
                  <div className="mt-2 text-xs text-blue-600">
                    <p><strong>トラブルシューティング:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>ブラウザの音量設定とシステム音量を確認してください</li>
                      <li>ブラウザでオーディオの自動再生が許可されていることを確認してください</li>
                      <li>エージェントを再起動してから再接続してください</li>
                      <li>OpenAI APIキーが正しく設定されていることを確認してください</li>
                      <li>ページを更新してから再度接続してください</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Development Environment Notice */}
          {!state.error && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div>
                  <p className="text-blue-800 text-sm font-medium">開発環境での使用について</p>
                  <p className="text-blue-700 text-sm">
                    この環境ではマイクアクセスが制限されていますが、LiveKit接続のテストは可能です。
                    実際のデバイス（PC、スマートフォンなど）では音声機能が正常に動作します。
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Configuration Reminder */}
          {!config.token && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-amber-600 mt-0.5">🔑</div>
                <div>
                  <p className="text-amber-800 text-sm font-medium">設定が必要です</p>
                  <p className="text-amber-700 text-sm">
                    設定ボタン（⚙️）をクリックしてLiveKitアクセストークンを設定してください。
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

        {/* Instructions */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <p>Configure your LiveKit server URL and access token using the settings button (⚙️)</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <p>Make sure your Python voice agent is running: <code className="bg-gray-100 px-2 py-1 rounded">python agent.py dev</code></p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <p>Click the green connect button and allow microphone access when prompted</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
              <p>Start speaking naturally - your voice agent will respond in real-time</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-xs">
              <strong>Note:</strong> If you're in a development environment without microphone access, 
              you can still connect to test the LiveKit connection. The voice agent will work properly 
              when deployed to a device with microphone access.
              The agent should automatically greet you when you connect.
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