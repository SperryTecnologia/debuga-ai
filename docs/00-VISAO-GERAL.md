# 00 - Visao Geral do Ambiente

## Objetivo

O ambiente **seu-dominio.com.br** e um laboratorio de ambiente isolado para validação. Ele permite testar novas funcionalidades, validar integracoes e experimentar com inferencia local de LLM sem risco para os usuarios finais.

## Arquitetura

O ambiente e composto por 6 servicos Docker orquestrados via Docker Compose:

| Servico | Imagem | Porta Local | Funcao |
|---------|--------|-------------|--------|
| **app** | Build local (Node 22) | 3000 | Aplicacao debuga.ai (Express + React) |
| **postgres** | postgres:16-alpine | 5432 | Banco de dados PostgreSQL |
| **minio** | minio/minio:latest | 9000/9001 | Storage S3-compativel |
| **ollama** | ollama/ollama:latest | 11434 | Inferencia LLM local (GPU/CPU) |
| **nginx** | nginx:alpine | 80/443 | Reverse proxy + TLS |
| **backup** | postgres:16-alpine | - | Container auxiliar para backups |

## Diferencas em Relacao a Producao

| Aspecto | Producao (debuga.ai) | Homologação (seu-dominio.com.br) |
|---------|---------------------|----------------------------|
| **Autenticacao** | OAuth legado | Google OAuth |
| **Banco de dados** | PostgreSQL 16 | PostgreSQL 16 local |
| **Storage** | S3 local (MinIO) | MinIO local |
| **LLM** | API cloud (API cloud) | Ollama local + fallback cloud |
| **Hosting** | Plataforma de deploy | Docker Compose + VPS |
| **TLS** | Let's Encrypt | Let's Encrypt (certbot) |
| **Stripe** | Live keys | Test keys |

## Principio de Isolamento

Nenhum dado de producao e compartilhado com o homolog. O banco de dados e criado do zero, o storage e independente, e as chaves de API sao separadas. O unico ponto de contato possivel e o Stripe (test mode vs live mode), que sao ambientes completamente isolados pelo proprio Stripe.

## Requisitos de Hardware

| Componente | Minimo | Recomendado |
|-----------|--------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Disco** | 40 GB SSD | 80 GB NVMe |
| **GPU** | - | NVIDIA RTX 3070 8GB |
| **Rede** | 10 Mbps | 100 Mbps |

A GPU e opcional. Sem GPU, o Ollama roda em CPU com performance significativamente menor (5-10x mais lento).
