# backend/core/ffmpeg_service.py - Serviço para conversão de áudio com FFmpeg

import asyncio
import subprocess
import logging
import tempfile
import os
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

class FFmpegService:
    """Serviço para conversão de áudio usando FFmpeg"""
    
    @staticmethod
    def get_ffmpeg_path():
        """Detecta automaticamente o caminho do FFmpeg"""
        # Tenta usar a versão do PATH (variável de ambiente)
        import shutil
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            return ffmpeg_path
        
        # Fallback para caminhos comuns no Windows
        possible_paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",  # Sua instalação manual
            r"C:\Program Files\FFmpeg\bin\ffmpeg.exe",
            r"C:\Program Files (x86)\FFmpeg\bin\ffmpeg.exe",
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        # Se não encontrar, usa 'ffmpeg' e deixa o sistema resolver
        return 'ffmpeg'
    
    @staticmethod
    def get_ffprobe_path():
        """Detecta automaticamente o caminho do FFprobe"""
        import shutil
        ffprobe_path = shutil.which('ffprobe')
        if ffprobe_path:
            return ffprobe_path
        
        # Fallback para caminhos comuns no Windows
        possible_paths = [
            r"C:\ffmpeg\bin\ffprobe.exe",  # Sua instalação manual
            r"C:\Program Files\FFmpeg\bin\ffprobe.exe",
            r"C:\Program Files (x86)\FFmpeg\bin\ffprobe.exe",
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        return 'ffprobe'
    
    @staticmethod
    def detect_audio_format(input_bytes: bytes) -> str:
        """Detecta o formato do áudio pelos bytes iniciais"""
        if len(input_bytes) < 12:
            return "unknown"
        
        # Verifica assinaturas de formatos conhecidos
        if input_bytes[:3] == b'ID3' or input_bytes[:2] == b'\xff\xfb':
            return "mp3"
        elif input_bytes[:4] == b'OggS':
            return "ogg"
        elif input_bytes[:4] == b'RIFF' and input_bytes[8:12] == b'WAVE':
            return "wav"
        elif input_bytes[:4] == b'fLaC':
            return "flac"
        elif input_bytes[:8] == b'#!AMR\n' or input_bytes[:6] == b'#!AMR-':
            return "amr"
        else:
            return "unknown"
    
    @staticmethod
    def convert_to_mp3(input_bytes: bytes, output_bitrate: str = "128k") -> Tuple[bool, Optional[bytes], str]:
        """
        Converte um buffer de bytes de áudio para o formato MP3 usando FFmpeg.
        
        Args:
            input_bytes: Os bytes do arquivo de áudio de entrada
            output_bitrate: Bitrate de saída (padrão: 128k)
            
        Returns:
            Tuple[success: bool, mp3_bytes: Optional[bytes], message: str]
        """
        logger.info(f"🎵 FFmpeg: Iniciando conversão para MP3. Tamanho: {len(input_bytes)} bytes")
        
        # Validar entrada
        if len(input_bytes) < 100:
            error_msg = f"Arquivo muito pequeno para ser um áudio válido: {len(input_bytes)} bytes"
            logger.error(f"❌ FFmpeg: {error_msg}")
            return False, None, error_msg
        
        # Detectar formato do áudio
        audio_format = FFmpegService.detect_audio_format(input_bytes)
        logger.info(f"🎵 FFmpeg: Formato detectado: {audio_format}")
        
        # Log dos primeiros bytes para debug
        preview_bytes = input_bytes[:50] if len(input_bytes) >= 50 else input_bytes
        logger.info(f"🎵 FFmpeg: Primeiros bytes: {preview_bytes}")
        
        # Validar se é um arquivo OGG válido do WhatsApp
        if audio_format == 'ogg':
            # Verificar se tem a estrutura básica do OGG
            if not input_bytes.startswith(b'OggS'):
                error_msg = "Arquivo OGG inválido - não tem cabeçalho OggS"
                logger.error(f"❌ FFmpeg: {error_msg}")
                return False, None, error_msg
                
            # Verificar se tem tamanho mínimo para OGG válido
            if len(input_bytes) < 200:  # OGG precisa de pelo menos alguns headers
                error_msg = f"Arquivo OGG muito pequeno: {len(input_bytes)} bytes"
                logger.error(f"❌ FFmpeg: {error_msg}")
                return False, None, error_msg
                
        # Criar arquivos temporários com extensão apropriada
        input_suffix = f'.{audio_format}' if audio_format != 'unknown' else '.ogg'  # WhatsApp geralmente usa OGG
        with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as input_file:
            input_file.write(input_bytes)
            input_path = input_file.name
            
        # Verificar se o arquivo foi criado corretamente
        if not os.path.exists(input_path) or os.path.getsize(input_path) == 0:
            error_msg = "Arquivo temporário de entrada não foi criado corretamente"
            logger.error(f"❌ FFmpeg: {error_msg}")
            return False, None, error_msg
            
        logger.info(f"🎵 FFmpeg: Arquivo temporário criado: {input_path} ({os.path.getsize(input_path)} bytes)")
            
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as output_file:
            output_path = output_file.name
        
        try:
            # Comando FFmpeg para conversão
            cmd = [
                FFmpegService.get_ffmpeg_path(),
                '-i', input_path,           # Arquivo de entrada
                '-y',                       # Sobrescrever saída se existir
                '-acodec', 'mp3',          # Codec de áudio MP3
                '-ab', output_bitrate,      # Bitrate
                '-ar', '44100',            # Sample rate
                '-ac', '2',                # Canais (estéreo)
                '-f', 'mp3',               # Formato de saída
                output_path                # Arquivo de saída
            ]
            
            logger.info(f"🎵 FFmpeg: Executando comando: {' '.join(cmd)}")
            
            # Executar comando
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # Aumentado para 60 segundos
            )
            
            logger.info(f"🎵 FFmpeg: Return code: {result.returncode}")
            if result.stderr:
                logger.info(f"🎵 FFmpeg stderr: {result.stderr}")
            
            if result.returncode == 0:
                # Ler arquivo convertido
                with open(output_path, 'rb') as f:
                    mp3_bytes = f.read()
                
                logger.info(f"✅ FFmpeg: Conversão concluída. Tamanho final: {len(mp3_bytes)} bytes")
                return True, mp3_bytes, "Conversão realizada com sucesso"
            else:
                error_msg = f"FFmpeg erro (código {result.returncode}): {result.stderr}"
                logger.error(f"❌ FFmpeg: {error_msg}")
                return False, None, error_msg
                
        except subprocess.TimeoutExpired:
            error_msg = "FFmpeg timeout - conversão demorou mais que 30 segundos"
            logger.error(f"⏰ FFmpeg: {error_msg}")
            return False, None, error_msg
            
        except FileNotFoundError:
            error_msg = "FFmpeg não encontrado. Instale o FFmpeg no sistema"
            logger.error(f"❌ FFmpeg: {error_msg}")
            return False, None, error_msg
            
        except Exception as e:
            error_msg = f"Erro inesperado na conversão: {str(e)}"
            logger.error(f"💥 FFmpeg: {error_msg}")
            return False, None, error_msg
            
        finally:
            # Limpar arquivos temporários
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except:
                pass
    
    @staticmethod
    def get_audio_info(input_bytes: bytes) -> Tuple[bool, dict, str]:
        """
        Obtém informações sobre um arquivo de áudio
        
        Args:
            input_bytes: Os bytes do arquivo de áudio
            
        Returns:
            Tuple[success: bool, info: dict, message: str]
        """
        logger.info(f"🔍 FFmpeg: Analisando áudio. Tamanho: {len(input_bytes)} bytes")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as input_file:
            input_file.write(input_bytes)
            input_path = input_file.name
        
        try:
            # Comando ffprobe para obter informações
            cmd = [
                FFmpegService.get_ffprobe_path(),
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                input_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                import json
                info = json.loads(result.stdout)
                
                # Extrair informações relevantes
                audio_info = {
                    'duration': float(info.get('format', {}).get('duration', 0)),
                    'size': int(info.get('format', {}).get('size', 0)),
                    'format_name': info.get('format', {}).get('format_name', ''),
                    'bit_rate': info.get('format', {}).get('bit_rate', ''),
                }
                
                # Informações do stream de áudio
                for stream in info.get('streams', []):
                    if stream.get('codec_type') == 'audio':
                        audio_info.update({
                            'codec': stream.get('codec_name', ''),
                            'sample_rate': stream.get('sample_rate', ''),
                            'channels': stream.get('channels', 0),
                        })
                        break
                
                logger.info(f"✅ FFmpeg: Informações obtidas: {audio_info}")
                return True, audio_info, "Informações obtidas com sucesso"
            else:
                error_msg = f"FFprobe erro: {result.stderr}"
                logger.error(f"❌ FFprobe: {error_msg}")
                return False, {}, error_msg
                
        except Exception as e:
            error_msg = f"Erro ao analisar áudio: {str(e)}"
            logger.error(f"💥 FFprobe: {error_msg}")
            return False, {}, error_msg
            
        finally:
            try:
                os.unlink(input_path)
            except:
                pass