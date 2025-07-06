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
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this browser');
        setState(prev => ({ 
          ...prev, 
          error: 'このブラウザではマイクアクセスがサポートされていません。Chrome、Firefox、Safari等の最新ブラウザをご利用ください。' 
        }));
        return;
      }

      // First, request microphone permission explicitly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        // Now enable microphone through LiveKit
        await room.localParticipant.enableCameraAndMicrophone(false, true);
        console.log('LiveKit microphone enabled successfully');
        
      } catch (permissionError) {
        console.error('Microphone permission error:', permissionError);
        
        if (permissionError instanceof Error) {
          if (permissionError.name === 'NotAllowedError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。' 
            }));
          } else if (permissionError.name === 'NotFoundError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクが見つかりません。マイクが接続されていることを確認してください。' 
            }));
          } else if (permissionError.name === 'NotReadableError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクが他のアプリケーションで使用されています。他のアプリを閉じてから再試行してください。' 
            }));
          } else if (permissionError.name === 'OverconstrainedError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクの設定に問題があります。ブラウザを再起動してお試しください。' 
            }));
          } else {
            setState(prev => ({ 
              ...prev, 
              error: `マイクアクセスエラー: ${permissionError.message}` 
            }));
          }
        }
        return;
      }
      
    } catch (error) {
      console.error('LiveKit microphone setup failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'LiveKitマイクセットアップに失敗しました。ページを更新してお試しください。' 
      }));
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