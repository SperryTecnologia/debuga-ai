# Debug Notes

## Bug: currentPeriodEnd timestamp inválido
- Erro: `Incorrect timestamp value: '1970-01-01 00:00:00.000'`
- Causa: `sub.current_period_end` retorna `0` quando a API Stripe v2025 usa campo diferente
- Stripe API v2025-04-30.basil pode usar `sub.current_period_end` como Unix timestamp em segundos
- Se retorna 0, `new Date(0 * 1000)` = 1970-01-01 que é inválido para MySQL TIMESTAMP
- Fix: usar fallback para Date.now() + 30 dias quando current_period_end é 0 ou undefined
