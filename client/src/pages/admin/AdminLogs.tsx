import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AdminLogs() {
  const [filter, setFilter] = useState<{ success?: boolean }>({});
  const { data, isLoading, isError, error, refetch } = trpc.admin.listProviderLogs.useQuery(
    { limit: 100, ...filter },
    { retry: 1, refetchOnWindowFocus: false }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Histórico de chamadas ao provedor de LLM ({data?.total ?? 0} registros)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter.success === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter({})}
          >
            Todos
          </Button>
          <Button
            variant={filter.success === true ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter({ success: true })}
          >
            Sucesso
          </Button>
          <Button
            variant={filter.success === false ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFilter({ success: false })}
          >
            Erros
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Erro ao carregar logs</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error?.message || "Verifique a conexão com o banco de dados e se as migrations foram aplicadas."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Routing</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-destructive">
                      Falha ao carregar dados. Verifique o console para detalhes.
                    </TableCell>
                  </TableRow>
                ) : !data?.logs?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum log registrado ainda</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Os logs aparecem após a primeira conversa com a IA
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log: any) => (
                    <TableRow key={log.id} className={!log.success ? "bg-destructive/5" : undefined}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.model}</TableCell>
                      <TableCell>
                        {log.taskType ? (
                          <Badge variant="secondary" className="text-xs">
                            {log.taskType}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {log.tokenCount?.toLocaleString("pt-BR") ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {log.responseTimeMs ? `${(log.responseTimeMs / 1000).toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.success ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {log.success ? "OK" : "Erro"}
                        </Badge>
                        {log.fallbackUsed && (
                          <Badge variant="outline" className="text-xs ml-1 border-yellow-500 text-yellow-600">
                            Fallback
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.routingReason ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block" title={log.routingReason}>
                            {log.routingReason.slice(0, 40)}{log.routingReason.length > 40 ? "..." : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">#{log.userId}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error details expandable */}
      {data?.logs?.some((l: any) => !l.success && l.errorMessage) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-2">Últimos Erros</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.logs
                .filter((l: any) => !l.success && l.errorMessage)
                .slice(0, 5)
                .map((log: any) => (
                  <div key={log.id} className="text-xs p-2 bg-destructive/5 rounded border border-destructive/20">
                    <span className="font-mono text-destructive">[{log.provider}/{log.model}]</span>{" "}
                    <span className="text-muted-foreground">{log.errorMessage}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
