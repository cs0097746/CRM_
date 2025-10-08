# backend/atendimento/serializers.py - VERSÃO CORRIGIDA COMPLETA:

from rest_framework import serializers
from .models import Interacao, Conversa, RespostasRapidas, AnexoNota, NotaAtendimento, TarefaAtendimento
from contato.serializers import OperadorSerializer, ContatoSerializer
from contato.models import Contato, Operador
from django.conf import settings
from django.utils import timezone

class InteracaoSerializer(serializers.ModelSerializer):
    media_url_completa = serializers.SerializerMethodField()
    operador_nome = serializers.SerializerMethodField()
    
    class Meta:
        model = Interacao
        fields = [
            'id', 'mensagem', 'remetente', 'tipo', 'criado_em',
            'whatsapp_id', 'media_url', 'media_url_completa',
            'media_filename', 'media_size', 'media_duration', 'media_mimetype',
            'operador', 'operador_nome'
        ]
    
    def get_media_url_completa(self, obj):
        """
        ✅ SEMPRE retorna URL LOCAL do arquivo salvo
        """
        if obj.media_url:
            request = self.context.get('request')
            if request:
                # ✅ URL completa: http://localhost:8000/media/whatsapp_media/...
                return request.build_absolute_uri(obj.media_url)
            else:
                # ✅ Fallback para URL completa
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                return f"{base_url}{obj.media_url}"
        return None
    
    def get_operador_nome(self, obj):
        if obj.operador and obj.operador.user:
            return obj.operador.user.get_full_name() or obj.operador.user.username
        return None

    def to_representation(self, instance):
        """
        ✅ CUSTOMIZAR representação para garantir media_url local
        """
        data = super().to_representation(instance)
        
        # ✅ SEMPRE usar arquivo local se existir
        if instance.media_url:
            request = self.context.get('request')
            if request:
                data['media_url'] = request.build_absolute_uri(instance.media_url)
            else:
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                data['media_url'] = f"{base_url}{instance.media_url}"
        
        return data

class ConversaDetailSerializer(serializers.ModelSerializer):
    interacoes = serializers.SerializerMethodField()
    contato_nome = serializers.CharField(source='contato.nome', read_only=True)
    contato_telefone = serializers.CharField(source='contato.telefone', read_only=True)
    operador_atual = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'contato_nome', 'contato_telefone',
            'status', 'criado_em', 'atualizado_em', 'operador', 'operador_atual',
            'interacoes'
        ]
    
    def get_interacoes(self, obj):
        """
        ✅ GARANTIR que interações tenham URLs locais
        """
        interacoes = obj.interacoes.all().order_by('criado_em')
        # ✅ PASSAR context para garantir URLs completas
        return InteracaoSerializer(
            interacoes, 
            many=True, 
            context=self.context  # ✅ IMPORTANTE: passar context!
        ).data
    
    def get_operador_atual(self, obj):
        if obj.operador and obj.operador.user:
            return {
                'id': obj.operador.id,
                'nome': obj.operador.user.get_full_name() or obj.operador.user.username,
                'username': obj.operador.user.username
            }
        return None
       
class ConversaListSerializer(serializers.ModelSerializer):
    contato_nome = serializers.CharField(source='contato.nome', read_only=True)
    contato_telefone = serializers.CharField(source='contato.telefone', read_only=True)
    ultima_mensagem = serializers.SerializerMethodField()
    operador_nome = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'contato_nome', 'contato_telefone',
            'status', 'criado_em', 'atualizado_em',
            'operador', 'operador_nome', 'ultima_mensagem'
        ]
    
    def get_ultima_mensagem(self, obj):
        """
        ✅ ÚLTIMA mensagem com URL local se for mídia
        """
        ultima = obj.interacoes.last()
        if ultima:
            # ✅ USAR serializer com context para URLs locais
            return InteracaoSerializer(
                ultima, 
                context=self.context  # ✅ IMPORTANTE!
            ).data
        return None
    
    def get_operador_nome(self, obj):
        if obj.operador and obj.operador.user:
            return obj.operador.user.get_full_name() or obj.operador.user.username
        return None


