"""
Serializers para Message Translator
"""
from rest_framework import serializers
from .models import CanalConfig, MensagemLog, RegrasRoteamento


class CanalConfigSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = CanalConfig
        fields = [
            'id', 'nome', 'tipo', 'tipo_display', 'ativo', 'prioridade',
            'credenciais', 'recebe_entrada', 'envia_saida', 'destinos',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
    
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
            'criado_em', 'processado_em'
        ]
        read_only_fields = ['criado_em', 'processado_em']


class RegrasRoteamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegrasRoteamento
        fields = [
            'id', 'nome', 'ativo', 'prioridade',
            'condicoes', 'acoes',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
