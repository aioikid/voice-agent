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
            <p className="text-xs text-gray-500 mt-1">
              例: wss://talktune-exng0106.livekit.cloud
            </p>
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
            <p className="text-xs text-gray-500 mt-1">
              LiveKit Cloudのダッシュボードで生成したアクセストークンを入力してください
            </p>
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
            <p className="text-xs text-gray-500 mt-1">
              Pythonエージェントと同じルーム名を使用してください（例: talktune）
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 設定手順:</h4>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. <a href="https://cloud.livekit.io/" target="_blank" rel="noopener noreferrer" className="underline">LiveKit Cloud</a> でアクセストークンを生成</li>
              <li>2. Room Name を "talktune" に設定</li>
              <li>3. Pythonエージェントが起動していることを確認</li>
              <li>4. 保存してから接続ボタンをクリック</li>
            </ol>
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