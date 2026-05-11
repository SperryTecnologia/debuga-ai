/**
 * Stripe Products & Pricing Configuration
 * Plans optimized for the Brazilian market (BRL).
 * Prices are created dynamically via Stripe API on first checkout.
 */

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: {
    messagesPerDay: number;
    conversationsPerMonth: number;
    maxTokensPerMessage: number;
  };
  stripe: {
    priceMonthly: number; // in cents (BRL)
    priceYearly: number;  // in cents (BRL)
    currency: string;
  };
  popular?: boolean;
  isFree?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Conheça o debuga.ai sem compromisso",
    features: [
      "5 mensagens por dia",
      "3 conversas por mês",
      "Chat com IA especialista em TI",
      "Respostas com IA generativa",
    ],
    limits: {
      messagesPerDay: 5,
      conversationsPerMonth: 3,
      maxTokensPerMessage: 2048,
    },
    stripe: {
      priceMonthly: 0,
      priceYearly: 0,
      currency: "brl",
    },
    isFree: true,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Para profissionais de TI que usam IA no dia a dia",
    features: [
      "100 mensagens por dia",
      "30 conversas por mês",
      "Ferramentas: DNS, SSL, HTTP, WHOIS",
      "Navegação autônoma em sites",
      "Geração de scripts (sem execução)",
      "Suporte por email",
    ],
    limits: {
      messagesPerDay: 100,
      conversationsPerMonth: 30,
      maxTokensPerMessage: 4096,
    },
    stripe: {
      priceMonthly: 4990, // R$49,90
      priceYearly: 47900, // R$479,00/ano (~R$39,92/mês — 2 meses grátis)
      currency: "brl",
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para equipes de TI que precisam de poder total",
    features: [
      "Mensagens ilimitadas",
      "Conversas ilimitadas",
      "Todas as ferramentas (port scan, execução de código)",
      "Geração de imagens e diagramas",
      "Histórico completo",
      "Suporte prioritário via chat",
      "Integrações sob configuração (em breve)",
    ],
    limits: {
      messagesPerDay: 999999,
      conversationsPerMonth: 999999,
      maxTokensPerMessage: 32768,
    },
    stripe: {
      priceMonthly: 14990, // R$149,90
      priceYearly: 143900, // R$1.439,00/ano (~R$119,92/mês — 2 meses grátis)
      currency: "brl",
    },
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para empresas com necessidades avançadas de TI e compliance",
    features: [
      "Tudo do Pro incluído",
      "Implantação sob projeto",
      "Integrações customizadas (Zabbix, Wazuh, etc.)",
      "SSO / SAML / LDAP (sob projeto)",
      "Gerente de conta dedicado",
      "Treinamento da equipe",
      "SLA personalizado",
    ],
    limits: {
      messagesPerDay: 999999,
      conversationsPerMonth: 999999,
      maxTokensPerMessage: 65536,
    },
    stripe: {
      priceMonthly: 49990, // R$499,90
      priceYearly: 479900, // R$4.799,00/ano (~R$399,92/mês)
      currency: "brl",
    },
  },
];

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getPlanByPriceId(stripePriceId: string): Plan | undefined {
  // This will be matched after Stripe prices are created
  return undefined;
}
