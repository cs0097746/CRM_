# backend/test_ffmpeg_conversion.py - Teste de conversão de áudio

import sys
import os
import django

# Configurar o Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.ffmpeg_service import FFmpegService
import base64

def test_ffmpeg_conversion():
    """Teste básico de conversão de áudio"""
    print("🧪 Testando conversão de áudio com FFmpeg...")
    
    # Verificar se o FFmpeg está disponível
    ffmpeg_path = FFmpegService.get_ffmpeg_path()
    print(f"🔧 FFmpeg path: {ffmpeg_path}")
    
    # Criar um arquivo de áudio de teste simples (silence)
    import tempfile
    import subprocess
    
    try:
        # Criar um arquivo de áudio de teste usando FFmpeg
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as test_file:
            test_audio_path = test_file.name
        
        # Gerar 1 segundo de silêncio
        cmd = [
            ffmpeg_path,
            '-f', 'lavfi',
            '-i', 'anullsrc=r=44100:cl=stereo',
            '-t', '1',
            '-y',
            test_audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Erro ao criar arquivo de teste: {result.stderr}")
            return False
        
        print("✅ Arquivo de teste criado com sucesso")
        
        # Ler o arquivo e testar conversão
        with open(test_audio_path, 'rb') as f:
            audio_bytes = f.read()
        
        print(f"📁 Tamanho do arquivo de teste: {len(audio_bytes)} bytes")
        
        # Testar conversão
        success, mp3_bytes, message = FFmpegService.convert_to_mp3(audio_bytes)
        
        if success:
            print(f"✅ Conversão bem-sucedida! MP3 size: {len(mp3_bytes)} bytes")
            print(f"📝 Mensagem: {message}")
            
            # Salvar MP3 para teste
            with open('test_output.mp3', 'wb') as f:
                f.write(mp3_bytes)
            print("💾 Arquivo MP3 salvo como 'test_output.mp3'")
            
        else:
            print(f"❌ Conversão falhou: {message}")
            
        # Limpar arquivo de teste
        os.unlink(test_audio_path)
        
        return success
        
    except Exception as e:
        print(f"💥 Erro no teste: {e}")
        return False

if __name__ == "__main__":
    success = test_ffmpeg_conversion()
    if success:
        print("🎉 Teste de conversão concluído com sucesso!")
    else:
        print("❌ Teste de conversão falhou!")