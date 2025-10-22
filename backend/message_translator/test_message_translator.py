"""
Testes de Validação - Message Translator
Verifica se tudo está alinhado e funcionando corretamente
"""
import json
from datetime import datetime


def test_1_schema_loomie():
    """✅ Teste 1: Schema LoomieMessage está correto?"""
    print("\n" + "="*60)
    print("TESTE 1: Validando Schema LoomieMessage")
    print("="*60)
    
    from message_translator.schemas import LoomieMessage, LoomieMedia
    
    # Criar mensagem com todos os campos
    msg = LoomieMessage(
        sender="whatsapp:5511999999999",
        recipient="system:crm",
        channel_type="whatsapp",
        content_type="text",
        text="Teste de mensagem",
        sender_name="João Silva"
    )
    
    # Validar campos obrigatórios
    assert msg.message_id.startswith("loomie_"), "❌ message_id deve começar com 'loomie_'"
    assert msg.sender == "whatsapp:5511999999999", "❌ sender incorreto"
    assert msg.channel_type == "whatsapp", "❌ channel_type incorreto"
    assert msg.text == "Teste de mensagem", "❌ text incorreto"
    
    # Testar conversão to_dict
    msg_dict = msg.to_dict()
    assert isinstance(msg_dict, dict), "❌ to_dict() deve retornar dict"
    assert "message_id" in msg_dict, "❌ to_dict() deve conter message_id"
    assert isinstance(msg_dict['timestamp'], str), "❌ timestamp deve ser string ISO"
    
    # Testar from_dict
    msg_restored = LoomieMessage.from_dict(msg_dict)
    assert msg_restored.message_id == msg.message_id, "❌ from_dict() falhou"
    assert msg_restored.text == msg.text, "❌ from_dict() perdeu dados"
    
    # Testar add_media
    msg.add_media(tipo='image', url='https://example.com/image.jpg', mime_type='image/jpeg')
    assert len(msg.media) == 1, "❌ add_media() não funcionou"
    assert msg.media[0].tipo == 'image', "❌ tipo de mídia incorreto"
    
    print("✅ Schema LoomieMessage: OK")
    print(f"   • message_id auto-gerado: {msg.message_id}")
    print(f"   • to_dict() e from_dict(): OK")
    print(f"   • add_media(): OK")
    return True


def test_2_whatsapp_translator():
    """✅ Teste 2: WhatsAppTranslator funciona corretamente?"""
    print("\n" + "="*60)
    print("TESTE 2: Validando WhatsAppTranslator")
    print("="*60)
    
    from message_translator.translators import WhatsAppTranslator
    from message_translator.schemas import LoomieMessage
    
    translator = WhatsAppTranslator()
    
    # Payload Evolution API (formato com wrapper "data")
    payload_evolution = {
        "event": "messages.upsert",
        "instance": "teste",
        "data": {
            "key": {
                "remoteJid": "5511999999999@s.whatsapp.net",
                "fromMe": False,
                "id": "3EB0123456789"
            },
            "message": {
                "conversation": "Olá, tudo bem?"
            },
            "messageTimestamp": 1700000000,
            "pushName": "João Silva"
        }
    }
    
    # Testar to_loomie (Evolution → Loomie)
    loomie_msg = translator.to_loomie(payload_evolution)
    
    assert loomie_msg.sender == "whatsapp:5511999999999", f"❌ sender incorreto: {loomie_msg.sender}"
    assert loomie_msg.text == "Olá, tudo bem?", f"❌ text incorreto: {loomie_msg.text}"
    assert loomie_msg.channel_type == "whatsapp", "❌ channel_type incorreto"
    assert loomie_msg.external_id == "3EB0123456789", "❌ external_id incorreto"
    assert loomie_msg.sender_name == "João Silva", "❌ sender_name incorreto"
    
    print("✅ WhatsAppTranslator.to_loomie(): OK")
    print(f"   • Extração de sender: {loomie_msg.sender}")
    print(f"   • Extração de text: {loomie_msg.text}")
    print(f"   • Extração de sender_name: {loomie_msg.sender_name}")
    
    # Testar from_loomie (Loomie → Evolution)
    loomie_saida = LoomieMessage(
        sender="system:crm",
        recipient="whatsapp:5511999999999",
        channel_type="whatsapp",
        content_type="text",
        text="Olá! Como posso ajudar?"
    )
    
    payload_saida = translator.from_loomie(loomie_saida)
    
    assert "number" in payload_saida, "❌ Payload deve ter 'number'"
    assert "text" in payload_saida, "❌ Payload deve ter 'text'"
    assert payload_saida["number"] == "5511999999999", f"❌ number incorreto: {payload_saida['number']}"
    assert payload_saida["text"] == "Olá! Como posso ajudar?", "❌ text incorreto"
    
    print("✅ WhatsAppTranslator.from_loomie(): OK")
    print(f"   • Payload gerado: {json.dumps(payload_saida, indent=2)}")
    
    return True


