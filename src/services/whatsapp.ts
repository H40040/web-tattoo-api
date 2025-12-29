import twilio from 'twilio';

// Configurar cliente Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

/**
 * Enviar mensagem WhatsApp
 * @param to - Número de telefone do destinatário (formato: +5511999999999)
 * @param message - Mensagem a ser enviada
 * @returns Promise com o resultado do envio
 */
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    // Validar e formatar número de telefone
    const telefoneFormatado = formatarTelefoneWhatsApp(to);
    
    if (!telefoneFormatado) {
      throw new Error('Número de telefone inválido');
    }

    // Enviar mensagem
    const result = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:${telefoneFormatado}`,
      body: message,
    });

    console.log(`WhatsApp enviado com sucesso: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    throw error;
  }
}

/**
 * Enviar mensagem de boas-vindas para novo tatuador
 * @param nome - Nome do tatuador
 * @param telefone - Telefone do tatuador
 */
export async function sendBoasVindasTatuador(nome: string, telefone: string) {
  const mensagem = `🎉 *Bem-vindo ao Web Tattoo!* 🎨\n\nOlá ${nome},\n\nSeu cadastro foi realizado com sucesso! Você agora tem acesso ao nosso painel administrativo onde pode:\n\n✅ Personalizar seu site\n✅ Adicionar seus projetos\n✅ Gerenciar orçamentos\n✅ Visualizar depoimentos\n\nAcesse: ${process.env.FRONTEND_ADMIN_URL || 'https://admin.webtattoo.com'}\n\nDúvidas? Entre em contato conosco!`;

  return sendWhatsAppMessage(telefone, mensagem);
}

/**
 * Enviar notificação de novo orçamento para o tatuador
 * @param tatuadorNome - Nome do tatuador
 * @param tatuadorTelefone - Telefone do tatuador
 * @param clienteNome - Nome do cliente
 * @param clienteTelefone - Telefone do cliente
 * @param descricao - Descrição do orçamento
 * @param localizacao - Localização da tatuagem
 * @param tamanho - Tamanho da tatuagem
 * @param orcamentoEstimado - Orçamento estimado
 */
export async function sendNovaSolicitacaoOrcamento(
  tatuadorNome: string,
  tatuadorTelefone: string,
  clienteNome: string,
  clienteTelefone: string,
  descricao: string,
  localizacao: string,
  tamanho: string,
  orcamentoEstimado: number
) {
  const mensagem = `🎨 *Nova Solicitação de Orçamento!*\n\nOlá ${tatuadorNome},\n\nVocê recebeu uma nova solicitação de orçamento:\n\n👤 *Cliente:* ${clienteNome}\n📱 *Telefone:* ${clienteTelefone}\n📍 *Localização:* ${localizacao}\n📏 *Tamanho:* ${tamanho}\n💰 *Orçamento Estimado:* R$ ${orcamentoEstimado.toFixed(2)}\n\n📝 *Descrição:*\n${descricao}\n\nAcesse seu painel administrativo para mais detalhes e para responder ao cliente.\n\n${process.env.FRONTEND_ADMIN_URL || 'https://admin.webtattoo.com'}`;

  return sendWhatsAppMessage(tatuadorTelefone, mensagem);
}

/**
 * Enviar confirmação de status do orçamento para o cliente
 * @param clienteNome - Nome do cliente
 * @param clienteTelefone - Telefone do cliente
 * @param estudioNome - Nome do estúdio
 * @param status - Novo status do orçamento
 * @param observacoes - Observações opcionais
 */
