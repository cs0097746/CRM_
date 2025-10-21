"""
Schema padrão Loomie para mensagens unificadas
"""
from dataclasses import dataclass, asdict, field
from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid


@dataclass
class LoomieMedia:
    """
    Mídia anexada à mensagem (imagem, vídeo, áudio, documento)
    """
    tipo: str  # 'image', 'video', 'audio', 'document', 'sticker', 'location'
    url: Optional[str] = None
    mime_type: Optional[str] = None
    filename: Optional[str] = None
    tamanho: Optional[int] = None  # bytes
    duracao: Optional[int] = None  # segundos (para audio/video)
    legenda: Optional[str] = None
    thumbnail_url: Optional[str] = None
    
    # Location específico
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    endereco: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class LoomieMessage:
    """
    Formato padrão unificado Loomie
    Todas as mensagens de qualquer canal são convertidas para este formato
    """
    # Identificação única
    message_id: str = field(default_factory=lambda: f"loomie_{uuid.uuid4().hex}")
    external_id: Optional[str] = None  # ID da mensagem no canal original
    
    # Timestamps
    timestamp: datetime = None  # Quando a mensagem foi criada
    received_at: datetime = None  # Quando foi recebida pelo sistema
    
    # Participantes
    sender: str = ""  # Remetente (formato: tipo:identificador, ex: whatsapp:5511999999999)
    recipient: str = ""  # Destinatário
    sender_name: Optional[str] = None  # Nome do remetente
    
    # Canal
    channel_type: str = ""  # 'whatsapp', 'telegram', 'evo', etc
    channel_id: Optional[int] = None  # FK para CanalConfig
    
    # Conteúdo
    content_type: str = "text"  # 'text', 'media', 'interactive', 'system'
    text: Optional[str] = None  # Texto da mensagem
    media: Optional[List[LoomieMedia]] = None  # Mídia anexada
    
    # Contexto (reply, forward, etc)
    reply_to: Optional[str] = None  # ID da mensagem respondida
    forwarded: bool = False
    
    # Metadados adicionais
    metadata: Optional[Dict[str, Any]] = None
    
    # Status
    status: str = "received"  # 'received', 'processing', 'sent', 'delivered', 'read', 'failed'
    error_message: Optional[str] = None
    
    def __post_init__(self):
        """Gera IDs e timestamps automaticamente se não fornecidos"""
        if not self.message_id:
            self.message_id = f"loomie_{uuid.uuid4().hex}"
        
        if not self.timestamp:
            self.timestamp = datetime.utcnow()
        
        if not self.received_at:
            self.received_at = datetime.utcnow()
        
        if self.metadata is None:
            self.metadata = {}
        
        if self.media is None:
            self.media = []
    
    def to_dict(self) -> Dict:
        """Converte para dicionário (para JSON)"""
        data = asdict(self)
        
        # Converter datetime para ISO string
        if isinstance(data.get('timestamp'), datetime):
            data['timestamp'] = data['timestamp'].isoformat()
        if isinstance(data.get('received_at'), datetime):
            data['received_at'] = data['received_at'].isoformat()
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'LoomieMessage':
        """Cria instância a partir de dicionário"""
        # Converter strings ISO para datetime
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        if isinstance(data.get('received_at'), str):
            data['received_at'] = datetime.fromisoformat(data['received_at'])
        
        # Converter media
        if data.get('media') and isinstance(data['media'], list):
            data['media'] = [
                LoomieMedia(**m) if isinstance(m, dict) else m 
                for m in data['media']
            ]
        
        return cls(**data)
    
    def add_media(self, tipo: str, **kwargs):
        """Adiciona mídia à mensagem"""
        media = LoomieMedia(tipo=tipo, **kwargs)
        self.media.append(media)
    
    def set_metadata(self, key: str, value: Any):
        """Define metadado"""
        self.metadata[key] = value
    
    def get_metadata(self, key: str, default=None) -> Any:
        """Obtém metadado"""
        return self.metadata.get(key, default)


def criar_mensagem_sistema(texto: str, canal: str = "system") -> LoomieMessage:
    """
    Helper para criar mensagens de sistema
    """
    return LoomieMessage(
        message_id=f"system_{uuid.uuid4().hex}",
        sender="system:loomie",
        recipient="system:all",
        channel_type=canal,
        content_type="system",
        text=texto,
        status="sent"
    )


def criar_mensagem_erro(erro: str, original_message_id: str = None) -> LoomieMessage:
    """
    Helper para criar mensagens de erro
    """
    msg = LoomieMessage(
        message_id=f"error_{uuid.uuid4().hex}",
        sender="system:error",
        recipient="system:admin",
        channel_type="system",
        content_type="system",
        text=f"Erro: {erro}",
        status="failed",
        error_message=erro
    )
    
    if original_message_id:
        msg.set_metadata('original_message_id', original_message_id)
    
    return msg
