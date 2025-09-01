import { useCallback } from 'react';

export const useNotificationSound = () => {
  const playSound = useCallback((type: 'message' | 'alert' | 'success' = 'message') => {
    try {
      // Criar diferentes sons para diferentes tipos
      const frequency = type === 'message' ? 800 : type === 'alert' ? 400 : 1000;
      const duration = type === 'alert' ? 200 : 150;
      
      // Usar Web Audio API para gerar som
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
    } catch (error) {
      console.log('Som de notificação não disponível:', error);
    }
  }, []);

  return { playSound };
};