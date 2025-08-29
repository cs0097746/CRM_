# contatos/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contato, Interacao, Estagio, Negocio, Conversa, Operador, RespostasRapidas


# --- SERIALIZERS BÁSICOS ---

class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        fields = ['id', 'nome', 'email', 'telefone', 'empresa', 'cargo', 'criado_em']


class EstagioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estagio
        fields = ['id', 'nome', 'ordem']


# --- SERIALIZERS DE USUÁRIOS E OPERADORES ---

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class OperadorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Operador
        fields = ['id', 'user']


# --- SERIALIZERS DE CRM (KANBAN) ---

class NegocioSerializer(serializers.ModelSerializer):
    # Para a leitura (GET), mostramos os detalhes do contato e do estágio
    contato = ContatoSerializer(read_only=True)
    estagio = EstagioSerializer(read_only=True)

    class Meta:
        model = Negocio
        # Nos campos, incluímos apenas os nomes dos relacionamentos
        fields = ['id', 'titulo', 'valor', 'contato', 'estagio', 'criado_em']


# Serializer para listar as mensagens DENTRO de uma conversa
class InteracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interacao
        fields = ['id', 'mensagem', 'remetente', 'criado_em']
        # AVISO PARA O "RECEPCIONISTA": O campo 'remetente' é apenas para leitura.
        # Não o exija na entrada de dados, nós o preencheremos no servidor.
        read_only_fields = ['remetente']


class ConversaListSerializer(serializers.ModelSerializer):
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    # Novo campo para buscar a última mensagem da conversa
    ultima_mensagem = serializers.SerializerMethodField()

    class Meta:
        model = Conversa
        fields = [
            'id', 'contato', 'operador', 'status', 
            'criado_em', 'atualizado_em', 'ultima_mensagem'
        ]

    def get_ultima_mensagem(self, obj):
        """
        Esta função busca a interação mais recente da conversa.
        """
        ultima = obj.interacoes.order_by('-criado_em').first()
        if ultima:
            # Retorna apenas o texto da mensagem para ser mais leve
            return ultima.mensagem
        return None



class ConversaDetailSerializer(serializers.ModelSerializer):
    # Para leitura, mostramos os detalhes completos
    contato = ContatoSerializer(read_only=True)
    operador = OperadorSerializer(read_only=True)
    interacoes = InteracaoSerializer(many=True, read_only=True)

    # Para escrita (PATCH), aceitamos os IDs
    operador_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Conversa
        fields = ['id', 'contato', 'operador', 'operador_id', 'status', 'criado_em', 'atualizado_em', 'interacoes']

    # --- MÉTODO DE ATUALIZAÇÃO CORRIGIDO E MAIS ROBUSTO ---
    def update(self, instance, validated_data):
        # Procura pelo 'operador_id' nos dados recebidos
        operador_id = validated_data.get('operador_id')

        # Se um operador_id foi enviado, procuramos o objeto Operador e o atribuímos
        if operador_id is not None:
            try:
                novo_operador = Operador.objects.get(pk=operador_id)
                instance.operador = novo_operador
            except Operador.DoesNotExist:
                # Se o ID do operador não for válido, podemos lançar um erro
                raise serializers.ValidationError({"operador_id": "Operador não encontrado."})

        # Atualiza o status se ele foi enviado na requisição
        instance.status = validated_data.get('status', instance.status)

        # Salva todas as alterações na base de dados
        instance.save()
        return instance


class RespostasRapidasSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespostasRapidas
        fields = ['id', 'atalho', 'texto', 'operador']