def test_3_models_consistency():
    """✅ Teste 3: Models estão consistentes?"""
    print("\n" + "="*60)
    print("TESTE 3: Validando Models Django")
    print("="*60)
    
    from message_translator.models import CanalConfig, MensagemLog, WebhookCustomizado
    
    # Verificar choices em CanalConfig
    tipos_canal = dict(CanalConfig.TIPOS_CANAL)
    assert 'whatsapp' in tipos_canal, "❌ 'whatsapp' não está em TIPOS_CANAL"
    assert 'telegram' in tipos_canal, "❌ 'telegram' não está em TIPOS_CANAL"
    assert 'evo' in tipos_canal, "❌ 'evo' não está em TIPOS_CANAL"
    assert 'n8n' in tipos_canal, "❌ 'n8n' não está em TIPOS_CANAL"
    
    print("✅ CanalConfig.TIPOS_CANAL: OK")
    print(f"   • Tipos disponíveis: {list(tipos_canal.keys())}")
    
    # Verificar choices em WebhookCustomizado
    filtros_canal = dict(WebhookCustomizado.FILTRO_CANAL_CHOICES)
    assert 'todos' in filtros_canal, "❌ 'todos' não está em FILTRO_CANAL_CHOICES"
    assert 'whatsapp' in filtros_canal, "❌ 'whatsapp' não está em FILTRO_CANAL_CHOICES"
    
    filtros_direcao = dict(WebhookCustomizado.FILTRO_DIRECAO_CHOICES)
    assert 'ambas' in filtros_direcao, "❌ 'ambas' não está em FILTRO_DIRECAO_CHOICES"
    assert 'entrada' in filtros_direcao, "❌ 'entrada' não está em FILTRO_DIRECAO_CHOICES"
    assert 'saida' in filtros_direcao, "❌ 'saida' não está em FILTRO_DIRECAO_CHOICES"
    
    print("✅ WebhookCustomizado choices: OK")
    print(f"   • Filtros de canal: {list(filtros_canal.keys())}")
    print(f"   • Filtros de direção: {list(filtros_direcao.keys())}")
    
    return True


def test_4_translator_factory():
    """✅ Teste 4: Factory de tradutores funciona?"""
    print("\n" + "="*60)
    print("TESTE 4: Validando Translator Factory")
    print("="*60)
    
    from message_translator.translators import get_translator, TRANSLATORS
    
    # Verificar se todos os tradutores estão registrados
    expected_translators = ['whatsapp', 'evo', 'telegram', 'n8n']
    
    for channel in expected_translators:
        assert channel in TRANSLATORS, f"❌ Tradutor '{channel}' não registrado"
        translator = get_translator(channel)
        assert translator is not None, f"❌ get_translator('{channel}') retornou None"
        print(f"   ✅ {channel}: {translator.__class__.__name__}")
    
    print("✅ Translator Factory: OK")
    
    return True


def test_5_router_logic():
    """✅ Teste 5: Router logic está correto?"""
    print("\n" + "="*60)
    print("TESTE 5: Validando Router Logic")
    print("="*60)
    
    from message_translator.router import (
        processar_mensagem_entrada,
        enviar_para_webhook_customizado,
        processar_webhooks_customizados
    )
    
    # Verificar se funções existem e têm assinaturas corretas
    import inspect
    
    # processar_mensagem_entrada
    sig = inspect.signature(processar_mensagem_entrada)
    params = list(sig.parameters.keys())
    assert 'loomie_message' in params, "❌ processar_mensagem_entrada deve ter 'loomie_message'"
    assert 'canal' in params, "❌ processar_mensagem_entrada deve ter 'canal'"
    print("   ✅ processar_mensagem_entrada: assinatura OK")
    
    # enviar_para_webhook_customizado
    sig = inspect.signature(enviar_para_webhook_customizado)
    params = list(sig.parameters.keys())
    assert 'webhook' in params, "❌ enviar_para_webhook_customizado deve ter 'webhook'"
    assert 'loomie_data' in params, "❌ enviar_para_webhook_customizado deve ter 'loomie_data'"
    assert 'tentativa' in params, "❌ enviar_para_webhook_customizado deve ter 'tentativa'"
    print("   ✅ enviar_para_webhook_customizado: assinatura OK")
    
    # processar_webhooks_customizados
    sig = inspect.signature(processar_webhooks_customizados)
    params = list(sig.parameters.keys())
    assert 'loomie_message' in params, "❌ processar_webhooks_customizados deve ter 'loomie_message'"
    assert 'direcao' in params, "❌ processar_webhooks_customizados deve ter 'direcao'"
    print("   ✅ processar_webhooks_customizados: assinatura OK")
    
    print("✅ Router Logic: OK")
    
    return True


