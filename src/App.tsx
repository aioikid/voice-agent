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
                        <p className="font-medium mb-2 mt-3">Firefox:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>アドレスバー左側の盾マークをクリック</li>
                          <li>「マイクロフォン」の権限を許可</li>
                          <li>ページを更新</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {state.error.includes('マイクが見つかりません') && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm font-medium">🔧 マイク接続確認</p>
                      <div className="text-amber-700 text-sm mt-2">
                        <ul className="list-disc list-inside space-y-1">
                          <li>マイクが正しく接続されているか確認</li>
                          <li>他のアプリケーション（Zoom、Teams等）を閉じる</li>
                          <li>ブラウザを再起動</li>
                          <li>システムのマイク設定を確認</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {state.error.includes('他のアプリケーション') && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm font-medium">🚫 マイク使用中</p>
                      <div className="text-red-700 text-sm mt-2">
                        <p>以下のアプリケーションを閉じてから再試行してください：</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                          <li>Zoom、Microsoft Teams、Skype</li>
                          <li>他のブラウザタブでの音声通話</li>
                          <li>録音アプリケーション</li>
                          <li>音声認識ソフト</li>
                        </ul>
                      </div>
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
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    <p><strong>マイクが動作しない場合:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>ブラウザでマイクアクセスを許可してください</li>
                      <li>他のアプリケーション（Zoom、Teams等）を閉じてください</li>
                      <li>ページを更新してから再接続してください</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Microphone Test */}
          {!state.error && !state.isConnected && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-green-600 mt-0.5">🎤</div>
                <div>
                  <p className="text-green-800 text-sm font-medium">マイクテスト</p>
                  <p className="text-green-700 text-sm mb-3">
                    接続前にマイクが正常に動作するかテストできます。
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        console.log('Manual microphone test started');
                        
                        // デバイス一覧を確認
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const audioInputs = devices.filter(device => device.kind === 'audioinput');
                        console.log('Available audio devices:', audioInputs);
                        
                        // 権限状態を確認
                        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                        console.log('Microphone permission state:', permission.state);
                        
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      // より詳細なデバイス情報を表示
                      console.log('All devices:', devices);
                      console.log('Audio inputs detail:', audioInputs.map(device => ({
                        deviceId: device.deviceId,
                        label: device.label,
                        groupId: device.groupId
                      })));
                      
                        console.log('Microphone test successful:', stream);
                        alert(`マイクアクセス成功！\n利用可能なマイク: ${audioInputs.length}個\n権限状態: ${permission.state}\n音声エージェントに接続できます。`);
                      
                      // ストリームの詳細情報を取得
                      const tracks = stream.getAudioTracks();
                      const trackInfo = tracks.map(track => ({
                        label: track.label,
                        deviceId: track.getSettings().deviceId,
                        enabled: track.enabled,
                        muted: track.muted,
                        readyState: track.readyState
                      }));
                      console.log('Audio tracks:', trackInfo);
                      
                      alert(`マイクアクセス成功！\n利用可能なマイク: ${audioInputs.length}個\n権限状態: ${permission.state}\nアクティブトラック: ${tracks.length}個\n音声エージェントに接続できます。`);
                      } catch (error) {
                        console.error('Manual microphone test failed:', error);
                        if (error instanceof Error) {
                          alert(`マイクアクセス失敗:\nエラー名: ${error.name}\nメッセージ: ${error.message}\n\nブラウザの設定でマイクアクセスを許可してください。`);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    マイクテスト
                  </button>
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