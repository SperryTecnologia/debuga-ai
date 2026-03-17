/**
 * Stripe Products & Pricing Configuration
 * Plans are created dynamically via Stripe API on first use.
 * Prices are NOT displayed on the website per business policy.
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
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Para profissionais de TI que querem começar a usar IA no dia a dia",
    features: [
      "50 mensagens por dia",
      "10 conversas por mês",
      "Análise de segurança básica",
      "Scripts de automação",
      "Suporte por email",
    ],
    limits: {
      messagesPerDay: 50,
      conversationsPerMonth: 10,
      maxTokensPerMessage: 4096,
    },
    stripe: {
      priceMonthly: 4990, // R$49,90
      priceYearly: 47900, // R$479,00 (2 meses grátis)
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
      "Análise avançada de segurança",
      "Integração com Zabbix, Wazuh, Prometheus",
      "Geração de relatórios",
      "Suporte prioritário",
    ],
    limits: {
      messagesPerDay: 999999,
      conversationsPerMonth: 999999,
      maxTokensPerMessage: 32768,
    },
    stripe: {
      priceMonthly: 14990, // R$149,90
      priceYearly: 143900, // R$1.439,00 (2 meses grátis)
      currency: "brl",
    },
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para empresas que precisam de controle total e personalização",
    features: [
      "Tudo do Pro",
      "API dedicada",
      "Sandbox Docker para execução de scripts",
      "Integração com NetBox e CMDB",
      "SSO / SAML",
      "SLA garantido",
      "Gerente de conta dedicado",
    ],
    limits: {
      messagesPerDay: 999999,
      conversationsPerMonth: 999999,
      maxTokensPerMessage: 65536,
    },
    stripe: {
      priceMonthly: 49990, // R$499,90
      priceYearly: 479900, // R$4.799,00
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
