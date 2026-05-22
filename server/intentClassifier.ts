/**
 * Intent Classifier for debuga.ai — Multimodal Orchestrator
 *
 * Classifies user messages into capability-based task types to enable
 * intelligent provider routing. Uses lightweight heuristic analysis
 * first, with optional LLM-based classification for ambiguous cases.
 *
 * Task Types (13):
 *   1.  chat_text              — General conversation, Q&A, creative writing
 *   2.  infrastructure_support — IT infrastructure, networking, sysadmin help
 *   3.  code_generation        — Code writing, debugging, refactoring
 *   4.  image_generation       — Create images from text descriptions
 *   5.  image_editing          — Edit/modify existing images
 *   6.  video_generation       — Create videos from text/image descriptions
 *   7.  network_diagram        — Network topology diagrams
 *   8.  architecture_diagram   — Software/cloud architecture diagrams
 *   9.  flowchart_diagram      — Process flowcharts, sequence diagrams
 *   10. document_analysis      — Analyze PDFs, docs, spreadsheets
 *   11. image_analysis         — Analyze/describe uploaded images
 *   12. audio_transcription    — Transcribe audio/video to text
 *   13. web_research           — Questions requiring real-time web search
 */

export type TaskType =
  | "chat_text"
  | "infrastructure_support"
  | "code_generation"
  | "image_generation"
  | "image_editing"
  | "video_generation"
  | "network_diagram"
  | "architecture_diagram"
  | "flowchart_diagram"
  | "document_analysis"
  | "image_analysis"
  | "audio_transcription"
  | "web_research";

export type IntentResult = {
  taskType: TaskType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  requiresVision: boolean;
  requiresTools: boolean;
  requiresAsync: boolean; // video/long jobs
  estimatedComplexity: "low" | "medium" | "high";
  suggestedMaxTokens: number;
};

// ══════════════════════════════════════════════════════════════
// Heuristic Patterns
// ══════════════════════════════════════════════════════════════

const IMAGE_GEN_PATTERNS = [
  /\b(gere|gerar|crie|criar|desenh[ae]|fa[çz]a|produz[ai]|monte)\b.*(imagem|foto|ilustra[çc][aã]o|arte|banner|logo|ícone|avatar|poster|thumbnail|wallpaper|capa)/i,
  /\b(image[mn]|foto|ilustra[çc][aã]o)\b.*(de|do|da|com|sobre|mostrando)/i,
  /\b(generate|create|draw|make|produce|render)\b.*(image|photo|illustration|art|picture|icon|logo|banner|poster)/i,
  /\bdall[-·]?e\b/i,
  /\bmidjourney\b/i,
  /\bstable diffusion\b/i,
  /\bgpt[-]?image\b/i,
  /\b(crie|gere|fa[çz]a)\b.*\b(uma|um)\b.*(imagem|foto|arte|ilustra)/i,
];

const IMAGE_EDIT_PATTERNS = [
  /\b(edite|editar|modifique|modificar|altere|alterar|ajuste|ajustar)\b.*(imagem|foto|image|picture)/i,
  /\b(remova|remover|apague|apagar|tire|tirar)\b.*(fundo|background|objeto|element|texto|text)\b.*(imagem|foto|image)/i,
  /\b(troque|trocar|substitua|substituir|mude|mudar)\b.*(cor|color|fundo|background)\b.*(imagem|foto|image)/i,
  /\b(redimensione|resize|crop|corte|recorte|upscale)\b.*(imagem|foto|image)/i,
  /\b(inpainting|outpainting|img2img|image.?to.?image)\b/i,
  /\b(edit|modify|change|alter|remove|replace)\b.*(in|from|of)\b.*(image|photo|picture)/i,
];

const VIDEO_GEN_PATTERNS = [
  /\b(gere|gerar|crie|criar|fa[çz]a|produz[ai]|monte)\b.*(vídeo|video|animação|animation|clip|curta|short)/i,
  /\b(vídeo|video|animação|animation)\b.*(de|do|da|com|sobre|mostrando)/i,
  /\b(generate|create|make|produce|render)\b.*(video|animation|clip|short|film)/i,
  /\bveo\b/i,
  /\brunway\b/i,
  /\bsora\b/i,
  /\breplicate\b.*\b(video|vídeo)\b/i,
  /\b(text.?to.?video|t2v|video.?generation)\b/i,
];

