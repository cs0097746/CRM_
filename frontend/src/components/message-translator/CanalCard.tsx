import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';

interface CanalCardProps {
  /** URL do logo do canal (ex: /images/whatsapp-logo.png) */
  logo: string;
  /** Nome do canal (ex: "WhatsApp", "Instagram") */
  titulo: string;
  /** Descrição do canal */
  descricao: string;
  /** Se o canal está conectado */
  conectado: boolean;
  /** Callback ao clicar em "Conectar" */
  onConectar: () => void;
  /** Callback ao clicar em "Gerenciar" (opcional) */
  onGerenciar?: () => void;
  /** Callback ao clicar em "Gerar QR Code" (opcional) */
  onGerarQR?: () => void;
  /** Se o canal está desabilitado (ex: limite do plano) */
  desabilitado?: boolean;
  /** Mensagem quando desabilitado (ex: "Disponível em breve") */
  mensagemDesabilitado?: string;
}

const CanalCard: React.FC<CanalCardProps> = ({
  logo,
  titulo,
  descricao,
  conectado,
  onConectar,
  onGerenciar,
  onGerarQR,
  desabilitado = false,
  mensagemDesabilitado = 'Em breve',
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: desabilitado ? 0.5 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': !desabilitado
          ? {
              transform: 'translateY(-4px)',
              boxShadow: 6,
            }
          : {},
      }}
    >
      {/* 🔴 Status Badge (Canto Superior Direito) */}
      {!desabilitado && (
        <Chip
          icon={conectado ? <CheckCircleIcon /> : <CancelIcon />}
          label={conectado ? 'Conectado' : 'Desconectado'}
          color={conectado ? 'success' : 'default'}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontWeight: 600,
          }}
        />
      )}

      {desabilitado && (
        <Chip
          label={mensagemDesabilitado}
          color="warning"
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontWeight: 600,
          }}
        />
      )}

      <CardContent sx={{ flexGrow: 1, pt: 5 }}>
        {/* 🎨 Logo */}
        <Box display="flex" justifyContent="center" mb={2}>
          <Avatar
            src={logo}
            alt={titulo}
            sx={{
              width: 80,
              height: 80,
              border: '2px solid',
              borderColor: conectado ? 'success.main' : 'grey.300',
            }}
          />
        </Box>

        {/* 📝 Título e Descrição */}
        <Typography
          variant="h6"
          component="div"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          {titulo}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ minHeight: 40 }}
        >
          {descricao}
        </Typography>
      </CardContent>

      {/* 🔘 Botões de Ação */}
      <CardActions sx={{ justifyContent: 'center', pb: 2, flexDirection: 'column', gap: 1 }}>
        {!desabilitado && (
          <>
            {!conectado ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LinkIcon />}
                  onClick={onConectar}
                  fullWidth
                  sx={{ mx: 2 }}
                >
                  Salvar Credenciais
                </Button>
                
                {/* ✅ BOTÃO GERAR QR CODE */}
                {onGerarQR && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<QrCodeIcon />}
                    onClick={onGerarQR}
                    fullWidth
                    sx={{ mx: 2 }}
                  >
                    Gerar QR Code
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SettingsIcon />}
                onClick={onGerenciar || onConectar}
                fullWidth
                sx={{ mx: 2 }}
              >
                Gerenciar
              </Button>
            )}
          </>
        )}

        {desabilitado && (
          <Button
            variant="outlined"
            disabled
            fullWidth
            sx={{ mx: 2 }}
          >
            {mensagemDesabilitado}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default CanalCard;
