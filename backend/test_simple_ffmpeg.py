"""
Script simples para testar FFmpeg sem Django
"""
import subprocess
import tempfile
import os

def find_ffmpeg():
    """Encontra o executável FFmpeg"""
    possible_paths = [
        'ffmpeg',
        'ffmpeg.exe',
        r'C:\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe'
    ]
    
    for path in possible_paths:
        try:
            result = subprocess.run([path, '-version'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f"✅ FFmpeg encontrado em: {path}")
                return path
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            continue
    
    print("❌ FFmpeg não encontrado!")
    return None

def test_ffmpeg_basic():
    """Teste básico do FFmpeg"""
    ffmpeg_path = find_ffmpeg()
    if not ffmpeg_path:
        return False
    
    # Criar arquivo de teste muito simples (apenas cabeçalho OGG)
    test_data = b'OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00' * 10  # Dados repetidos para ter tamanho mínimo
    
    with tempfile.NamedTemporaryFile(suffix='.ogg', delete=False) as input_file:
        input_file.write(test_data)
        input_path = input_file.name
    
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as output_file:
        output_path = output_file.name
    
    try:
        # Comando simples do FFmpeg
        cmd = [ffmpeg_path, '-i', input_path, '-y', output_path]
        print(f"🎵 Executando: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        print(f"Return code: {result.returncode}")
        print(f"Stdout: {result.stdout}")
        print(f"Stderr: {result.stderr}")
        
        if result.returncode == 0:
            print("✅ FFmpeg executou sem erros!")
            return True
        else:
            print(f"❌ FFmpeg falhou com código: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        return False
    finally:
        # Limpar arquivos temporários
        try:
            os.unlink(input_path)
            os.unlink(output_path)
        except:
            pass

if __name__ == "__main__":
    print("🧪 Teste simples do FFmpeg")
    success = test_ffmpeg_basic()
    print(f"\nResultado: {'✅ SUCESSO' if success else '❌ FALHA'}")