# ===== RESTO DOS SERIALIZERS (já corretos) =====

class RespostasRapidasSerializer(serializers.ModelSerializer):
    operador = OperadorSerializer(read_only=True)

    class Meta:
        model = RespostasRapidas
        fields = ['id', 'atalho', 'titulo', 'texto', 'operador', 'ativo', 'total_usos', 'ultima_utilizacao', 'criado_em']

class AnexoNotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoNota
        fields = ['id', 'arquivo', 'nome_original', 'tamanho', 'tipo_mime', 'criado_em']

class NotaAtendimentoSerializer(serializers.ModelSerializer):
    operador = OperadorSerializer(read_only=True)
    
    class Meta:
        model = NotaAtendimento
        fields = [
            'id', 'titulo', 'conteudo', 'tipo', 'privada', 'tags', 
            'ativa', 'operador', 'conversa', 'criado_em', 'atualizado_em'
        ]

class TarefaAtendimentoSerializer(serializers.ModelSerializer):
    criado_por = OperadorSerializer(read_only=True)
    responsavel = OperadorSerializer(read_only=True)
    responsavel_id = serializers.IntegerField(write_only=True, required=False)

    # Campos computados
    esta_vencida = serializers.ReadOnlyField()
    vence_hoje = serializers.ReadOnlyField()
    prazo_status = serializers.ReadOnlyField()
    progresso_percentual = serializers.ReadOnlyField()

    # Informações relacionadas
    conversa_info = serializers.SerializerMethodField()
    contato_info = serializers.SerializerMethodField()

    class Meta:
        model = TarefaAtendimento
        fields = [
            'id', 'titulo', 'descricao', 'status', 'prioridade',
            'criado_por', 'responsavel', 'responsavel_id',
            'conversa', 'contato', 'conversa_info', 'contato_info',
            'data_vencimento', 'data_conclusao', 'data_inicio',
            'tempo_estimado', 'tempo_gasto', 'lembrete_enviado',
            'tags', 'observacoes', 'esta_vencida', 'vence_hoje',
            'prazo_status', 'progresso_percentual',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['id', 'criado_por', 'data_conclusao', 'criado_em', 'atualizado_em']

    def get_conversa_info(self, obj):
        if obj.conversa:
            return {
                'id': obj.conversa.id,
                'contato_nome': obj.conversa.contato.nome,
                'status': obj.conversa.status
            }
        return None

    def get_contato_info(self, obj):
        if obj.contato:
            return {
                'id': obj.contato.id,
                'nome': obj.contato.nome,
                'telefone': obj.contato.telefone
            }
        return None

    def update(self, instance, validated_data):
        responsavel_id = validated_data.pop('responsavel_id', None)
        if responsavel_id:
            try:
                responsavel = Operador.objects.get(id=responsavel_id)
                instance.responsavel = responsavel
            except Operador.DoesNotExist:
                raise serializers.ValidationError({"responsavel_id": "Operador não encontrado."})

        # Auto-completar tarefa se status mudou para concluída
        if validated_data.get('status') == 'concluida' and instance.status != 'concluida':
            validated_data['data_conclusao'] = timezone.now()
        elif validated_data.get('status') != 'concluida':
            validated_data['data_conclusao'] = None

        return super().update(instance, validated_data)

class TarefaCreateSerializer(serializers.ModelSerializer):
    """Serializer simplificado para criação rápida de tarefas"""
    
    class Meta:
        model = TarefaAtendimento
        fields = [
            'titulo', 'descricao', 'status', 'prioridade',
            'responsavel', 'conversa', 'contato', 'data_vencimento'
        ]

class ConversaCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar conversas (POST)"""

    class Meta:
        model = Conversa
        fields = [
            'contato', 'operador', 'status', 'assunto',
            'origem', 'prioridade'
        ]
        extra_kwargs = {
            'operador': {'required': False},  # Será auto-atribuído
            'prioridade': {'default': 'media'},
            'status': {'default': 'entrada'}
        }

    def validate_contato(self, value):
        """Validar se o contato existe"""
        if not value:
            raise serializers.ValidationError("Contato é obrigatório")
        return value