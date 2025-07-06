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
      // より詳細なマイクアクセス診断を実行
      console.log('Starting microphone access...');
      console.log('Navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('Current URL:', window.location.href);
      console.log('Is secure context:', window.isSecureContext);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // デバイス一覧を取得して確認
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('Available audio input devices:', audioInputs);
      console.log('Device details:', audioInputs.map(device => ({
        deviceId: device.deviceId,
        label: device.label,
        groupId: device.groupId
      })));
      
      if (audioInputs.length === 0) {
        throw new Error('No audio input devices found');
      }

      // 権限状態を確認
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission state:', permission.state);
      } catch (permError) {
        console.log('Permission query failed:', permError);
      }

      // より具体的な制約でマイクアクセスを試行
      try {
        console.log('Requesting microphone access...');
        
        // まず基本的な制約で試行
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted successfully');
        console.log('Stream tracks:', stream.getTracks());
        
        // トラックの詳細情報を取得
        const tracks = stream.getAudioTracks();
        tracks.forEach((track, index) => {
          console.log(`Track ${index}:`, {
            label: track.label,
            deviceId: track.getSettings().deviceId,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings(),
            capabilities: track.getCapabilities()
          });
        });
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        // Now enable microphone through LiveKit
        console.log('Enabling microphone through LiveKit...');
        
        // 複数の方法でLiveKitマイクアクセスを試行
        let microphoneEnabled = false;
        
        // 方法1: デフォルトデバイスで試行
        try {
          console.log('Trying default device...');
          await room.localParticipant.enableCameraAndMicrophone(false, true);
          microphoneEnabled = true;
          console.log('Default device successful');
        } catch (defaultError) {
          console.log('Default device failed:', defaultError);
        }
        
        // 方法2: 特定のデバイスIDで試行
        if (!microphoneEnabled && audioInputs.length > 0) {
          for (const device of audioInputs) {
            if (device.deviceId && device.deviceId !== 'default') {
              try {
                console.log(`Trying device: ${device.label} (${device.deviceId})`);
                await room.localParticipant.enableCameraAndMicrophone(false, true, {
                  audio: {
                    deviceId: { exact: device.deviceId }
                  }
                });
                microphoneEnabled = true;
                console.log(`Device ${device.label} successful`);
                break;
              } catch (deviceError) {
                console.log(`Device ${device.label} failed:`, deviceError);
              }
            }
          }
        }
        
        // 方法3: より基本的な制約で試行
        if (!microphoneEnabled) {
          try {
            console.log('Trying with basic audio constraints...');
            await room.localParticipant.enableCameraAndMicrophone(false, true, {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
            microphoneEnabled = true;
            console.log('Basic constraints successful');
          } catch (basicError) {
            console.log('Basic constraints failed:', basicError);
          }
        }
        
        if (!microphoneEnabled) {
          throw new Error('All microphone access methods failed');
        }
        
        console.log('LiveKit microphone enabled successfully');
        
      } catch (permissionError) {
        console.error('Microphone access error:', permissionError);
        console.error('Error name:', permissionError.name);
        console.error('Error message:', permissionError.message);
        
        if (permissionError instanceof Error) {
          if (permissionError.name === 'NotAllowedError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクアクセスが拒否されました。ブラウザのアドレスバー左側の🔒マークをクリックして、マイクを「許可」に設定してください。' 
            }));
          } else if (permissionError.name === 'NotFoundError') {
            setState(prev => ({ 
              ...prev, 
              error: `マイクデバイスが見つかりません。利用可能なデバイス数: ${audioInputs.length}。システムのマイク設定を確認してください。` 
            }));
          } else if (permissionError.name === 'NotReadableError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクが他のアプリケーション（Zoom、Teams等）で使用中です。他のアプリを閉じてブラウザを再起動してください。' 
            }));
          } else if (permissionError.name === 'OverconstrainedError') {
            setState(prev => ({ 
              ...prev, 
              error: 'マイクの制約設定に問題があります。より基本的な設定で再試行します。' 
            }));
            
            // より基本的な制約で再試行
            try {
              console.log('Retrying with basic audio constraints...');
              const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              console.log('Basic microphone access successful');
              basicStream.getTracks().forEach(track => track.stop());
              await room.localParticipant.enableCameraAndMicrophone(false, true);
              console.log('LiveKit microphone enabled with basic settings');
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              setState(prev => ({ 
                ...prev, 
                error: `マイクアクセスに失敗しました: ${retryError.message}` 
              }));
            }
          } else {
            setState(prev => ({ 
              ...prev, 
              error: `マイクアクセスエラー (${permissionError.name}): ${permissionError.message}` 
            }));
          }
        }
        return;
      }
      
    } catch (error) {
      console.error('LiveKit microphone setup failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: `LiveKitマイクセットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` 
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