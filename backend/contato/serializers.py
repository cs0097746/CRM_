from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Contato, Operador
import re
# from atendimento.models import Conversa, Interacao, RespostasRapidas, NotaAtendimento, AnexoNota, TarefaAtendimento, LogAtividade
# from negocio.models import Negocio
# from kanban.models import Kanban, Estagio

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
    
    def validate_email(self, value):
        """
        Validar formato de email
        """
        if value:  # Se email foi fornecido (não é obrigatório)
            # Regex para validar email
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Email inválido. Use o formato: exemplo@dominio.com")
            
            # Normalizar para lowercase
            value = value.lower().strip()
        
        return value
    
    def validate_telefone(self, value):
        """
        Validar formato de telefone brasileiro
        """
        if value:  # Se telefone foi fornecido
            # Remover caracteres não numéricos
            telefone_limpo = re.sub(r'\D', '', value)
            
            # Remover código do país se presente (+55)
            if telefone_limpo.startswith('55') and len(telefone_limpo) > 11:
                telefone_limpo = telefone_limpo[2:]
            
            # Validar tamanho (10 para fixo, 11 para celular)
            if len(telefone_limpo) not in [10, 11]:
                raise serializers.ValidationError(
                    "Telefone inválido. Use o formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX"
                )
            
            # Validar DDD (11-99)
            ddd = telefone_limpo[:2]
            if not (11 <= int(ddd) <= 99):
                raise serializers.ValidationError("DDD inválido. Use um DDD entre 11 e 99.")
            
            # Se for celular (11 dígitos), deve começar com 9
            if len(telefone_limpo) == 11:
                if telefone_limpo[2] != '9':
                    raise serializers.ValidationError(
                        "Número de celular deve começar com 9 após o DDD."
                    )
            
            # Retornar apenas números
            return telefone_limpo
        
        return value