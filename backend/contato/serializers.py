from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Contato, Operador
from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
from negocio.models import Negocio
from kanban.models import Kanban, Estagio

# ===== SERIALIZERS BÁSICOS =====

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class OperadorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    nome_display = serializers.ReadOnlyField()

    class Meta:
        model = Operador
        fields = ['id', 'user', 'ativo', 'ramal', 'setor', 'nome_display']

class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        fields = [
            'id', 'nome', 'email', 'telefone', 'empresa', 'cargo',
            'endereco', 'cidade', 'estado', 'cep', 'data_nascimento',
            'observacoes', 'criado_em', 'atualizado_em'
        ]

class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'descricao', 'ordem', 'cor', 'ativo']

# ===== SERIALIZERS DE CRM =====

class NegocioSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    estagio = EstagioSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    valor_formatado = serializers.ReadOnlyField()
    
    contato_id = serializers.IntegerField(write_only=True)
    estagio_id = serializers.IntegerField(write_only=True)
    operador_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Negocio
        fields = [
            'id', 'titulo', 'descricao', 'valor', 'valor_formatado',
            'contato', 'contato_id', 'estagio', 'estagio_id',
            'operador', 'operador_id', 'origem', 'probabilidade',
            'data_prevista', 'criado_em', 'atualizado_em'
        ]

# ===== SERIALIZERS DE CONVERSAS =====

class InteracaoSerializer(serializers.ModelSerializer):
    operador = OperadorSerializer(read_only=True)
    
    class Meta:
        model = Interacao
        fields = [
            'id', 'mensagem', 'remetente', 'tipo', 'operador',
            'lida', 'respondida', 'anexo', 'criado_em'
        ]
        read_only_fields = ['remetente', 'operador']

class ConversaListSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    ultima_mensagem = serializers.SerializerMethodField()
    total_mensagens = serializers.ReadOnlyField()

    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'operador', 'status', 'assunto',
            'origem', 'prioridade', 'ultima_mensagem', 'total_mensagens',
            'criado_em', 'atualizado_em', 'finalizada_em'
        ]

    def get_ultima_mensagem(self, obj):
        ultima = obj.interacoes.order_by('-criado_em').first()
        if ultima:
            return {
                'mensagem': ultima.mensagem,
                'remetente': ultima.remetente,
                'criado_em': ultima.criado_em
            }
        return None

class ConversaDetailSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    interacoes = InteracaoSerializer(many=True, read_only=True)
    
    operador_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'operador', 'operador_id', 'status',
            'assunto', 'origem', 'prioridade', 'interacoes',
            'criado_em', 'atualizado_em', 'finalizada_em'
        ]

    def update(self, instance, validated_data):
        operador_id = validated_data.pop('operador_id', None)
        
        if operador_id is not None:
            try:
                operador = Operador.objects.get(pk=operador_id)
                instance.operador = operador
            except Operador.DoesNotExist:
                raise serializers.ValidationError({"operador_id": "Operador não encontrado."})
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

# ===== SERIALIZERS DE RESPOSTAS RÁPIDAS =====

class RespostasRapidasSerializer(serializers.ModelSerializer):
    operador = OperadorSerializer(read_only=True)
    
    class Meta:
        model = RespostasRapidas
        fields = [
            'id', 'atalho', 'titulo', 'texto', 'operador',
            'ativo', 'total_usos', 'ultima_utilizacao',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['operador', 'total_usos', 'ultima_utilizacao']

# ===== SERIALIZERS DE NOTAS E TAREFAS =====

class AnexoNotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoNota
        fields = ['id', 'arquivo', 'nome_original', 'tamanho', 'tipo_mime', 'criado_em']
        read_only_fields = ['id', 'criado_em']

class NotaAtendimentoSerializer(serializers.ModelSerializer):
    operador = OperadorSerializer(read_only=True)
    anexos = AnexoNotaSerializer(many=True, read_only=True)
    anexos_upload = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    tipo_display_classe = serializers.ReadOnlyField()
    
    class Meta:
        model = NotaAtendimento
        fields = [
            'id', 'titulo', 'conteudo', 'tipo', 'tipo_display_classe',
            'privada', 'tags', 'ativa', 'operador', 'anexos',
            'anexos_upload', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['id', 'operador', 'criado_em', 'atualizado_em']
    
    def create(self, validated_data):
        anexos_data = validated_data.pop('anexos_upload', [])
        nota = super().create(validated_data)
        
        for anexo_file in anexos_data:
            AnexoNota.objects.create(
                nota=nota,
                arquivo=anexo_file,
                nome_original=anexo_file.name,
                tamanho=anexo_file.size,
                tipo_mime=getattr(anexo_file, 'content_type', 'application/octet-stream')
            )
        
        return nota

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
    responsavel_id = serializers.IntegerField(required=False)
    
    class Meta:
        model = TarefaAtendimento
        fields = [
            'titulo', 'descricao', 'prioridade', 'data_vencimento',
            'conversa', 'contato', 'responsavel_id', 'tempo_estimado', 'tags'
        ]
    
    def validate(self, data):
        if not data.get('conversa') and not data.get('contato'):
            raise serializers.ValidationError(
                "Tarefa deve estar relacionada a uma conversa ou contato"
            )
        return data
    
    def create(self, validated_data):
        responsavel_id = validated_data.pop('responsavel_id', None)
        if responsavel_id:
            try:
                responsavel = Operador.objects.get(id=responsavel_id)
                validated_data['responsavel'] = responsavel
            except Operador.DoesNotExist:
                raise serializers.ValidationError({"responsavel_id": "Operador não encontrado."})
        
        return super().create(validated_data)

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