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
        console.log('✅ Room connected successfully');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        enableMicrophone(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Room disconnected');
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
        console.log('📥 Track subscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: true }));
          const audioElement = track.attach();
          if (audioElement) {
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
            console.log('🔊 Audio element attached and playing');
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log('📤 Track unsubscribed:', track.kind);
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

      console.log('🔗 Connecting to room...');
      await room.connect(config.url, config.token);
      
    } catch (error) {
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
      const audioTrack = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
      if (audioTrack) {
        const newMutedState = !audioTrack.isMuted;
        audioTrack.setMuted(newMutedState);
        setState(prev => ({ ...prev, isMuted: newMutedState }));
        console.log('🔇 Microphone muted:', newMutedState);
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