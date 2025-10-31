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
        Valida formato do email.
        Aceita: usuario@dominio.com, nome.sobrenome@empresa.com.br, etc.
        """
        if value and value.strip():
            # Regex robusto para validar email
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value.strip()):
                raise serializers.ValidationError(
                    "Email inválido. Use o formato: usuario@dominio.com"
                )
            return value.strip().lower()  # Normaliza email em lowercase
        return value
    
    def validate_telefone(self, value):
        """
        Valida formato do telefone brasileiro.
        Aceita: (11) 98765-4321, 11987654321, +5511987654321, etc.
        Remove formatação e valida se contém 10 ou 11 dígitos.
        """
        if value and value.strip():
            # Remove tudo que não é número
            apenas_numeros = re.sub(r'\D', '', value)
            
            # Verifica se tem código do país (+55) e remove
            if apenas_numeros.startswith('55') and len(apenas_numeros) > 11:
                apenas_numeros = apenas_numeros[2:]
            
            # Valida quantidade de dígitos (DDD + número)
            # 10 dígitos: telefone fixo (11) 3456-7890
            # 11 dígitos: celular (11) 98765-4321
            if len(apenas_numeros) < 10 or len(apenas_numeros) > 11:
                raise serializers.ValidationError(
                    "Telefone inválido. Use formato brasileiro: (11) 98765-4321 ou 11987654321"
                )
            
            # Valida DDD (códigos de 11 a 99)
            ddd = int(apenas_numeros[:2])
            if ddd < 11 or ddd > 99:
                raise serializers.ValidationError(
                    "DDD inválido. Use um código de área válido (11-99)"
                )
            
            # Valida celular (9º dígito deve ser 9)
            if len(apenas_numeros) == 11 and apenas_numeros[2] != '9':
                raise serializers.ValidationError(
                    "Número de celular inválido. Celulares brasileiros começam com 9"
                )
            
            # Retorna no formato limpo (apenas números)
            return apenas_numeros
        
        return value