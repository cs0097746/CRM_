from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
import requests
import json

# ✅ IMPORTS DE TIPOS PARA PYLANCE
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from rest_framework.request import Request

from .models import (
    Contato, Conversa, Interacao, Operador, Estagio, Negocio,
    RespostasRapidas, NotaAtendimento, TarefaAtendimento, AnexoNota
)
from .serializers import (
    ContatoSerializer, OperadorSerializer,
    ConversaListSerializer, ConversaDetailSerializer, InteracaoSerializer,
    EstagioSerializer, NegocioSerializer, RespostasRapidasSerializer,
    NotaAtendimentoSerializer, TarefaAtendimentoSerializer, 
    TarefaCreateSerializer, AnexoNotaSerializer, ConversaCreateSerializer
)

# ===== FUNÇÃO AUXILIAR =====
def get_user_operador(user):
    """Função auxiliar para obter operador do usuário de forma segura"""
    if hasattr(user, 'operador'):
        return user.operador
    return None

# ===== INTEGRAÇÃO EVOLUTION API =====

def enviar_mensagem_whatsapp(numero, mensagem, instance_name="nate", evolution_api_url="https://evo.loomiecrm.com", api_key="095B7FC5F286-4E22-A2E9-3A8C54545870"):
    """Envia mensagem via Evolution API - VERSÃO OTIMIZADA"""
    try:
        url = f"{evolution_api_url}/message/sendText/{instance_name}"
        
        payload = {
            "number": numero,
            "text": mensagem
        }
        
        # ✅ USAR APENAS O HEADER QUE FUNCIONA
        headers = {
            'apikey': api_key,
            'Content-Type': 'application/json'
        }
        
        print(f"📨 Enviando para: {url}")
        print(f"📦 Payload: {payload}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"📡 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code in [200, 201]:
            print("✅ MENSAGEM ENVIADA COM SUCESSO!")
            return {
                "success": True, 
                "data": response.json(), 
                "header_usado": "apikey"
            }
        elif response.status_code == 400:
            response_data = response.json()
            if "exists" in response.text and "false" in response.text:
                return {
                    "success": False, 
                    "error": "Número de WhatsApp não existe ou inválido", 
                    "details": response_data,
                    "numero_testado": numero
                }
            else:
                return {
                    "success": False, 
                    "error": f"Erro 400: {response_data.get('error', 'Bad Request')}", 
                    "details": response_data
                }
        else:
            return {
                "success": False, 
                "error": f"Status: {response.status_code}", 
                "details": response.text
            }
            
    except Exception as e:
        print(f"💥 Erro: {str(e)}")
        return {"success": False, "error": str(e)}

def enviar_presenca_whatsapp(numero, presence="composing", instance_name="nate", evolution_api_url="https://evo.loomiecrm.com", api_key="095B7FC5F286-4E22-A2E9-3A8C54545870"):
    """Envia presença (digitando...) via Evolution API"""
    try:
        url = f"{evolution_api_url}/chat/sendPresence/{instance_name}"
        
        payload = {
            "number": numero,
            "presence": presence
        }
        
        headers = {
            'Content-Type': 'application/json',
            'evolution': api_key
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"Status: {response.status_code}", "details": response.text}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def obter_qr_code(instance_name="nate", evolution_api_url="https://evo.loomiecrm.com", api_key="095B7FC5F286-4E22-A2E9-3A8C54545870"):
    """Obtém QR Code para conectar instância"""
    try:
        url = f"{evolution_api_url}/instance/connect/{instance_name}"
        
        headers = {
            'Content-Type': 'application/json',
            'evolution': api_key
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code in [200, 201]:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"Status: {response.status_code}", "details": response.text}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

# ===== VIEWS DE API =====

class ContatoListCreateView(generics.ListCreateAPIView):
    """API: Listar e criar contatos"""
    queryset = Contato.objects.all()
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'email', 'telefone']
    ordering_fields = ['nome', 'criado_em']
    ordering = ['nome']

class ContatoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalhar, atualizar e deletar contato"""
    queryset = Contato.objects.all()
    serializer_class = ContatoSerializer
    permission_classes = [IsAuthenticated]

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_operadores_list(request):
    """API: Lista operadores"""
    operadores = Operador.objects.select_related('user')
    serializer = OperadorSerializer(operadores, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """API: Estatísticas do dashboard"""
    hoje = timezone.now().date()
    
    stats = {
        'contatos': {
            'total': Contato.objects.count(),
            'novos_hoje': Contato.objects.filter(criado_em__date=hoje).count(),
        },
        'conversas': {
            'total': Conversa.objects.count(),
            'ativas': Conversa.objects.filter(status__in=['entrada', 'atendimento']).count(),
            'hoje': Conversa.objects.filter(criado_em__date=hoje).count(),
            'por_status': dict(Conversa.objects.values_list('status').annotate(Count('id'))),
        },
        'interacoes': {
            'hoje': Interacao.objects.filter(criado_em__date=hoje).count(),
        },
        'tarefas': {
            'pendentes': TarefaAtendimento.objects.filter(status='pendente').count(),
            'vencidas': TarefaAtendimento.objects.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            ).count(),
        }
    }
    
    return Response(stats)

# ===== CONVERSAS E INTERAÇÕES =====

class ConversaListView(generics.ListCreateAPIView):
    """API: Lista e cria conversas"""
    queryset = Conversa.objects.all().select_related('contato', 'operador').prefetch_related('interacoes')
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['contato__nome', 'contato__telefone']
    ordering = ['-atualizado_em']
    
    def get_serializer_class(self):
        """Usar serializers diferentes para GET e POST"""
        if self.request.method == 'POST':
            return ConversaCreateSerializer
        return ConversaListSerializer
    
    def perform_create(self, serializer):
        """Auto-atribuir operador se não informado"""
        if not serializer.validated_data.get('operador'):
            try:
                operador = Operador.objects.get(user=self.request.user)
                serializer.save(operador=operador)
            except Operador.DoesNotExist:
                serializer.save()
        else:
            serializer.save()

class ConversaDetailView(generics.RetrieveUpdateAPIView):
    """API: Detalha e atualiza conversa"""
    queryset = Conversa.objects.all()
    serializer_class = ConversaDetailSerializer
    permission_classes = [IsAuthenticated]

class InteracaoCreateView(generics.CreateAPIView):
    """API: Cria interação/mensagem"""
    queryset = Interacao.objects.all()
    serializer_class = InteracaoSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        conversa_id = self.kwargs.get('conversa_pk')
        conversa = get_object_or_404(Conversa, id=conversa_id)
        
        operador = get_user_operador(self.request.user)
        serializer.save(
            conversa=conversa,
            remetente='operador',
            operador=operador
        )

# ===== CRM/KANBAN =====

class EstagioListView(generics.ListAPIView):
    """API: Lista estágios"""
    queryset = Estagio.objects.all()
    serializer_class = EstagioSerializer
    permission_classes = [IsAuthenticated]

class NegocioListCreateView(generics.ListCreateAPIView):
    """API: Lista e cria negócios"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]

class NegocioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API: Detalha, atualiza e deleta negócio"""
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer
    permission_classes = [IsAuthenticated]

# ===== RESPOSTAS RÁPIDAS =====

class RespostasRapidasListView(generics.ListCreateAPIView):
    """API: Lista e cria respostas rápidas"""
    serializer_class = RespostasRapidasSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return RespostasRapidas.objects.filter(operador=operador)
        return RespostasRapidas.objects.none()
    
    def perform_create(self, serializer):
        operador = get_user_operador(self.request.user)
        if operador:
            serializer.save(operador=operador)

# ===== NOTAS E TAREFAS =====

class NotaAtendimentoListCreateView(generics.ListCreateAPIView):
    """Listar e criar notas de atendimento"""
    serializer_class = NotaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'conteudo']
    ordering_fields = ['criado_em', 'tipo']
    ordering = ['-criado_em']
    
    def get_queryset(self):
        conversa_id = self.kwargs.get('conversa_pk')
        if conversa_id:
            queryset = NotaAtendimento.objects.filter(conversa_id=conversa_id)
        else:
            queryset = NotaAtendimento.objects.all()
        
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        operador = get_user_operador(self.request.user)
        if operador:
            queryset = queryset.filter(
                Q(privada=False) | 
                Q(privada=True, operador=operador)
            )
        
        return queryset.select_related('operador__user', 'conversa__contato')
    
    def perform_create(self, serializer):
        conversa_id = self.kwargs.get('conversa_pk')
        conversa = None
        if conversa_id:
            conversa = get_object_or_404(Conversa, id=conversa_id)
        
        operador = get_user_operador(self.request.user)
        serializer.save(
            operador=operador,
            conversa=conversa
        )

class NotaAtendimentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalhar, atualizar e deletar nota"""
    serializer_class = NotaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return NotaAtendimento.objects.filter(operador=operador)
        return NotaAtendimento.objects.none()

