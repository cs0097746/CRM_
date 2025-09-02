from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import models
from django.conf import settings
from contatos.models import Contato, Conversa, Interacao, Operador
from .models import CrmApplication, ApiUsageLog
from .serializers import ContatoOAuthSerializer, ConversaOAuthSerializer, InteracaoOAuthSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
import time
import json

# ===== CONFIGURAÇÃO DE AUTENTICAÇÃO =====

# Para endpoints que precisam de OAuth2
oauth2_required = [OAuth2Authentication]
oauth2_permission = [IsAuthenticated]

# Para endpoints públicos (desenvolvimento)
public_permission = [AllowAny]

# ===== FUNÇÃO DE DEBUG (APENAS EM DESENVOLVIMENTO) =====
def debug_oauth_request(request):
    """Debug OAuth2 request - apenas em desenvolvimento"""
    if settings.DEBUG:
        debug_info = {
            'has_auth': hasattr(request, 'auth'),
            'auth_type': type(request.auth).__name__ if hasattr(request, 'auth') else None,
            'user': str(request.user),
            'user_authenticated': request.user.is_authenticated,
            'method': request.method,
        }
        print("=== DEBUG OAUTH2 ===")
        for key, value in debug_info.items():
            print(f"{key}: {value}")
        print("==================")
        return debug_info
    return {}

# ===== ENDPOINTS PARA CONTATOS =====