def test_6_api_endpoints_structure():
    """✅ Teste 6: Estrutura de endpoints está correta?"""
    print("\n" + "="*60)
    print("TESTE 6: Validando Estrutura de Endpoints")
    print("="*60)
    
    from message_translator.views import (
        webhook_entrada,
        webhook_saida,
        CanalConfigViewSet,
        MensagemLogViewSet,
        WebhookCustomizadoViewSet
    )
    
    # Verificar se views existem
    assert webhook_entrada is not None, "❌ webhook_entrada não existe"
    assert webhook_saida is not None, "❌ webhook_saida não existe"
    print("   ✅ webhook_entrada: OK")
    print("   ✅ webhook_saida: OK")
    
    # Verificar ViewSets
    assert CanalConfigViewSet is not None, "❌ CanalConfigViewSet não existe"
    assert MensagemLogViewSet is not None, "❌ MensagemLogViewSet não existe"
    assert WebhookCustomizadoViewSet is not None, "❌ WebhookCustomizadoViewSet não existe"
    print("   ✅ CanalConfigViewSet: OK")
    print("   ✅ MensagemLogViewSet: OK")
    print("   ✅ WebhookCustomizadoViewSet: OK")
    
    print("✅ Endpoints: OK")
    
    return True


def test_7_serializers():
    """✅ Teste 7: Serializers estão corretos?"""
    print("\n" + "="*60)
    print("TESTE 7: Validando Serializers")
    print("="*60)
    
    from message_translator.serializers import (
        CanalConfigSerializer,
        MensagemLogSerializer,
        WebhookCustomizadoSerializer
    )
    
    # Verificar se serializers existem
    assert CanalConfigSerializer is not None, "❌ CanalConfigSerializer não existe"
    assert MensagemLogSerializer is not None, "❌ MensagemLogSerializer não existe"
    assert WebhookCustomizadoSerializer is not None, "❌ WebhookCustomizadoSerializer não existe"
    
    print("   ✅ CanalConfigSerializer: OK")
    print("   ✅ MensagemLogSerializer: OK")
    print("   ✅ WebhookCustomizadoSerializer: OK")
    
    print("✅ Serializers: OK")
    
    return True


def run_all_tests():
    """Executa todos os testes"""
    print("\n" + "╔" + "="*58 + "╗")
    print("║" + " "*10 + "MESSAGE TRANSLATOR - VALIDAÇÃO COMPLETA" + " "*9 + "║")
    print("╚" + "="*58 + "╝")
    
    tests = [
        test_1_schema_loomie,
        test_2_whatsapp_translator,
        test_3_models_consistency,
        test_4_translator_factory,
        test_5_router_logic,
        test_6_api_endpoints_structure,
        test_7_serializers,
    ]
    
    results = []
    
    for test_func in tests:
        try:
            result = test_func()
            results.append((test_func.__name__, True, None))
        except Exception as e:
            results.append((test_func.__name__, False, str(e)))
            print(f"❌ FALHA: {e}")
    
    # Resumo
    print("\n" + "="*60)
    print("RESUMO DOS TESTES")
    print("="*60)
    
    passed = sum(1 for _, success, _ in results if success)
    failed = len(results) - passed
    
    for test_name, success, error in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status}: {test_name}")
        if error:
            print(f"   Erro: {error}")
    
    print("\n" + "="*60)
    print(f"Total: {len(results)} testes")
    print(f"✅ Passou: {passed}")
    print(f"❌ Falhou: {failed}")
    print(f"Taxa de Sucesso: {(passed/len(results)*100):.1f}%")
    print("="*60)
    
    if failed == 0:
        print("\n🎉 TODOS OS TESTES PASSARAM! Sistema está alinhado e pronto.")
    else:
        print(f"\n⚠️ {failed} teste(s) falharam. Verifique os erros acima.")
    
    return failed == 0


if __name__ == '__main__':
    import sys
    import os
    
    # Adicionar path do Django
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    
    # Configurar Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    import django
    django.setup()
    
    # Executar testes
    success = run_all_tests()
    sys.exit(0 if success else 1)
