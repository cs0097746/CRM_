"""
Serializers para Message Translator
"""
from rest_framework import serializers
from .models import CanalConfig, MensagemLog, RegrasRoteamento, WebhookCustomizado


class CanalConfigSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    atualizado_por_nome = serializers.SerializerMethodField()
    
    def get_criado_por_nome(self, obj):
        return obj.criado_por.username if obj.criado_por else 'Sistema'
    
    def get_atualizado_por_nome(self, obj):
        return obj.atualizado_por.username if obj.atualizado_por else None
    
    class Meta:
        model = CanalConfig
        fields = [
            'id', 'nome', 'tipo', 'tipo_display', 'ativo', 'prioridade',
            'credenciais', 'recebe_entrada', 'envia_saida', 'destinos',
            'criado_por', 'criado_por_nome', 'atualizado_por', 'atualizado_por_nome',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'atualizado_por', 'criado_em', 'atualizado_em']
    
    def validate_credenciais(self, value):
        """
        Valida formato das credenciais
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Credenciais devem ser um objeto JSON")
        return value


class MensagemLogSerializer(serializers.ModelSerializer):
    canal_origem_nome = serializers.CharField(source='canal_origem.nome', read_only=True)
    canal_destino_nome = serializers.CharField(source='canal_destino.nome', read_only=True)
    direcao_display = serializers.CharField(source='get_direcao_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processado_por_nome = serializers.SerializerMethodField()
    
    def get_processado_por_nome(self, obj):
        return obj.processado_por.username if obj.processado_por else 'Sistema'
    
    class Meta:
        model = MensagemLog
        fields = [
            'id', 'message_id', 'direcao', 'direcao_display', 
            'status', 'status_display',
            'canal_origem', 'canal_origem_nome',
            'canal_destino', 'canal_destino_nome',
            'payload_original', 'payload_loomie',
            'remetente', 'destinatario',
            'erro_mensagem', 'tempo_processamento',
            'processado_por', 'processado_por_nome',
            'criado_em', 'processado_em'
        ]
        read_only_fields = ['processado_por', 'criado_em', 'processado_em']


class RegrasRoteamentoSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.SerializerMethodField()
    atualizado_por_nome = serializers.SerializerMethodField()
    
    def get_criado_por_nome(self, obj):
        return obj.criado_por.username if obj.criado_por else 'Sistema'
    
    def get_atualizado_por_nome(self, obj):
        return obj.atualizado_por.username if obj.atualizado_por else None
    
    class Meta:
        model = RegrasRoteamento
        fields = [
            'id', 'nome', 'ativo', 'prioridade',
            'condicoes', 'acoes',
            'criado_por', 'criado_por_nome', 'atualizado_por', 'atualizado_por_nome',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'atualizado_por', 'criado_em', 'atualizado_em']


class WebhookCustomizadoSerializer(serializers.ModelSerializer):
    filtro_canal_display = serializers.CharField(source='get_filtro_canal_display', read_only=True)
    filtro_direcao_display = serializers.CharField(source='get_filtro_direcao_display', read_only=True)
    metodo_http_display = serializers.CharField(source='get_metodo_http_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    atualizado_por_nome = serializers.SerializerMethodField()
    
    def get_criado_por_nome(self, obj):
        return obj.criado_por.username if obj.criado_por else 'Sistema'
    
    def get_atualizado_por_nome(self, obj):
        return obj.atualizado_por.username if obj.atualizado_por else None
    
    class Meta:
        model = WebhookCustomizado
        fields = [
            'id', 'nome', 'url', 'ativo',
            'filtro_canal', 'filtro_canal_display',
            'filtro_direcao', 'filtro_direcao_display',
            'headers', 'metodo_http', 'metodo_http_display',
            'timeout', 'retry_em_falha', 'max_tentativas',
            'total_enviados', 'total_erros', 'ultima_execucao',
            'criado_por', 'criado_por_nome', 'atualizado_por', 'atualizado_por_nome',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = [
            'total_enviados', 'total_erros', 'ultima_execucao',
            'criado_por', 'atualizado_por', 'criado_em', 'atualizado_em'
        ]
    
    def validate_url(self, value):
        """Valida formato da URL"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL deve começar com http:// ou https://")
        return value
    
    def validate_headers(self, value):
        """Valida formato dos headers"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Headers devem ser um objeto JSON")
        return value
    
    def validate_timeout(self, value):
        """Valida timeout"""
        if value < 1 or value > 60:
            raise serializers.ValidationError("Timeout deve estar entre 1 e 60 segundos")
        return value
    
    def validate_max_tentativas(self, value):
        """Valida número máximo de tentativas"""
        if value < 1 or value > 10:
            raise serializers.ValidationError("Máximo de tentativas deve estar entre 1 e 10")
        return value