class TarefaAtendimentoListCreateView(generics.ListCreateAPIView):
    """Listar e criar tarefas"""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_vencimento', 'prioridade', 'criado_em']
    ordering = ['data_vencimento', '-prioridade']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TarefaCreateSerializer
        return TarefaAtendimentoSerializer
    
    def get_queryset(self):
        queryset = TarefaAtendimento.objects.select_related(
            'criado_por__user', 'responsavel__user', 'conversa__contato', 'contato'
        )
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        prioridade = self.request.query_params.get('prioridade')
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)
        
        responsavel_id = self.request.query_params.get('responsavel')
        if responsavel_id:
            queryset = queryset.filter(responsavel_id=responsavel_id)
        
        conversa_id = self.request.query_params.get('conversa')
        if conversa_id:
            queryset = queryset.filter(conversa_id=conversa_id)
        
        vencidas = self.request.query_params.get('vencidas')
        if vencidas == 'true':
            queryset = queryset.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            )
        
        vence_hoje = self.request.query_params.get('vence_hoje')
        if vence_hoje == 'true':
            hoje = timezone.now().date()
            queryset = queryset.filter(
                data_vencimento__date=hoje,
                status__in=['pendente', 'em_andamento']
            )
        
        return queryset
    
    def perform_create(self, serializer):
        operador = get_user_operador(self.request.user)
        validated_data = serializer.validated_data
        
        if 'responsavel_id' not in validated_data and operador:
            validated_data['responsavel'] = operador
        elif 'responsavel_id' in validated_data:
            validated_data['responsavel'] = get_object_or_404(Operador, id=validated_data.pop('responsavel_id'))
        
        if operador:
            serializer.save(criado_por=operador)

class TarefaAtendimentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detalhar, atualizar e deletar tarefa"""
    serializer_class = TarefaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if operador:
            return TarefaAtendimento.objects.filter(
                Q(criado_por=operador) |
                Q(responsavel=operador)
            )
        return TarefaAtendimento.objects.none()

class MinhasTarefasView(generics.ListAPIView):
    """Tarefas do operador logado"""
    serializer_class = TarefaAtendimentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        operador = get_user_operador(self.request.user)
        if not operador:
            return TarefaAtendimento.objects.none()
        
        return TarefaAtendimento.objects.filter(
            responsavel=operador,
            status__in=['pendente', 'em_andamento']
        ).select_related('criado_por__user', 'conversa__contato', 'contato')

class TarefasStatsView(APIView):
    """Estatísticas das tarefas"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        operador = get_user_operador(request.user)
        if not operador:
            return Response({'error': 'Usuário não é operador'}, status=403)
        
        hoje = timezone.now().date()
        minhas_tarefas = TarefaAtendimento.objects.filter(responsavel=operador)
        
        stats = {
            'total_tarefas': minhas_tarefas.count(),
            'pendentes': minhas_tarefas.filter(status='pendente').count(),
            'em_andamento': minhas_tarefas.filter(status='em_andamento').count(),
            'concluidas_hoje': minhas_tarefas.filter(
                status='concluida',
                data_conclusao__date=hoje
            ).count(),
            'vencidas': minhas_tarefas.filter(
                data_vencimento__lt=timezone.now(),
                status__in=['pendente', 'em_andamento']
            ).count(),
            'vence_hoje': minhas_tarefas.filter(
                data_vencimento__date=hoje,
                status__in=['pendente', 'em_andamento']
            ).count(),
            'por_prioridade': {
                'critica': minhas_tarefas.filter(prioridade='critica', status__in=['pendente', 'em_andamento']).count(),
                'alta': minhas_tarefas.filter(prioridade='alta', status__in=['pendente', 'em_andamento']).count(),
                'media': minhas_tarefas.filter(prioridade='media', status__in=['pendente', 'em_andamento']).count(),
                'baixa': minhas_tarefas.filter(prioridade='baixa', status__in=['pendente', 'em_andamento']).count(),
            }
        }
        
        return Response(stats)

