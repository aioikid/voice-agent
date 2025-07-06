import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
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

  // RoomオブジェクトをuseRefで管理
  const roomRef = useRef<Room>(new Room());
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  const updateAudioLevel = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      return;
    }
    const p = room.localParticipant;
    const level = p.audioLevel;
    
    // UI表示用に音声レベルを更新
    setState(prev => ({ ...prev, audioLevel: level }));
  }, []);

  const connect = useCallback(async (roomName: string, identity: string) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // サーバーの/tokenエンドポイントにリクエストしてトークンを取得
      const response = await fetch(`/token?room_name=${roomName}&identity=${identity}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get token: ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      const token = data.token;
      
      const room = roomRef.current;

      // ルームイベントのリスナーを設定
      room
        .on(RoomEvent.Disconnected, () => {
          console.log('🔌 Room disconnected');
          setState(prev => ({ ...prev, isConnected: false, isConnecting: false, isListening: false }));
          if (audioLevelInterval.current) {
            clearInterval(audioLevelInterval.current);
          }
        })
        .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Audio) {
                const audioElement = track.attach();
                document.body.appendChild(audioElement);
                console.log('🔊 Remote audio track subscribed and attached');
            }
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach(element => element.remove());
        });

      // 取得したトークンでLiveKitに接続
      await room.connect(config.url, token);
      console.log('✅ Room connected successfully');
      
      // 接続完了後の状態更新
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));

      // マイクを有効化
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('✅ Microphone enabled');
      
      // オーディオレベルの監視を開始
      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = setInterval(updateAudioLevel, 200);

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config.url, updateAudioLevel]); // 依存配列を修正

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      console.log('🔌 Disconnecting from room...');
    }
    if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (roomRef.current) {
      const isMuted = roomRef.current.localParticipant.isMicrophoneEnabled;
      roomRef.current.localParticipant.setMicrophoneEnabled(!isMuted);
      setState(prev => ({ ...prev, isMuted: !isMuted }));
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