# White Label — debuga.ai

**Modelo de implantação white label da plataforma debuga.ai.**

---

## Conceito

A debuga.ai é projetada para operar como produto white label. O operador (MSP, ISP, consultoria) implanta a plataforma em sua própria infraestrutura, com sua marca, domínio e identidade visual. Usuários finais interagem com o produto do operador, sem conhecimento da tecnologia subjacente.

---

## O que é Personalizável

| Aspecto | Personalização |
|---------|---------------|
| Nome do produto | Definido pelo operador |
| Logo | Upload via painel administrativo |
| Cores e tema | Variáveis de configuração |
| Domínio | Domínio próprio do operador |
| Landing page | Conteúdo e CTAs customizáveis |
| Email transacional | Remetente e templates do operador |
| Planos e preços | Definidos pelo operador no Stripe |
| Canais de suporte | WhatsApp, email, chat do operador |
| Idioma | Português, inglês (extensível) |

---

## Modelo de Implantação

| Modalidade | Descrição | Infraestrutura |
|-----------|-----------|----------------|
| Dedicada | Servidor exclusivo do operador | Operador gerencia |
| Gerenciada | Sperry opera para o cliente | Sperry gerencia |
| Híbrida | Infraestrutura do operador, suporte Sperry | Compartilhado |

---

## Controle do Operador

O operador tem controle total sobre:

- Funcionalidades habilitadas por plano
- Limites de uso (mensagens, tokens, uploads)
- Providers de IA disponíveis
- Políticas de retenção de dados
- Configurações de segurança
- Integrações com sistemas internos
- Billing e ciclo de vida de assinaturas

---

## Isolamento de Dados

Cada implantação opera de forma isolada:

- Banco de dados dedicado
- Storage dedicado
- Sem compartilhamento entre operadores
- Dados nunca saem da infraestrutura do operador
- Backups sob controle do operador

---

## Requisitos para Implantação

| Requisito | Mínimo |
|-----------|--------|
| Servidor | 4 cores, 16 GB RAM, 100 GB SSD |
| GPU (opcional) | NVIDIA 8+ GB VRAM |
| Domínio | DNS configurável |
| SSL | Let's Encrypt (automático) |
| Stripe | Conta para billing |
| Email | SMTP para transacionais |

---

*Sperry Tecnologia*