# ===== QUICK ACTIONS =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_note_create(request):
    """Criar nota rápida"""
    try:
        conversa_id = request.data.get('conversa_id')
        titulo = request.data.get('titulo', 'Nota rápida')
        conteudo = request.data.get('conteudo')
        tipo = request.data.get('tipo', 'info')
        
        if not conversa_id or not conteudo:
            return Response({
                'error': 'conversa_id e conteudo são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        conversa = get_object_or_404(Conversa, id=conversa_id)
        operador = get_user_operador(request.user)
        
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        nota = NotaAtendimento.objects.create(
            conversa=conversa,
            operador=operador,
            titulo=titulo,
            conteudo=conteudo,
            tipo=tipo
        )
        
        serializer = NotaAtendimentoSerializer(nota)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Nota criada com sucesso'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_task_create(request):
    """Criar tarefa rápida"""
    try:
        titulo = request.data.get('titulo')
        conversa_id = request.data.get('conversa_id')
        prioridade = request.data.get('prioridade', 'media')
        data_vencimento = request.data.get('data_vencimento')
        
        if not titulo:
            return Response({
                'error': 'titulo é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        operador = get_user_operador(request.user)
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        conversa = None
        if conversa_id:
            conversa = get_object_or_404(Conversa, id=conversa_id)
        
        tarefa = TarefaAtendimento.objects.create(
            titulo=titulo,
            conversa=conversa,
            prioridade=prioridade,
            data_vencimento=data_vencimento,
            criado_por=operador,
            responsavel=operador
        )
        
        serializer = TarefaAtendimentoSerializer(tarefa)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Tarefa criada com sucesso'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task_status(request, task_id):
    """Atualizar status da tarefa"""
    try:
        tarefa = get_object_or_404(TarefaAtendimento, id=task_id)
        operador = get_user_operador(request.user)
        
        if not operador:
            return Response({
                'error': 'Usuário não é operador'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if (tarefa.criado_por != operador and tarefa.responsavel != operador):
            return Response({
                'error': 'Sem permissão para alterar esta tarefa'
            }, status=status.HTTP_403_FORBIDDEN)
        
        novo_status = request.data.get('status')
        if not novo_status:
            return Response({
                'error': 'status é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        tarefa.status = novo_status
        if novo_status == 'concluida':
            tarefa.data_conclusao = timezone.now()
        
        tarefa.save()
        
        serializer = TarefaAtendimentoSerializer(tarefa)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Status atualizado com sucesso'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ===== VIEWS DE INTEGRAÇÃO WHATSAPP =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_mensagem_view(request):
    """API para enviar mensagem via WhatsApp"""
    print(f"🔍 DEBUG: Dados recebidos: {request.data}")
    print(f"🔍 DEBUG: Usuário: {request.user}")
    
    try:
        numero = request.data.get('numero')
        mensagem = request.data.get('mensagem')
        conversa_id = request.data.get('conversa_id')
        enviar_presenca = request.data.get('enviar_presenca', False)
        
        print(f"🔍 DEBUG: numero={numero}, mensagem={mensagem}")
        
        if not numero or not mensagem:
            print("❌ DEBUG: Campos obrigatórios faltando")
            return Response({
                'error': 'Campos obrigatórios: numero, mensagem'
            }, status=400)
        
        # Enviar "digitando..." se solicitado
        if enviar_presenca:
            print("📱 DEBUG: Enviando presença...")
            presenca_result = enviar_presenca_whatsapp(numero, "composing")
            print(f"📱 DEBUG: Resultado presença: {presenca_result}")
        
        # Enviar mensagem via Evolution API
        print("📨 DEBUG: Enviando mensagem...")
        resultado = enviar_mensagem_whatsapp(numero, mensagem)
        print(f"📨 DEBUG: Resultado mensagem: {resultado}")
        
        if resultado['success']:
            # Salvar mensagem no CRM se tiver conversa_id
            if conversa_id:
                try:
                    conversa = Conversa.objects.get(id=conversa_id)
                    operador = get_user_operador(request.user)
                    
                    Interacao.objects.create(
                        conversa=conversa,
                        mensagem=mensagem,
                        remetente='operador',
                        tipo='texto',
                        operador=operador
                    )
                    print("💾 DEBUG: Interação salva no CRM")
                except (Conversa.DoesNotExist, Operador.DoesNotExist) as e:
                    print(f"⚠️ DEBUG: Erro ao salvar no CRM: {e}")
            
            return Response({
                'success': True,
                'message': 'Mensagem enviada com sucesso',
                'data': resultado['data'],
                'debug': {
                    'numero': numero,
                    'mensagem': mensagem,
                    'presenca_enviada': enviar_presenca,
                    'header_usado': resultado.get('header_usado'),
                    'tentativa': resultado.get('tentativa')
                }
            }, status=200)
        else:
            print(f"❌ DEBUG: Erro na Evolution API: {resultado}")
            return Response({
                'success': False,
                'error': resultado['error'],
                'details': resultado.get('details'),
                'debug_info': resultado
            }, status=400)
            
    except Exception as e:
        print(f"💥 DEBUG: Exceção: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obter_qr_code_view(request):
    """API para obter QR Code da instância WhatsApp"""
    try:
        resultado = obter_qr_code()
        
        if resultado['success']:
            return Response({
                'success': True,
                'qr_code': resultado['data'].get('qrcode', ''),
                'status': resultado['data'].get('status', ''),
                'message': 'QR Code obtido com sucesso'
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_presenca_view(request):
    """API para enviar presença (digitando...)"""
    try:
        numero = request.data.get('numero')
        presence = request.data.get('presence', 'composing')
        
        if not numero:
            return Response({
                'error': 'Campo obrigatório: numero'
            }, status=400)
        
        resultado = enviar_presenca_whatsapp(numero, presence)
        
        if resultado['success']:
            return Response({
                'success': True,
                'message': 'Presença enviada com sucesso',
                'data': resultado['data']
            })
        else:
            return Response({
                'success': False,
                'error': resultado['error']
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

# ===== ESTATÍSTICAS =====

class FunilStatsView(APIView):
    """Estatísticas do funil"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        leads_por_estagio = {}
        for item in Negocio.objects.values('estagio__nome').annotate(count=Count('id')):
            leads_por_estagio[item['estagio__nome']] = item['count']
        
        stats = {
            'leads_por_estagio': leads_por_estagio,
            'valor_total': Negocio.objects.aggregate(total=Sum('valor'))['total'] or 0,
        }
        return Response(stats)

class TempoRespostaStatsView(APIView):
    """Estatísticas de tempo de resposta"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({'tempo_medio_minutos': 3.5})

# ===== WEBHOOK =====

class EvolutionWebhookView(APIView):
    """Webhook para Evolution API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response({'status': 'received'})

# ===== AUTENTICAÇÃO =====

@api_view(['POST'])
@permission_classes([AllowAny])
def obter_token_auth(request):
    """Obter token de autenticação"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Username e password são obrigatórios'
            }, status=400)
        
        # Autenticar usuário
        user = authenticate(username=username, password=password)
        
        if user:
            # Criar ou obter token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'token': token.key,
                'user_id': user.pk,
                'username': user.username,
                'message': 'Token gerado com sucesso'
            })
        else:
            return Response({
                'error': 'Credenciais inválidas'
            }, status=400)
            
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def criar_usuario_teste(request):
    """Criar usuário para teste - APENAS DESENVOLVIMENTO"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', f'{username}@teste.com')
        
        if not username or not password:
            return Response({
                'error': 'Username e password são obrigatórios'
            }, status=400)
        
        # Verificar se usuário já existe
        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'Usuário já existe'
            }, status=400)
        
        # Criar usuário
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        
        # Criar token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'success': True,
            'message': 'Usuário criado com sucesso',
            'user_id': user.pk,
            'username': user.username,
            'token': token.key
        })
        
    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)