export async function sendAtualizacaoStatusOrcamento(
  clienteNome: string,
  clienteTelefone: string,
  estudioNome: string,
  status: 'APROVADO' | 'REJEITADO' | 'EM_ANALISE',
  observacoes?: string
) {
  let mensagem = '';
  
  switch (status) {
    case 'APROVADO':
      mensagem = `✅ *Orçamento Aprovado!*\n\nOlá ${clienteNome},\n\nSeu orçamento foi *APROVADO* pelo estúdio ${estudioNome}! 🎉\n\nEntraremos em contato em breve para agendar sua sessão de tatuagem.\n\n${observacoes ? `📋 *Observações:* ${observacoes}` : ''}\n\nObrigado por escolher nosso trabalho!`;
      break;
      
    case 'REJEITADO':
      mensagem = `❌ *Orçamento Rejeitado*\n\nOlá ${clienteNome},\n\nInfelizmente, o estúdio ${estudioNome} não pode atender sua solicitação no momento.\n\n${observacoes ? `📋 *Motivo:* ${observacoes}` : ''}\n\nAgradecemos seu interesse e esperamos poder atendê-lo em uma próxima oportunidade.`;
      break;
      
    case 'EM_ANALISE':
      mensagem = `⏳ *Orçamento em Análise*\n\nOlá ${clienteNome},\n\nSeu orçamento está sendo analisado pelo estúdio ${estudioNome}.\n\nEntraremos em contato em breve com uma resposta.\n\n${observacoes ? `📋 *Observações:* ${observacoes}` : ''}\n\nAgradecemos sua paciência!`;
      break;
  }

  return sendWhatsAppMessage(clienteTelefone, mensagem);
}

/**
 * Enviar lembrete de renovação de plano
 * @param tatuadorNome - Nome do tatuador
 * @param tatuadorTelefone - Telefone do tatuador
 * @param diasRestantes - Dias restantes para expirar
 * @param planoNome - Nome do plano
 */
export async function sendLembreteRenovacaoPlano(
  tatuadorNome: string,
  tatuadorTelefone: string,
  diasRestantes: number,
  planoNome: string
) {
  const mensagem = `⏰ *Lembrete de Renovação de Plano*\n\nOlá ${tatuadorNome},\n\nSeu plano *${planoNome}* vence em *${diasRestantes} dias*!\n\nPara continuar aproveitando todos os benefícios do Web Tattoo, renove seu plano o quanto antes.\n\n✅ Mantenha seu site ativo\n✅ Continue recebendo orçamentos\n✅ Aproveite todos os recursos\n\nRenove agora: ${process.env.FRONTEND_ADMIN_URL || 'https://admin.webtattoo.com'}/planos\n\nDúvidas? Entre em contato conosco!`;

  return sendWhatsAppMessage(tatuadorTelefone, mensagem);
}

/**
 * Formatar número de telefone para formato WhatsApp
 * @param telefone - Número de telefone (pode estar em vários formatos)
 * @returns Número formatado ou null se inválido
 */
function formatarTelefoneWhatsApp(telefone: string): string | null {
  // Remover todos os caracteres não numéricos
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Verificar se é um número válido (mínimo 10 dígitos)
  if (numeroLimpo.length < 10) {
    return null;
  }
  
  // Adicionar código do país se não existir
  if (numeroLimpo.length === 10 || numeroLimpo.length === 11) {
    // Assume que é um número brasileiro
    return `+55${numeroLimpo}`;
  }
  
  // Se já tiver código de país, retornar como está
  if (numeroLimpo.startsWith('55') && numeroLimpo.length >= 12) {
    return `+${numeroLimpo}`;
  }
  
  // Para outros países, adicionar + se não existir
  if (!numeroLimpo.startsWith('+')) {
    return `+${numeroLimpo}`;
  }
  
  return numeroLimpo;
}

/**
 * Enviar mensagem de boas-vindas para novo cliente (após orçamento)
 * @param clienteNome - Nome do cliente
 * @param clienteTelefone - Telefone do cliente
 * @param estudioNome - Nome do estúdio
 */
export async function sendBoasVindasCliente(
  clienteNome: string,
  clienteTelefone: string,
  estudioNome: string
) {
  const mensagem = `🎨 *Obrigado pelo seu interesse!*\n\nOlá ${clienteNome},\n\nRecebemos sua solicitação de orçamento para o estúdio ${estudioNome}.\n\n✅ Estamos analisando sua solicitação\n✅ Entraremos em contato em breve\n✅ Você receberá uma resposta via WhatsApp\n\nEnquanto isso, confira nosso portfólio e conheça mais sobre nosso trabalho.\n\nAguardamos ansiosamente para criar algo incrível juntos! 🚀`;

  return sendWhatsAppMessage(clienteTelefone, mensagem);
}