@api_view(['GET'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def contacts_list_endpoint(request):
    """Lista todos os contatos - OAuth2 obrigatório"""
    debug_oauth_request(request)
    start_time = time.time()
    
    try:
        # Verificação de escopo
        if hasattr(request.auth, 'scope'):
            scopes = request.auth.scope.split()
            if 'contacts.read' not in scopes:
                return Response({
                    'error': 'Insufficient scope. Required: contacts.read',
                    'your_scopes': scopes
                }, status=403)
        else:
            return Response({
                'error': 'No OAuth2 token provided'
            }, status=401)
        
        contatos = Contato.objects.all()
        
        # Filtros opcionais
        if 'search' in request.GET:
            search = request.GET['search']
            contatos = contatos.filter(
                models.Q(nome__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(telefone__icontains=search)
            )
        
        if 'limit' in request.GET:
            try:
                limit = int(request.GET['limit'])
                contatos = contatos[:limit]
            except ValueError:
                return Response({'error': 'Limit deve ser um número'}, status=400)
        
        serializer = ContatoOAuthSerializer(contatos, many=True)
        
        response_data = {
            'success': True,
            'data': serializer.data,
            'total': contatos.count(),
            'filters_applied': {
                'search': request.GET.get('search', None),
                'limit': request.GET.get('limit', None)
            },
            'message': 'Contatos recuperados com sucesso'
        }
        
        log_api_usage(request, 'contacts', status.HTTP_200_OK, time.time() - start_time)
        return Response(response_data)
        
    except Exception as e:
        log_api_usage(request, 'contacts', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

@api_view(['POST'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def contacts_create_endpoint(request):
    """Cria um novo contato - OAuth2 obrigatório"""
    debug_oauth_request(request)
    start_time = time.time()
    
    try:
        # Verificação de escopo
        if hasattr(request.auth, 'scope'):
            scopes = request.auth.scope.split()
            if 'contacts.write' not in scopes:
                return Response({
                    'error': 'Insufficient scope. Required: contacts.write',
                    'your_scopes': scopes
                }, status=403)
        else:
            return Response({
                'error': 'No OAuth2 token provided'
            }, status=401)
        
        serializer = ContatoOAuthSerializer(data=request.data)
        if serializer.is_valid():
            contato = serializer.save()
            
            response_data = {
                'success': True,
                'data': ContatoOAuthSerializer(contato).data,
                'message': 'Contato criado com sucesso'
            }
            
            log_api_usage(request, 'contacts/create', status.HTTP_201_CREATED, time.time() - start_time)
            return Response(response_data, status=201)
        else:
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Dados de entrada inválidos'
            }, status=400)
            
    except Exception as e:
        log_api_usage(request, 'contacts/create', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

@api_view(['GET', 'PUT', 'DELETE'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def contact_detail_endpoint(request, contact_id):
    """Operações em contato específico - OAuth2 obrigatório"""
    debug_oauth_request(request)
    start_time = time.time()
    
    try:
        contato = get_object_or_404(Contato, id=contact_id)
        
        if request.method == 'GET':
            if hasattr(request.auth, 'scope'):
                scopes = request.auth.scope.split()
                if 'contacts.read' not in scopes:
                    return Response({
                        'error': 'Insufficient scope. Required: contacts.read',
                        'your_scopes': scopes
                    }, status=403)
            
            serializer = ContatoOAuthSerializer(contato)
            response_data = {
                'success': True,
                'data': serializer.data,
                'message': f'Contato {contact_id} recuperado com sucesso'
            }
            
        elif request.method == 'PUT':
            if hasattr(request.auth, 'scope'):
                scopes = request.auth.scope.split()
                if 'contacts.write' not in scopes:
                    return Response({
                        'error': 'Insufficient scope. Required: contacts.write',
                        'your_scopes': scopes
                    }, status=403)
            
            serializer = ContatoOAuthSerializer(contato, data=request.data, partial=True)
            if serializer.is_valid():
                contato = serializer.save()
                response_data = {
                    'success': True,
                    'data': ContatoOAuthSerializer(contato).data,
                    'message': 'Contato atualizado com sucesso'
                }
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Dados de entrada inválidos'
                }, status=400)
                
        elif request.method == 'DELETE':
            if hasattr(request.auth, 'scope'):
                scopes = request.auth.scope.split()
                if 'contacts.delete' not in scopes:
                    return Response({
                        'error': 'Insufficient scope. Required: contacts.delete',
                        'your_scopes': scopes
                    }, status=403)
            
            contato_nome = contato.nome
            contato.delete()
            response_data = {
                'success': True,
                'message': f'Contato "{contato_nome}" deletado com sucesso'
            }
        
        log_api_usage(request, f'contacts/{contact_id}', status.HTTP_200_OK, time.time() - start_time)
        return Response(response_data)
        
    except Contato.DoesNotExist:
        return Response({
            'success': False,
            'error': f'Contato com ID {contact_id} não encontrado',
            'message': 'Contato não existe'
        }, status=404)
    except Exception as e:
        log_api_usage(request, f'contacts/{contact_id}', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

# ===== ENDPOINTS PARA CONVERSAS =====

@api_view(['GET'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def conversations_list_endpoint(request):
    """Lista conversas - OAuth2 obrigatório"""
    start_time = time.time()
    
    try:
        # Verificação de escopo
        if hasattr(request.auth, 'scope'):
            scopes = request.auth.scope.split()
            if 'conversations.read' not in scopes:
                return Response({
                    'error': 'Insufficient scope. Required: conversations.read',
                    'your_scopes': scopes
                }, status=403)
        else:
            return Response({'error': 'No OAuth2 token provided'}, status=401)
        
        conversas = Conversa.objects.all().select_related('contato', 'operador').prefetch_related('interacoes')
        
        # Filtros
        if 'status' in request.GET:
            status_filter = request.GET['status']
            if status_filter in ['entrada', 'atendimento', 'resolvida']:
                conversas = conversas.filter(status=status_filter)
            else:
                return Response({
                    'error': 'Status inválido. Use: entrada, atendimento, resolvida'
                }, status=400)
        
        if 'contact_id' in request.GET:
            try:
                contact_id = int(request.GET['contact_id'])
                conversas = conversas.filter(contato_id=contact_id)
            except ValueError:
                return Response({'error': 'contact_id deve ser um número'}, status=400)
        
        if 'limit' in request.GET:
            try:
                limit = int(request.GET['limit'])
                conversas = conversas[:limit]
            except ValueError:
                return Response({'error': 'limit deve ser um número'}, status=400)
        
        serializer = ConversaOAuthSerializer(conversas, many=True)
        response_data = {
            'success': True,
            'data': serializer.data,
            'total': conversas.count(),
            'filters_applied': {
                'status': request.GET.get('status', None),
                'contact_id': request.GET.get('contact_id', None),
                'limit': request.GET.get('limit', None)
            },
            'message': 'Conversas recuperadas com sucesso'
        }
        
        log_api_usage(request, 'conversations', status.HTTP_200_OK, time.time() - start_time)
        return Response(response_data)
        
    except Exception as e:
        log_api_usage(request, 'conversations', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

@api_view(['POST'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def conversations_send_message_endpoint(request):
    """Enviar mensagem em conversa - OAuth2 obrigatório"""
    start_time = time.time()
    
    try:
        # Verificação de escopo
        if hasattr(request.auth, 'scope'):
            scopes = request.auth.scope.split()
            if 'conversations.write' not in scopes:
                return Response({
                    'error': 'Insufficient scope. Required: conversations.write',
                    'your_scopes': scopes
                }, status=403)
        else:
            return Response({'error': 'No OAuth2 token provided'}, status=401)
        
        # Validar dados obrigatórios
        conversation_id = request.data.get('conversation_id')
        message = request.data.get('message')
        sender = request.data.get('sender', 'system')
        
        if not conversation_id or not message:
            return Response({
                'success': False,
                'error': 'Campos obrigatórios: conversation_id, message',
                'required_fields': ['conversation_id', 'message'],
                'optional_fields': ['sender']
            }, status=400)
        
        # Validar se conversa existe
        try:
            conversa = Conversa.objects.get(id=conversation_id)
        except Conversa.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Conversa com ID {conversation_id} não encontrada'
            }, status=404)
        
        # Validar remetente
        if sender not in ['cliente', 'operador', 'system']:
            return Response({
                'success': False,
                'error': 'Sender inválido. Use: cliente, operador, system'
            }, status=400)
        
        # Obter operador se existir
        operador = None
        if hasattr(request.user, 'operador'):
            operador = request.user.operador
        
        # Criar interação
        interacao = Interacao.objects.create(
            conversa=conversa,
            mensagem=message,
            remetente=sender,
            operador=operador
        )
        
        # Atualizar status da conversa se necessário
        if conversa.status == 'entrada' and sender == 'operador':
            conversa.status = 'atendimento'
            conversa.save()
        
        response_data = {
            'success': True,
            'data': {
                'interaction_id': interacao.id,
                'conversation_id': conversa.id,
                'message': message,
                'sender': sender,
                'timestamp': interacao.criado_em.isoformat(),
                'conversation_status': conversa.status
            },
            'message': 'Mensagem enviada com sucesso'
        }
        
        log_api_usage(request, 'conversations/send-message', status.HTTP_201_CREATED, time.time() - start_time)
        return Response(response_data, status=201)
        
    except Exception as e:
        log_api_usage(request, 'conversations/send-message', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

@api_view(['PUT'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def conversation_status_endpoint(request, conversation_id):
    """Alterar status da conversa - OAuth2 obrigatório"""
    start_time = time.time()
    
    try:
        # Verificação de escopo
        if hasattr(request.auth, 'scope'):
            scopes = request.auth.scope.split()
            if 'conversations.manage' not in scopes:
                return Response({
                    'error': 'Insufficient scope. Required: conversations.manage',
                    'your_scopes': scopes
                }, status=403)
        else:
            return Response({'error': 'No OAuth2 token provided'}, status=401)
        
        # Validar se conversa existe
        try:
            conversa = Conversa.objects.get(id=conversation_id)
        except Conversa.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Conversa com ID {conversation_id} não encontrada'
            }, status=404)
        
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({
                'success': False,
                'error': 'Campo "status" é obrigatório',
                'valid_statuses': ['entrada', 'atendimento', 'resolvida']
            }, status=400)
        
        if new_status not in ['entrada', 'atendimento', 'resolvida']:
            return Response({
                'success': False,
                'error': 'Status inválido',
                'valid_statuses': ['entrada', 'atendimento', 'resolvida'],
                'received': new_status
            }, status=400)
        
        old_status = conversa.status
        conversa.status = new_status
        conversa.save()
        
        response_data = {
            'success': True,
            'data': {
                'conversation_id': conversa.id,
                'old_status': old_status,
                'new_status': conversa.status,
                'updated_at': conversa.atualizado_em.isoformat(),
                'contact_name': conversa.contato.nome
            },
            'message': f'Status alterado de "{old_status}" para "{new_status}"'
        }
        
        log_api_usage(request, f'conversations/{conversation_id}/status', status.HTTP_200_OK, time.time() - start_time)
        return Response(response_data)
        
    except Exception as e:
        log_api_usage(request, f'conversations/{conversation_id}/status', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

# ===== ENDPOINTS PARA BASE DE CONHECIMENTO =====

@api_view(['GET', 'POST'])
@authentication_classes([OAuth2Authentication])
@permission_classes([IsAuthenticated])
def knowledge_endpoint(request):
    """Endpoint para base de conhecimento - OAuth2 obrigatório"""
    start_time = time.time()
    
    try:
        if request.method == 'GET':
            # Verificação de escopo
            if hasattr(request.auth, 'scope'):
                scopes = request.auth.scope.split()
                if 'knowledge.read' not in scopes:
                    return Response({
                        'error': 'Insufficient scope. Required: knowledge.read',
                        'your_scopes': scopes
                    }, status=403)
            else:
                return Response({'error': 'No OAuth2 token provided'}, status=401)
            
            # Filtros
            category_filter = request.GET.get('category', None)
            search_filter = request.GET.get('search', None)
            
            # Base de conhecimento mockada
            knowledge_data = [
                {
                    'id': 1,
                    'title': 'Como usar o CRM',
                    'content': 'Guia completo para utilização do sistema CRM...',
                    'category': 'tutorial',
                    'tags': ['crm', 'tutorial', 'guia'],
                    'author': 'Admin',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                    'views': 150
                },
                {
                    'id': 2,
                    'title': 'Integração com n8n',
                    'content': 'Como integrar o CRM com n8n para automação...',
                    'category': 'integration',
                    'tags': ['n8n', 'automation', 'api'],
                    'author': 'Tech Team',
                    'created_at': '2024-01-02T00:00:00Z',
                    'updated_at': '2024-01-02T00:00:00Z',
                    'views': 89
                },
                {
                    'id': 3,
                    'title': 'OAuth2 Configuration',
                    'content': 'Como configurar autenticação OAuth2...',
                    'category': 'security',
                    'tags': ['oauth2', 'security', 'api'],
                    'author': 'Security Team',
                    'created_at': '2024-01-03T00:00:00Z',
                    'updated_at': '2024-01-03T00:00:00Z',
                    'views': 67
                }
            ]
            
            # Aplicar filtros
            filtered_data = knowledge_data
            
            if category_filter:
                filtered_data = [item for item in filtered_data if item['category'] == category_filter]
            
            if search_filter:
                filtered_data = [
                    item for item in filtered_data 
                    if search_filter.lower() in item['title'].lower() 
                    or search_filter.lower() in item['content'].lower()
                    or search_filter.lower() in ' '.join(item['tags']).lower()
                ]
            
            response_data = {
                'success': True,
                'data': filtered_data,
                'total': len(filtered_data),
                'filters_applied': {
                    'category': category_filter,
                    'search': search_filter
                },
                'available_categories': ['tutorial', 'integration', 'security'],
                'message': 'Base de conhecimento recuperada com sucesso'
            }
            
        elif request.method == 'POST':
            # Verificação de escopo
            if hasattr(request.auth, 'scope'):
                scopes = request.auth.scope.split()
                if 'knowledge.write' not in scopes:
                    return Response({
                        'error': 'Insufficient scope. Required: knowledge.write',
                        'your_scopes': scopes
                    }, status=403)
            else:
                return Response({'error': 'No OAuth2 token provided'}, status=401)
            
            # Validar dados obrigatórios
            title = request.data.get('title')
            content = request.data.get('content')
            category = request.data.get('category', 'general')
            
            if not title or not content:
                return Response({
                    'success': False,
                    'error': 'Campos obrigatórios: title, content',
                    'required_fields': ['title', 'content'],
                    'optional_fields': ['category', 'tags']
                }, status=400)
            
            # Simular criação
            new_article = {
                'id': 999,
                'title': title,
                'content': content,
                'category': category,
                'tags': request.data.get('tags', []),
                'author': str(request.user),
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'views': 0
            }
            
            response_data = {
                'success': True,
                'data': new_article,
                'message': 'Artigo criado com sucesso'
            }
        
        log_api_usage(request, 'knowledge', status.HTTP_200_OK, time.time() - start_time)
        return Response(response_data)
        
    except Exception as e:
        log_api_usage(request, 'knowledge', status.HTTP_500_INTERNAL_SERVER_ERROR, time.time() - start_time)
        return Response({
            'success': False,
            'error': str(e) if settings.DEBUG else 'Erro interno do servidor',
            'message': 'Erro interno do servidor'
        }, status=500)

# ===== FUNÇÕES AUXILIARES =====

def log_api_usage(request, endpoint, status_code, response_time):
    """Registrar uso da API"""
    try:
        token = request.auth
        if token and hasattr(token, 'application'):
            app = CrmApplication.objects.filter(
                application=token.application
            ).first()
            
            if app:
                ApiUsageLog.objects.create(
                    application=app,
                    endpoint=endpoint,
                    method=request.method,
                    status_code=status_code,
                    response_time=response_time,
                    user=request.user if request.user.is_authenticated else None,
                    ip_address=get_client_ip(request)
                )
    except Exception as e:
        if settings.DEBUG:
            print(f"Erro ao registrar log: {e}")

def get_client_ip(request):
    """Obter IP do cliente"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# ===== ENDPOINT DE INFORMAÇÕES DA API =====

@api_view(['GET'])
@permission_classes([AllowAny])
def api_info_endpoint(request):
    """Informações sobre a API e escopos disponíveis"""
    info = {
        'name': 'CRM OAuth2 API',
        'version': '1.0.0',
        'description': 'API completa para integração com CRM via OAuth2',
        'endpoints': {
            'info': {
                'url': '/api/oauth/info/',
                'methods': ['GET'],
                'auth_required': False,
                'description': 'Informações da API'
            },
            'test': {
                'url': '/api/oauth/test/',
                'methods': ['GET'],
                'auth_required': False,
                'description': 'Endpoint de teste'
            },
            'contacts': {
                'list': {
                    'url': '/api/oauth/contacts/',
                    'methods': ['GET'],
                    'auth_required': True,
                    'scopes': ['contacts.read'],
                    'description': 'Listar contatos'
                },
                'create': {
                    'url': '/api/oauth/contacts/create/',
                    'methods': ['POST'],
                    'auth_required': True,
                    'scopes': ['contacts.write'],
                    'description': 'Criar contato'
                },
                'detail': {
                    'url': '/api/oauth/contacts/{id}/',
                    'methods': ['GET', 'PUT', 'DELETE'],
                    'auth_required': True,
                    'scopes': ['contacts.read', 'contacts.write', 'contacts.delete'],
                    'description': 'Operações em contato específico'
                }
            },
            'conversations': {
                'list': {
                    'url': '/api/oauth/conversations/',
                    'methods': ['GET'],
                    'auth_required': True,
                    'scopes': ['conversations.read'],
                    'description': 'Listar conversas'
                },
                'send_message': {
                    'url': '/api/oauth/conversations/send-message/',
                    'methods': ['POST'],
                    'auth_required': True,
                    'scopes': ['conversations.write'],
                    'description': 'Enviar mensagem'
                },
                'status': {
                    'url': '/api/oauth/conversations/{id}/status/',
                    'methods': ['PUT'],
                    'auth_required': True,
                    'scopes': ['conversations.manage'],
                    'description': 'Alterar status da conversa'
                }
            },
            'knowledge': {
                'url': '/api/oauth/knowledge/',
                'methods': ['GET', 'POST'],
                'auth_required': True,
                'scopes': ['knowledge.read', 'knowledge.write'],
                'description': 'Base de conhecimento'
            }
        },
        'scopes': {
            'contacts.read': 'Ler contatos',
            'contacts.write': 'Criar e editar contatos',
            'contacts.delete': 'Deletar contatos',
            'conversations.read': 'Ler conversas',
            'conversations.write': 'Enviar mensagens',
            'conversations.manage': 'Gerenciar status de conversas',
            'knowledge.read': 'Ler base de conhecimento',
            'knowledge.write': 'Editar base de conhecimento',
        },
        'authentication': {
            'type': 'OAuth2',
            'token_url': '/o/token/',
            'authorize_url': '/o/authorize/',
            'supported_grant_types': ['client_credentials', 'authorization_code']
        },
        'token_info': {
            'has_token': hasattr(request, 'auth') and request.auth is not None,
            'scopes': request.auth.scope.split() if hasattr(request.auth, 'scope') else [],
            'application': str(request.auth.application) if hasattr(request.auth, 'application') else None
        } if hasattr(request, 'auth') else {'has_token': False},
        'server_time': time.strftime('%Y-%m-%dT%H:%M:%SZ')
    }
    
    return Response(info)

# ===== ENDPOINT DE TESTE =====

@api_view(['GET'])
@permission_classes([AllowAny])
def test_endpoint(request):
    """Endpoint de teste sem autenticação"""
    return Response({
        'status': 'success',
        'message': 'API está funcionando perfeitamente!',
        'timestamp': time.time(),
        'server': 'Django CRM OAuth2 API',
        'version': '1.0.0',
        'endpoints_available': [
            '/api/oauth/info/',
            '/api/oauth/test/',
            '/api/oauth/contacts/',
            '/api/oauth/conversations/',
            '/api/oauth/knowledge/'
        ]
    })

# ===== ENDPOINTS PÚBLICOS (DESENVOLVIMENTO) =====

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def contacts_public_endpoint(request):
    """Endpoint público para contatos - apenas desenvolvimento"""
    if not settings.DEBUG:
        return Response({
            'error': 'Endpoint público disponível apenas em modo DEBUG'
        }, status=403)
        
    start_time = time.time()
    
    try:
        if request.method == 'GET':
            contatos = Contato.objects.all()
            
            # Filtros opcionais
            if 'search' in request.GET:
                search = request.GET['search']
                contatos = contatos.filter(
                    models.Q(nome__icontains=search) |
                    models.Q(email__icontains=search) |
                    models.Q(telefone__icontains=search)
                )
            
            if 'limit' in request.GET:
                try:
                    limit = int(request.GET['limit'])
                    contatos = contatos[:limit]
                except ValueError:
                    pass
            
            serializer = ContatoOAuthSerializer(contatos, many=True)
            
            response_data = {
                'success': True,
                'data': serializer.data,
                'total': contatos.count(),
                'message': 'Contatos recuperados com sucesso (modo desenvolvimento)',
                'warning': 'Endpoint público - use OAuth2 em produção'
            }
            
        elif request.method == 'POST':
            serializer = ContatoOAuthSerializer(data=request.data)
            if serializer.is_valid():
                contato = serializer.save()
                response_data = {
                    'success': True,
                    'data': ContatoOAuthSerializer(contato).data,
                    'message': 'Contato criado com sucesso (modo desenvolvimento)',
                    'warning': 'Endpoint público - use OAuth2 em produção'
                }
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=400)
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def conversations_public_endpoint(request):
    """Endpoint público para conversas - apenas desenvolvimento"""
    if not settings.DEBUG:
        return Response({
            'error': 'Endpoint público disponível apenas em modo DEBUG'
        }, status=403)
        
    start_time = time.time()
    
    try:
        if request.method == 'GET':
            conversas = Conversa.objects.all().select_related('contato', 'operador')
            
            # Filtros
            if 'status' in request.GET:
                conversas = conversas.filter(status=request.GET['status'])
            
            if 'contact_id' in request.GET:
                try:
                    contact_id = int(request.GET['contact_id'])
                    conversas = conversas.filter(contato_id=contact_id)
                except ValueError:
                    pass
            
            serializer = ConversaOAuthSerializer(conversas, many=True)
            response_data = {
                'success': True,
                'data': serializer.data,
                'total': conversas.count(),
                'message': 'Conversas recuperadas com sucesso (modo desenvolvimento)',
                'warning': 'Endpoint público - use OAuth2 em produção'
            }
            
        elif request.method == 'POST':
            # Enviar mensagem modo público
            conversation_id = request.data.get('conversation_id')
            message = request.data.get('message')
            sender = request.data.get('sender', 'system')
            
            if not conversation_id or not message:
                return Response({
                    'success': False,
                    'error': 'conversation_id e message são obrigatórios'
                }, status=400)
            
            try:
                conversa = Conversa.objects.get(id=conversation_id)
            except Conversa.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Conversa com ID {conversation_id} não encontrada'
                }, status=404)
            
            # Criar interação
            interacao = Interacao.objects.create(
                conversa=conversa,
                mensagem=message,
                remetente=sender
            )
            
            response_data = {
                'success': True,
                'data': {
                    'interaction_id': interacao.id,
                    'conversation_id': conversa.id,
                    'message': message,
                    'sender': sender,
                    'timestamp': interacao.criado_em.isoformat()
                },
                'message': 'Mensagem enviada com sucesso (modo desenvolvimento)',
                'warning': 'Endpoint público - use OAuth2 em produção'
            }
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)