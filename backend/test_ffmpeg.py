# backend/test_ffmpeg.py - Teste para verificar FFmpeg

import subprocess
import sys

def check_ffmpeg():
    """Verifica se FFmpeg está instalado no sistema"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ FFmpeg encontrado: {version_line}")
            return True
        else:
            print(f"❌ FFmpeg erro: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ FFmpeg não encontrado no sistema")
        print("📥 Para instalar FFmpeg:")
        print("   - Windows: Baixe de https://ffmpeg.org/download.html")
        print("   - Ou use chocolatey: choco install ffmpeg")
        print("   - Ou use winget: winget install FFmpeg.FFmpeg")
        return False
    except Exception as e:
        print(f"❌ Erro ao verificar FFmpeg: {e}")
        return False

def check_ffprobe():
    """Verifica se FFprobe está instalado no sistema"""
    try:
        result = subprocess.run(['ffprobe', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ FFprobe encontrado: {version_line}")
            return True
        else:
            print(f"❌ FFprobe erro: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ FFprobe não encontrado (vem junto com FFmpeg)")
        return False
    except Exception as e:
        print(f"❌ Erro ao verificar FFprobe: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Verificando instalação do FFmpeg...")
    
    ffmpeg_ok = check_ffmpeg()
    ffprobe_ok = check_ffprobe()
    
    if ffmpeg_ok and ffprobe_ok:
        print("\n✅ Sistema pronto para conversão de áudio!")
        sys.exit(0)
    else:
        print("\n❌ FFmpeg não está instalado corretamente")
        print("🔧 Instale o FFmpeg antes de continuar")
        sys.exit(1)