const NETWORK_DIAGRAM_PATTERNS = [
  /\b(diagrama|diagram)\b.*(rede|network|topologia|topology)/i,
  /\b(rede|network)\b.*(diagrama|diagram|mapa|map|topologia|topology|desenh)/i,
  /\b(gere|crie|fa[çz]a|desenhe|monte)\b.*(diagrama|diagram|mapa|map)\b.*(rede|network)/i,
  /\b(pfsense|opnsense|mikrotik|ubiquiti|unifi|cisco|juniper|fortinet|fortigate)\b.*(diagrama|diagram|topologia|topology|rede|network)/i,
  /\b(vlan|switch|router|roteador|firewall|gateway|dmz|wan|lan|vpn|sd-?wan)\b.*(diagrama|diagram|topologia|topology)/i,
  /\b(diagrama|diagram)\b.*(vlan|switch|router|roteador|firewall|gateway|dmz)/i,
  /\b(network.?diagram|network.?topology|network.?map)\b/i,
  /\b(topologia|topology)\b.*(estrela|star|mesh|anel|ring|barramento|bus|árvore|tree)/i,
];

const ARCHITECTURE_DIAGRAM_PATTERNS = [
  /\b(diagrama|diagram)\b.*(arquitetura|architecture|sistema|system|cloud|nuvem|infra|microservi[çc]o|microservice)/i,
  /\b(arquitetura|architecture)\b.*(diagrama|diagram|desenh|visual)/i,
  /\b(gere|crie|fa[çz]a|desenhe|monte)\b.*(diagrama|diagram)\b.*(arquitetura|architecture|sistema|system|cloud)/i,
  /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|serverless|lambda)\b.*(diagrama|diagram|arquitetura|architecture)/i,
  /\b(diagrama|diagram)\b.*(aws|azure|gcp|docker|kubernetes|k8s|microservi)/i,
  /\b(system.?design|architecture.?diagram|cloud.?architecture|infra.?diagram)\b/i,
  /\b(c4.?model|c4.?diagram|deployment.?diagram|component.?diagram)\b/i,
];

const FLOWCHART_DIAGRAM_PATTERNS = [
  /\b(fluxograma|flowchart|fluxo|flow)\b.*(de|do|da|para|process|processo)/i,
  /\b(diagrama|diagram)\b.*(fluxo|flow|processo|process|sequência|sequence|estado|state|atividade|activity)/i,
  /\b(gere|crie|fa[çz]a|desenhe|monte)\b.*(fluxograma|flowchart|fluxo|flow|diagrama de sequência|sequence diagram)/i,
  /\b(sequence.?diagram|state.?diagram|activity.?diagram|class.?diagram|er.?diagram|entity.?relationship)\b/i,
  /\b(bpmn|uml|gantt)\b/i,
  /\b(processo|process|workflow|pipeline)\b.*(diagrama|diagram|visual|fluxo|flow)/i,
];

