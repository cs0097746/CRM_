#!/usr/bin/env python3
"""
Teste específico para debug do FFmpeg com dados simulados do WhatsApp
"""
import os
import sys
import base64
import logging

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.dirname(__file__))

import django
django.setup()

from core.ffmpeg_service import FFmpegService

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_ffmpeg_with_fake_audio():
    """Testa FFmpeg com dados simulados de áudio"""
    
    # Dados base64 simulados de um arquivo OGG muito simples
    # Este é um cabeçalho OGG básico para teste
    fake_ogg_header = (
        b'OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00'
        b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        b'\x1e\x01vorbis\x00\x00\x00\x00\x02\x44\xac\x00\x00'
        b'\x00\x00\x00\x00\x00\x03\x00\x00\x00\x00\x00\x01'
    )
    
    logger.info(f"🧪 Testando com dados simulados OGG ({len(fake_ogg_header)} bytes)")
    
    # Verificar detecção de formato
    detected_format = FFmpegService.detect_audio_format(fake_ogg_header)
    logger.info(f"🔍 Formato detectado: {detected_format}")
    
    # Tentar conversão
    success, mp3_data, message = FFmpegService.convert_to_mp3(fake_ogg_header)
    
    if success and mp3_data:
        logger.info(f"✅ Sucesso na conversão! MP3 gerado: {len(mp3_data)} bytes")
    else:
        logger.error(f"❌ Falha na conversão: {message}")
    
    return success

def test_ffmpeg_with_empty_data():
    """Testa FFmpeg com dados vazios"""
    logger.info("🧪 Testando com dados vazios")
    
    success, mp3_data, message = FFmpegService.convert_to_mp3(b'')
    
    if success:
        logger.error("⚠️ Sucesso inesperado com dados vazios!")
    else:
        logger.info(f"✅ Falha esperada com dados vazios: {message}")
    
    return not success  # Sucesso se falhou (comportamento esperado)

def test_ffmpeg_with_small_data():
    """Testa FFmpeg com poucos dados"""
    logger.info("🧪 Testando com dados muito pequenos")
    
    small_data = b'tiny'
    success, mp3_data, message = FFmpegService.convert_to_mp3(small_data)
    
    if success:
        logger.error("⚠️ Sucesso inesperado com dados muito pequenos!")
    else:
        logger.info(f"✅ Falha esperada com dados pequenos: {message}")
    
    return not success  # Sucesso se falhou (comportamento esperado)

def main():
    """Executa todos os testes"""
    logger.info("🎵 Iniciando testes de debug do FFmpeg")
    
    # Verificar se FFmpeg está disponível
    try:
        ffmpeg_path = FFmpegService.get_ffmpeg_path()
        logger.info(f"🔧 FFmpeg encontrado em: {ffmpeg_path}")
    except Exception as e:
        logger.error(f"❌ FFmpeg não encontrado: {e}")
        return False
    
    tests = [
        ("Dados vazios", test_ffmpeg_with_empty_data),
        ("Dados pequenos", test_ffmpeg_with_small_data),
        ("Dados simulados OGG", test_ffmpeg_with_fake_audio),
    ]
    
    results = []
    for name, test_func in tests:
        logger.info(f"\n--- Teste: {name} ---")
        try:
            result = test_func()
            results.append((name, result))
            logger.info(f"{'✅' if result else '❌'} {name}: {'PASSOU' if result else 'FALHOU'}")
        except Exception as e:
            logger.error(f"❌ Erro no teste {name}: {e}")
            results.append((name, False))
    
    # Resumo
    logger.info("\n=== RESUMO DOS TESTES ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        logger.info(f"{'✅' if result else '❌'} {name}")
    
    logger.info(f"\nResultado: {passed}/{total} testes passaram")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)