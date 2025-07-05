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

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        
        // Start audio level monitoring
        audioLevelInterval.current = setInterval(updateAudioLevel, 100);
        
        // Enable microphone after connection
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
          console.log('Audio track subscribed - agent is speaking');
          
          // Ensure the audio track is played
          const audioElement = track.attach();
          if (audioElement) {
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
            console.log('Audio element attached and added to DOM');
          }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, isListening: false }));
          console.log('Audio track unsubscribed - agent finished speaking');
          
          // Clean up audio element
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach(element => {
            if (element.srcObject === track.mediaStream) {
              element.remove();
            }
          });
        }
      });

      // Connect to the room
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
        console.warn('getUserMedia not supported in this environment');
        // Don't set error state for development environments
        return;
      }

      // Request microphone permission and enable
      await room.localParticipant.enableCameraAndMicrophone(false, true);
      
    } catch (error) {
      console.warn('Microphone not available in this environment:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setState(prev => ({ ...prev, error: 'マイクアクセスが拒否されました。マイクアクセスを許可してページを更新してください。' }));
        } else if (error.name === 'NotFoundError') {
          // In development environment, don't show error for missing microphone
          console.info('開発環境ではマイクが利用できません。実際のデバイスでは正常に動作します。');
        } else if (error.name === 'NotReadableError') {
          setState(prev => ({ ...prev, error: 'マイクが他のアプリケーションで使用されています。' }));
        } else {
          console.info('マイクセットアップに失敗しましたが、接続は可能です。');
        }
      } else {
        console.info('マイクセットアップに失敗しましたが、接続は可能です。');
      }
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

  // Cleanup on unmount
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