const IMAGE_ANALYSIS_PATTERNS = [
  /\[Imagem anexada:/i,
  /\banalise?\b.*(imagem|foto|screenshot|print|captura|image)/i,
  /\b(descreva|identifique|reconhe[çc]a|leia|extraia)\b.*(imagem|foto|screenshot|image)/i,
  /\b(o que|quem|qual|onde)\b.*(nesta|nessa|na|dessa)\b.*(imagem|foto|image)/i,
  /\b(analyze|describe|identify|read|extract|ocr)\b.*(image|photo|screenshot|picture)/i,
  /\b(o que .*(vê|vejo|mostra)|what.*(see|shows|is this))\b.*(imagem|foto|image|picture)?/i,
];

const DOCUMENT_ANALYSIS_PATTERNS = [
  /\b(analise|analisar|leia|ler|extraia|extrair|resuma|resumir|interprete|interpretar)\b.*(documento|doc|pdf|planilha|spreadsheet|excel|csv|arquivo|file|relatório|report)/i,
  /\b(documento|doc|pdf|planilha|spreadsheet|excel|csv|arquivo|file)\b.*(analise|analyze|leia|read|extraia|extract|resuma|summarize)/i,
  /\b(analyze|read|extract|summarize|interpret|parse)\b.*(document|doc|pdf|spreadsheet|excel|csv|file|report)/i,
  /\[Documento anexado:/i,
  /\[Arquivo anexado:/i,
  /\b(ocr|text.?extraction|data.?extraction)\b.*(documento|document|pdf|file)/i,
];

const AUDIO_TRANSCRIPTION_PATTERNS = [
  /\b(transcreva|transcrever|transcrição|transcri[çc][aã]o)\b.*(áudio|audio|vídeo|video|gravação|recording|podcast|reunião|meeting)/i,
  /\b(áudio|audio|gravação|recording|podcast)\b.*(transcreva|transcrever|transcrição|texto|text)/i,
  /\b(transcribe|transcription)\b.*(audio|video|recording|podcast|meeting)/i,
  /\b(speech.?to.?text|stt|whisper)\b/i,
  /\[Áudio anexado:/i,
  /\[Audio anexado:/i,
  /\b(converta|converter|transforme|transformar)\b.*(áudio|audio|voz|voice|fala|speech)\b.*(texto|text)/i,
];

const CODE_GEN_PATTERNS = [
  /\b(escreva|crie|gere|fa[çz]a|implemente|desenvolva|code|programe)\b.*(código|script|função|classe|componente|api|endpoint|rota|query|sql|programa|aplicação)/i,
  /\b(write|create|generate|implement|build|develop|code)\b.*(code|script|function|class|component|api|endpoint|route|query|program|application)/i,
  /\b(python|javascript|typescript|java|c\+\+|rust|go|ruby|php|swift|kotlin|sql|html|css|react|vue|angular|node|express|django|flask|fastapi|laravel|spring)\b.*\b(código|code|script|função|function|implementa|implement|crie|create)/i,
  /```\w+\n/,
  /\b(refatore|refactor|otimize|optimize|debug|depure|corrija|fix)\b.*(código|code|função|function|bug|erro|error)/i,
  /\b(code review|security audit|vulnerability|bug|erro|error)\b.*(neste|nesse|no|nesta|nessa|na)\b/i,
  /\b(explique|explain)\b.*(código|code|script|função|function|algoritmo|algorithm)/i,
];

const INFRASTRUCTURE_PATTERNS = [
  /\b(configure|configurar|instale|instalar|deploy|implante|provisione|provisionar)\b.*(servidor|server|vm|container|docker|kubernetes|k8s|nginx|apache|haproxy)/i,
  /\b(servidor|server|vm|vps|cloud|nuvem|infra)\b.*(configure|configurar|instale|instalar|deploy|problema|error|erro|caiu|down|lento|slow)/i,
  /\b(dns|ssl|tls|certificado|certificate|domínio|domain|https|http|porta|port|firewall|iptables|nftables|ufw)\b.*(configure|configurar|problema|error|erro|não funciona|doesn't work|como|how)/i,
  /\b(linux|ubuntu|debian|centos|rhel|windows server|active directory|ad|ldap|samba)\b.*(configure|configurar|instale|instalar|problema|error|erro|como|how)/i,
  /\b(zabbix|grafana|prometheus|nagios|datadog|new relic|monitoramento|monitoring|observabilidade|observability)\b/i,
  /\b(backup|restore|disaster recovery|dr|alta disponibilidade|high availability|ha|load balancer|lb|cluster)\b/i,
  /\b(ansible|terraform|puppet|chef|saltstack|iac|infrastructure as code)\b/i,
  /\b(pfsense|opnsense|mikrotik|ubiquiti|unifi|cisco|juniper|fortinet|fortigate|sophos)\b.*(configure|configurar|problema|error|regra|rule|nat|vpn)/i,
  /\b(vlan|switch|router|roteador|access point|ap|wifi|wi-fi|dhcp|dns|bind|pihole)\b.*(configure|configurar|problema|error|não funciona)/i,
  /\b(wazuh|ossec|ids|ips|siem|soc|pentest|vulnerabilidade|vulnerability|hardening|cis benchmark)\b/i,
  /\b(vmware|proxmox|hyper-v|virtualização|virtualization|esxi|vcenter)\b/i,
  /\b(port.?scan|nmap|netstat|traceroute|ping|dig|nslookup|whois|tcpdump|wireshark)\b/i,
];

const WEB_RESEARCH_PATTERNS = [
  /\b(hoje|agora|atual|recente|último|última|2024|2025|2026)\b.*(notícia|news|preço|price|cotação|valor|resultado|score)/i,
  /\b(today|now|current|recent|latest|2024|2025|2026)\b.*(news|price|value|result|score|update)/i,
  /\b(pesquise|busque|procure|search|find|look up)\b.*(internet|web|online|google)/i,
  /\b(qual|what|quem|who|quando|when|onde|where)\b.*(é o|is the)\b.*(atual|current|novo|new|último|latest)/i,
  /\b(clima|weather|previsão|forecast|temperatura|temperature)\b/i,
  /\b(dólar|euro|bitcoin|btc|eth|ação|stock|ibovespa|nasdaq|s&p)\b.*\b(hoje|agora|cotação|preço|valor|price)/i,
  /\b(CVE-\d{4}|zero.?day|patch tuesday|security advisory)\b/i,
];

// ══════════════════════════════════════════════════════════════
// Classification Engine
// ══════════════════════════════════════════════════════════════

function matchPatterns(text: string, patterns: RegExp[]): number {
  let matches = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++;
  }
  return matches;
}

function hasImageAttachment(text: string): boolean {
  return /\[Imagem anexada:/.test(text) || /image_url/.test(text);
}

function hasDocumentAttachment(text: string): boolean {
  return /\[Documento anexado:|\[Arquivo anexado:/.test(text);
}

function hasAudioAttachment(text: string): boolean {
  return /\[Áudio anexado:|\[Audio anexado:/.test(text);
}

function estimateComplexity(text: string): "low" | "medium" | "high" {
  const wordCount = text.split(/\s+/).length;
  const hasCode = /```/.test(text);
  const hasMultipleQuestions = (text.match(/\?/g) || []).length > 2;
  const hasListRequirements = /\b(\d+\.|[-•])\s/.test(text);

  if (wordCount > 200 || (hasCode && wordCount > 100) || hasMultipleQuestions) return "high";
  if (wordCount > 50 || hasCode || hasListRequirements) return "medium";
  return "low";
}

function suggestMaxTokens(taskType: TaskType, complexity: "low" | "medium" | "high"): number {
  const baseTokens: Record<TaskType, number> = {
    chat_text: 2048,
    infrastructure_support: 4096,
    code_generation: 4096,
    image_generation: 512,
    image_editing: 512,
    video_generation: 512,
    network_diagram: 3072,
    architecture_diagram: 3072,
    flowchart_diagram: 3072,
    document_analysis: 4096,
    image_analysis: 2048,
    audio_transcription: 1024,
    web_research: 2048,
  };

  const multiplier = complexity === "high" ? 2 : complexity === "medium" ? 1.5 : 1;
  return Math.min(Math.ceil(baseTokens[taskType] * multiplier), 16384);
}

/**
 * Classify user intent using heuristic pattern matching.
 * Fast, deterministic, no API calls needed.
 */
export function classifyIntent(userMessage: string, conversationHistory?: Array<{ role: string; content: string }>): IntentResult {
  const text = userMessage;
  const hasImage = hasImageAttachment(text);
  const hasDocument = hasDocumentAttachment(text);
  const hasAudio = hasAudioAttachment(text);

  // Score each task type
  const scores: Record<TaskType, number> = {
    chat_text: 0,
    infrastructure_support: 0,
    code_generation: 0,
    image_generation: 0,
    image_editing: 0,
    video_generation: 0,
    network_diagram: 0,
    architecture_diagram: 0,
    flowchart_diagram: 0,
    document_analysis: 0,
    image_analysis: 0,
    audio_transcription: 0,
    web_research: 0,
  };

  // Pattern matching with weights
  scores.image_generation = matchPatterns(text, IMAGE_GEN_PATTERNS) * 3;
  scores.image_editing = matchPatterns(text, IMAGE_EDIT_PATTERNS) * 3;
  scores.video_generation = matchPatterns(text, VIDEO_GEN_PATTERNS) * 3.5; // higher weight — very specific
  scores.network_diagram = matchPatterns(text, NETWORK_DIAGRAM_PATTERNS) * 3;
  scores.architecture_diagram = matchPatterns(text, ARCHITECTURE_DIAGRAM_PATTERNS) * 3;
  scores.flowchart_diagram = matchPatterns(text, FLOWCHART_DIAGRAM_PATTERNS) * 3;
  scores.image_analysis = matchPatterns(text, IMAGE_ANALYSIS_PATTERNS) * 3;
  scores.document_analysis = matchPatterns(text, DOCUMENT_ANALYSIS_PATTERNS) * 3;
  scores.audio_transcription = matchPatterns(text, AUDIO_TRANSCRIPTION_PATTERNS) * 3.5;
  scores.code_generation = matchPatterns(text, CODE_GEN_PATTERNS) * 2.5;
  scores.infrastructure_support = matchPatterns(text, INFRASTRUCTURE_PATTERNS) * 2.5;
  scores.web_research = matchPatterns(text, WEB_RESEARCH_PATTERNS) * 2.5;

  // Attachment-based boosts
  if (hasImage) {
    scores.image_analysis += 5;
    // If image is attached but user asks to edit it
    if (matchPatterns(text, IMAGE_EDIT_PATTERNS) > 0) {
      scores.image_editing += 4;
      scores.image_analysis -= 2;
    }
    // Reduce image gen score if image is attached (user probably wants analysis)
    scores.image_generation = Math.max(0, scores.image_generation - 3);
  }

  if (hasDocument) {
    scores.document_analysis += 5;
  }

  if (hasAudio) {
    scores.audio_transcription += 6;
  }

  // Context from conversation history (if available)
  if (conversationHistory && conversationHistory.length > 0) {
    const lastAssistant = conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-1)[0];
    if (lastAssistant) {
      // If last response had code, boost code-related intents
      if (/```/.test(lastAssistant.content)) {
        scores.code_generation += 1;
      }
      // If last response had mermaid/diagram, boost diagram intents
      if (/```mermaid/.test(lastAssistant.content)) {
        scores.network_diagram += 1;
        scores.architecture_diagram += 1;
        scores.flowchart_diagram += 1;
      }
    }
  }

  // Find highest scoring task type
  let bestType: TaskType = "chat_text";
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as TaskType;
    }
  }

  // If no strong signal, default to chat_text
  if (bestScore === 0) {
    bestType = "chat_text";
  }

  // Calculate confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(bestScore / totalScore, 0.99) : 0.5;

  // Determine requirements
  const requiresVision = hasImage || bestType === "image_analysis";
  const requiresTools = bestType === "web_research" || bestType === "document_analysis";
  const requiresAsync = bestType === "video_generation"; // video can take minutes

  const complexity = estimateComplexity(text);
  const suggestedTokens = suggestMaxTokens(bestType, complexity);

  return {
    taskType: bestType,
    confidence,
    reasoning: `Matched ${bestType} with score ${bestScore.toFixed(1)} (confidence: ${(confidence * 100).toFixed(0)}%)`,
    requiresVision,
    requiresTools,
    requiresAsync,
    estimatedComplexity: complexity,
    suggestedMaxTokens: suggestedTokens,
  };
}

/**
 * Get the system prompt enhancement based on task type.
 * This is appended to the base system prompt to improve response quality.
 */
export function getTaskTypePromptEnhancement(taskType: TaskType): string {
  const enhancements: Record<TaskType, string> = {
    chat_text: "",
    infrastructure_support: "\n\nVocê é um especialista em infraestrutura de TI. Forneça soluções práticas, comandos específicos, e considere segurança e boas práticas. Quando relevante, sugira automação e monitoramento.",
    code_generation: "\n\nAo gerar código: use boas práticas, inclua comentários explicativos, trate erros, e forneça exemplos de uso quando relevante. Considere segurança, performance e manutenibilidade.",
    image_generation: "\n\nO usuário deseja gerar uma imagem. Crie um prompt detalhado e descritivo para o modelo de geração de imagem. Inclua estilo, composição, iluminação e detalhes visuais relevantes.",
    image_editing: "\n\nO usuário deseja editar uma imagem existente. Identifique as modificações solicitadas e aplique-as de forma precisa.",
    video_generation: "\n\nO usuário deseja gerar um vídeo. Crie uma descrição detalhada da cena, movimento, duração e estilo visual desejado. O vídeo será gerado de forma assíncrona.",
    network_diagram: "\n\nGere um diagrama de rede profissional usando sintaxe Mermaid. Inclua todos os componentes mencionados (switches, routers, firewalls, VLANs, servidores, etc.) com conexões claras e labels descritivos. Use subgraphs para segmentar zonas de rede.",
    architecture_diagram: "\n\nGere um diagrama de arquitetura profissional usando sintaxe Mermaid. Mostre componentes, serviços, bancos de dados, filas, e conexões com labels claros. Use subgraphs para agrupar camadas (frontend, backend, data, infra).",
    flowchart_diagram: "\n\nGere um diagrama de fluxo/processo profissional usando sintaxe Mermaid. Use nós com formas apropriadas (decisões como losangos, processos como retângulos, início/fim como elipses). Inclua condições e caminhos alternativos.",
    document_analysis: "\n\nAnalise o documento fornecido com atenção aos detalhes. Extraia informações-chave, resuma o conteúdo, identifique pontos importantes, e responda às perguntas do usuário sobre o documento.",
    image_analysis: "\n\nAnalise a imagem fornecida com atenção aos detalhes. Descreva o conteúdo, identifique elementos relevantes, e responda às perguntas do usuário sobre a imagem.",
    audio_transcription: "\n\nO usuário deseja transcrever um áudio. Processe o arquivo de áudio e forneça a transcrição completa com timestamps quando possível.",
    web_research: "\n\nEsta pergunta pode requerer informações atualizadas. Use as ferramentas de busca disponíveis para obter dados recentes e cite as fontes.",
  };

  return enhancements[taskType];
}

/**
 * Get capability requirements for a task type.
 * Used by the capability router to select the best provider.
 */
export function getCapabilityRequirements(taskType: TaskType): {
  needsVision: boolean;
  needsToolUse: boolean;
  needsLargeContext: boolean;
  needsImageGen: boolean;
  needsVideoGen: boolean;
  needsDiagram: boolean;
  preferredStrength: "speed" | "quality" | "cost";
} {
  const requirements: Record<TaskType, ReturnType<typeof getCapabilityRequirements>> = {
    chat_text: { needsVision: false, needsToolUse: false, needsLargeContext: false, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "speed" },
    infrastructure_support: { needsVision: false, needsToolUse: true, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    code_generation: { needsVision: false, needsToolUse: false, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    image_generation: { needsVision: false, needsToolUse: false, needsLargeContext: false, needsImageGen: true, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    image_editing: { needsVision: true, needsToolUse: false, needsLargeContext: false, needsImageGen: true, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    video_generation: { needsVision: false, needsToolUse: false, needsLargeContext: false, needsImageGen: false, needsVideoGen: true, needsDiagram: false, preferredStrength: "quality" },
    network_diagram: { needsVision: false, needsToolUse: false, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: true, preferredStrength: "quality" },
    architecture_diagram: { needsVision: false, needsToolUse: false, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: true, preferredStrength: "quality" },
    flowchart_diagram: { needsVision: false, needsToolUse: false, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: true, preferredStrength: "quality" },
    document_analysis: { needsVision: true, needsToolUse: true, needsLargeContext: true, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    image_analysis: { needsVision: true, needsToolUse: false, needsLargeContext: false, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "quality" },
    audio_transcription: { needsVision: false, needsToolUse: true, needsLargeContext: false, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "speed" },
    web_research: { needsVision: false, needsToolUse: true, needsLargeContext: false, needsImageGen: false, needsVideoGen: false, needsDiagram: false, preferredStrength: "speed" },
  };

  return requirements[taskType];
}

/**
 * Map from old TaskType names to new ones (backward compatibility).
 */
export function normalizeTaskType(taskType: string): TaskType {
  const mapping: Record<string, TaskType> = {
    text_generation: "chat_text",
    code_analysis: "code_generation",
    data_analysis: "document_analysis",
    reasoning: "chat_text",
    search_web: "web_research",
  };
  return (mapping[taskType] || taskType) as TaskType;
}
