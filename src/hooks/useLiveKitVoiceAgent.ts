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
    if (!roomRef.current) {
      return;
    }

    const p = roomRef.current.localParticipant;
    // p.audioLevel から音声レベルを取得する
    const level = p.audioLevel;

    setState(prev => ({ ...prev, audioLevel: level }));
  }, []); // ← セミコロンが不要なケースでした。申し訳ありません。

  const enableMicrophone = useCallback(async (room: Room) => {
    try {
      console.log('🎤 LiveKit標準の方法でマイクを有効化します...');
      
      // この一行でマイクの有効化、トラックの取得、公開までを安全に行う
      await room.localParticipant.setMicrophoneEnabled(true);
      
      console.log('✅ マイクが正常に有効化されました');

    } catch (error) {
      console.error('❌ マイクの有効化に失敗しました:', error);

      if (error instanceof Error) {
        let errorMessage = '';
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'マイクアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。';
            break;
          case 'NotFoundError':
            errorMessage = 'マイクが見つかりません。マイクがPCに接続されているか確認してください。';
            break;
          case 'NotReadableError':
            errorMessage = 'マイクが他のアプリケーションで使用されています。他のアプリを閉じてから再試行してください。';
            break;
          case 'OverconstrainedError':
            errorMessage = 'マイクの設定に問題があります。ブラウザを再起動してお試しください。';
            break;
          default:
            errorMessage = `マイクアクセスエラー: ${error.message}`;
        }
        setState(prev => ({ ...prev, error: errorMessage }));
      } else {
        setState(prev => ({ ...prev, error: '原因不明のエラーでマイクを有効化できませんでした。' }));
      }
    }
  }, []);

  const connect = useCallback(async (roomName: string, identity: string) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // サーバーの/tokenエンドポイントにリクエスト
      const response = await fetch(`/token?room_name=${roomName}&identity=${identity}`);
      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.statusText}`);
      }
      const data = await response.json();
      const token = data.token;
      
      // 取得したトークンでLiveKitに接続
      await roomRef.current.connect(config.url, token);

      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      // ...（マイク有効化などの処理はここから）...
      roomRef.current.localParticipant.setMicrophoneEnabled(true);

    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config]);
      
      catch (error) {
      console.error('❌ Failed to connect:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config, updateAudioLevel, enableMicrophone]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from room...');
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
      // audioTrackPublications をループして、公開されているオーディオトラックを操作する
      roomRef.current.localParticipant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          const newMutedState = !publication.track.isMuted;
          publication.track.setMuted(newMutedState);
          setState(prev => ({ ...prev, isMuted: newMutedState }));
          console.log('🔇 Microphone muted:', newMutedState);
        }
      });
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