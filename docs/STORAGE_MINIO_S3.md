# 08 - Storage (MinIO)

## Visao Geral

O MinIO é o backend S3-compatível para storage de arquivos. A interface `storagePut` / `storageGet` permanece identica para o codigo da aplicacao.

## Mudancas Tecnicas

| Aspecto | Producao | Homolog |
|---------|----------|---------|
| Backend | API cloud Proxy | MinIO (S3-compativel) |
| Autenticacao | Bearer token | Access Key / Secret Key |
| Client | fetch + FormData | @aws-sdk/client-s3 |
| URLs | Proxy URL | Presigned URLs |

## Acesso ao Console MinIO

O console web do MinIO esta disponivel em `http://localhost:9001` (apenas acesso local).

```
Usuario: minioadmin (ou MINIO_ROOT_USER do .env)
Senha:   minioadmin (ou MINIO_ROOT_PASSWORD do .env)
```

## Bucket

O bucket `debuga-homolog` e criado automaticamente pelo script `install.sh` com politica de download publico.

## Dependencias Adicionais

O homolog requer dois pacotes npm adicionais no `package.json`:

```json
"@aws-sdk/client-s3": "^3.x",
"@aws-sdk/s3-request-presigner": "^3.x"
```

Estes ja estao incluidos no `package.json` do pacote homolog.

## Troubleshooting

**"S3_ENDPOINT not configured"**: Verifique que `S3_ENDPOINT=http://minio:9000` esta no `.env` ou no `docker-compose.yml`.

**"Access Denied"**: Verifique `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD` no `.env`.

**Upload falha**: Verifique se o bucket existe: `mc ls debuga-minio/debuga-homolog`.
