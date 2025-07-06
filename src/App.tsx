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
                        
                        // より詳細な環境診断
                        console.log('=== 🔍 環境診断開始 ===');
                        console.log('User Agent:', navigator.userAgent);
                        console.log('URL:', window.location.href);
                        console.log('Secure Context:', window.isSecureContext);
                        console.log('MediaDevices available:', !!navigator.mediaDevices);
                        console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
                        
                        // デバイス一覧を確認
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const audioInputs = devices.filter(device => device.kind === 'audioinput');
                        console.log('Available audio devices (before permission):', audioInputs);
                        console.log('Audio devices detail:', audioInputs.map(device => ({
                          deviceId: device.deviceId,
                          label: device.label,
                          groupId: device.groupId
                        })));
                        
                        // 権限状態を確認
                        let permissionState = 'unknown';
                        try {
                          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                          permissionState = permission.state;
                          console.log('Microphone permission state:', permission.state);
                        } catch (permError) {
                          console.log('Permission query not supported:', permError);
                        }
                        
                        // 複数の方法でマイクアクセスを試行
                        console.log('=== 🎤 マイクアクセステスト開始 ===');
                        
                        // 方法1: 基本的なgetUserMedia
                        let testResult = null;
                        try {
                          console.log('方法1: 基本的なgetUserMedia');
                          const stream1 = await navigator.mediaDevices.getUserMedia({ audio: true });
                          const tracks1 = stream1.getAudioTracks();
                          console.log('✅ 基本的なgetUserMedia成功:', tracks1.length, 'tracks');
                          testResult = { method: '基本的なgetUserMedia', tracks: tracks1.length };
                          stream1.getTracks().forEach(track => track.stop());
                        } catch (error1) {
                          console.log('❌ 基本的なgetUserMedia失敗:', error1);
                        }
                        
                        // 方法2: 制約付きgetUserMedia
                        if (!testResult) {
                          try {
                            console.log('方法2: 制約付きgetUserMedia');
                            const stream2 = await navigator.mediaDevices.getUserMedia({ 
                              audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true
                              }
                            });
                            const tracks2 = stream2.getAudioTracks();
                            console.log('✅ 制約付きgetUserMedia成功:', tracks2.length, 'tracks');
                            testResult = { method: '制約付きgetUserMedia', tracks: tracks2.length };
                            stream2.getTracks().forEach(track => track.stop());
                          } catch (error2) {
                            console.log('❌ 制約付きgetUserMedia失敗:', error2);
                          }
                        }
                        
                        // 方法3: 特定デバイスでgetUserMedia
                        if (!testResult && audioInputs.length > 0) {
                          try {
                            console.log('方法3: 特定デバイスでgetUserMedia');
                            const deviceId = audioInputs[0].deviceId;
                            const stream3 = await navigator.mediaDevices.getUserMedia({ 
                              audio: { deviceId: { exact: deviceId } }
                            });
                            const tracks3 = stream3.getAudioTracks();
                            console.log('✅ 特定デバイスgetUserMedia成功:', tracks3.length, 'tracks');
                            testResult = { method: '特定デバイスgetUserMedia', tracks: tracks3.length };
                            stream3.getTracks().forEach(track => track.stop());
                          } catch (error3) {
                            console.log('❌ 特定デバイスgetUserMedia失敗:', error3);
                          }
                        }
                        
                        // 権限取得後のデバイス一覧を再確認
                        const devicesAfter = await navigator.mediaDevices.enumerateDevices();
                        const audioInputsAfter = devicesAfter.filter(device => device.kind === 'audioinput');
                        console.log('Available audio devices (after permission):', audioInputsAfter);
                        
                        // システム情報も取得
                        const systemInfo = {
                          platform: navigator.platform,
                          userAgent: navigator.userAgent,
                          language: navigator.language,
                          onLine: navigator.onLine,
                          cookieEnabled: navigator.cookieEnabled
                        };
                        console.log('System info:', systemInfo);
                        
                        if (testResult) {
                          alert(`🎉 マイクアクセス成功！\n\n✅ 成功した方法: ${testResult.method}\n🎤 利用可能なマイク: ${audioInputsAfter.length}個\n🔐 権限状態: ${permissionState}\n📊 アクティブトラック: ${testResult.tracks}個\n💻 プラットフォーム: ${systemInfo.platform}\n\n音声エージェントに接続できます。`);
                        } else {
                          alert(`❌ マイクアクセス失敗\n\n🎤 検出されたマイク: ${audioInputsAfter.length}個\n🔐 権限状態: ${permissionState}\n💻 プラットフォーム: ${systemInfo.platform}\n\n🔧 対処法:\n1. マイクが正しく接続されているか確認\n2. システムのサウンド設定を確認\n3. 他のアプリケーションを終了\n4. ブラウザを再起動\n5. 別のブラウザで試行`);
                        }
                      } catch (error) {
                        console.error('Manual microphone test failed:', error);
                        if (error instanceof Error) {
                          let errorDetails = `❌ マイクアクセス失敗\n\nエラー名: ${error.name}\nメッセージ: ${error.message}\n\n`;
                          
                          switch (error.name) {
                            case 'NotAllowedError':
                              errorDetails += '🔒 解決方法:\n1. アドレスバー左側の🔒マークをクリック\n2. マイクを「許可」に設定\n3. ページを更新';
                              break;
                            case 'NotFoundError':
                              errorDetails += '🎤 解決方法:\n1. マイクが正しく接続されているか確認\n2. システムのサウンド設定を確認\n3. デバイスマネージャーを確認';
                              break;
                            case 'NotReadableError':
                              errorDetails += '🚫 解決方法:\n1. 他のアプリ（Zoom、Teams等）を終了\n2. ブラウザを再起動\n3. PCを再起動';
                              break;
                            default:
                              errorDetails += '🔧 一般的な解決方法:\n1. ブラウザを再起動\n2. 別のブラウザで試行\n3. PCを再起動';
                          }
                          
                          alert(errorDetails);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    🎤 詳細マイクテスト
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