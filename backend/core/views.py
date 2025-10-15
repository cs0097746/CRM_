from django.shortcuts import render
from django.shortcuts import render
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from django.db.models import Count
from atendimento.models import Conversa, Interacao, TarefaAtendimento
from contato.models import Contato, Operador
from contato.serializers import ContatoSerializer
from atendimento.views import verificar_status_instancia
from core.models import ConfiguracaoSistema
from django.http import JsonResponse


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
        },
        'whatsapp': {
            'mensagens_enviadas_hoje': Interacao.objects.filter(
                criado_em__date=hoje,
                remetente='operador'
            ).count(),
            'mensagens_recebidas_hoje': Interacao.objects.filter(
                criado_em__date=hoje,
                remetente='cliente'
            ).count()
        }
    }

    return Response(stats)


# ===== ENDPOINTS PARA INTEGRAÇÃO N8N =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def webhook_n8n_lead(request):
    """Endpoint para N8N criar/atualizar leads"""
    try:
        data = request.data
        numero = data.get('numero')
        nome = data.get('nome', f'Lead {numero}')
        tipo_interesse = data.get('tipo_interesse', 'geral')
        origem = data.get('origem', 'whatsapp')

        # Buscar ou criar contato
        contato, created = Contato.objects.get_or_create(
            telefone=numero,
            defaults={
                'nome': nome,
                'observacoes': f'Interesse: {tipo_interesse}'
            }
        )

        # Criar conversa se não existir
        conversa, conv_created = Conversa.objects.get_or_create(
            contato=contato,
            status__in=['entrada', 'atendimento'],
            defaults={
                'status': 'entrada',
                'origem': origem
            }
        )

        return Response({
            'success': True,
            'contato_id': contato.pk,
            'conversa_id': conversa.pk,
            'created': created,
            'message': 'Lead processado com sucesso'
        })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_contato_por_telefone(request):
    """Buscar contato por telefone para N8N"""
    numero = request.GET.get('numero')

    if not numero:
        return Response({'error': 'Parâmetro numero é obrigatório'}, status=400)

    try:
        contato = Contato.objects.get(telefone=numero)
        serializer = ContatoSerializer(contato)

        conversa_ativa = Conversa.objects.filter(
            contato=contato,
            status__in=['entrada', 'atendimento']
        ).first()

        return Response({
            'found': True,
            'contato': serializer.data,
            'conversa_id': conversa_ativa.pk if conversa_ativa else None,
            'is_cliente': True
        })

    except Contato.DoesNotExist:
        return Response({
            'found': False,
            'is_cliente': False
        })


# ===== HEALTH CHECK PARA VPS =====

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check para monitoramento da VPS"""
    try:
        # Verificar database
        contatos_count = Contato.objects.count()

        # Verificar Evolution API
        status_whatsapp = verificar_status_instancia()

        return Response({
            'status': 'healthy',
            'timestamp': timezone.now(),
            'database': {
                'connected': True,
                'contatos': contatos_count
            },
            'whatsapp': {
                'connected': status_whatsapp.get('connected', False),
                'status': status_whatsapp.get('status', 'unknown')
            },
            'services': {
                'backend': 'online',
                'evolution_api': 'https://evo.loomiecrm.com',
                'frontend': 'https://crm.loomiecrm.com'
            }
        })

    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now()
        }, status=500)


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

        user = authenticate(username=username, password=password)

        if user:
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
    """Criar usuário para teste"""
    try:
        username = request.data.get('username', 'testuser')
        password = request.data.get('password', 'test123')
        email = request.data.get('email', 'test@test.com')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Test',
                'last_name': 'User'
            }
        )

        if created:
            user.set_password(password)
            user.save()

            # Criar operador
            operador, op_created = Operador.objects.get_or_create(
                user=user,
                defaults={
                    'ativo': True,
                    'ramal': '1001',
                    'setor': 'Atendimento'
                }
            )

            return Response({
                'success': True,
                'message': 'Usuário e operador criados com sucesso',
                'user_id': user.pk,
                'operador_id': operador.pk
            })
        else:
            return Response({
                'success': False,
                'message': 'Usuário já existe'
            })

    except Exception as e:
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=500)
    



@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def configuracao_sistema(request):
    """Gerenciar configurações do sistema"""
    try:
        config, created = ConfiguracaoSistema.objects.get_or_create(
            defaults={
                'nome_empresa': 'Minha Empresa',
                'cor_primaria': '#1877f2',
                'evolution_api_url': 'https://evolution-api.local',
                'whatsapp_instance_name': 'main'
            }
        )
        
        if request.method == 'GET':
            return Response({
                'nome_empresa': config.nome_empresa,
                'logo': config.logo.url if config.logo else None,
                'cor_primaria': config.cor_primaria,
                'cor_secundaria': config.cor_secundaria,
                'evolution_api_url': config.evolution_api_url,
                'evolution_api_key': config.evolution_api_key,
                'whatsapp_instance_name': config.whatsapp_instance_name,
                'openai_api_key': config.openai_api_key,
                'elevenlabs_api_key': config.elevenlabs_api_key,
            })
        
        elif request.method == 'PUT':
            # Atualizar configurações
            campos_permitidos = [
                'nome_empresa', 'cor_primaria', 'cor_secundaria',
                'evolution_api_url', 'evolution_api_key', 'whatsapp_instance_name',
                'openai_api_key', 'elevenlabs_api_key'
            ]
            
            for campo in campos_permitidos:
                if campo in request.data:
                    setattr(config, campo, request.data[campo])
            
            config.save()
            
            return Response({
                'success': True, 
                'message': 'Configurações salvas com sucesso!'
            })
            
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

def health(request):
    return JsonResponse({"status": "ok"})
