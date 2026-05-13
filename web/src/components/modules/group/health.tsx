'use client';

import { LoaderCircle, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGroupHealthList, useRunGroupHealth } from '@/api/endpoints/group-health';

function formatDateTime(value?: string | null) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString();
}

function statusTone(status?: string | null) {
    switch (status) {
        case 'success':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        case 'partial':
            return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
        case 'running':
            return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
        case 'failed':
        default:
            return 'border-destructive/20 bg-destructive/10 text-destructive';
    }
}

function attemptTone(status: 'success' | 'failed' | 'skipped') {
    switch (status) {
        case 'success':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        case 'skipped':
            return 'border-border bg-muted/40 text-muted-foreground';
        case 'failed':
        default:
            return 'border-destructive/20 bg-destructive/10 text-destructive';
    }
}

function AttemptMessage({
    httpStatus,
    durationMS,
    errorMessage,
}: {
    httpStatus: number;
    durationMS: number;
    errorMessage: string;
}) {
    return (
        <div className="mt-1 min-w-0 space-y-2 opacity-80">
            <div className="min-w-0 break-words">
                {httpStatus ? `HTTP ${httpStatus} · ` : ''}
                {durationMS}ms
            </div>
            {errorMessage ? (
                <details className="min-w-0 rounded-lg border border-current/15 bg-background/50 p-2">
                    <summary className="cursor-pointer list-none text-[11px] font-medium opacity-90">
                        Error details
                    </summary>
                    <div className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                        {errorMessage}
                    </div>
                </details>
            ) : null}
        </div>
    );
}

export function GroupHealthSection({ groupId }: { groupId?: number }) {
    const { data: views = [] } = useGroupHealthList();
    const runGroupHealth = useRunGroupHealth();

    if (!groupId) return null;

    const view = views.find((item) => item.group_id === groupId);
    const latest = view?.latest ?? null;

    return (
        <section className="rounded-xl border border-border/50 bg-muted/30 p-3 mb-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">Health</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Last run {formatDateTime(latest?.finished_at ?? latest?.started_at ?? null)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('h-6 px-2 text-[11px]', latest ? statusTone(latest.status) : 'border-border bg-muted/40 text-muted-foreground')}>
                        {latest?.status ?? 'idle'}
                    </Badge>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8"
                        disabled={runGroupHealth.isPending && runGroupHealth.variables === groupId || latest?.status === 'running'}
                        onClick={() => runGroupHealth.mutate(groupId)}
                    >
                        {latest?.status === 'running' ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                        Run
                    </Button>
                </div>
            </div>

            <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {latest?.attempts?.length ? latest.attempts.map((attempt) => (
                    <div key={attempt.id} className={cn('min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-xs', attemptTone(attempt.status))}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate font-medium">
                                {attempt.channel_name}
                                {attempt.key_remark ? ` / ${attempt.key_remark}` : ''}
                            </div>
                            <div className="shrink-0">{attempt.status}</div>
                        </div>
                        <AttemptMessage
                            httpStatus={attempt.http_status}
                            durationMS={attempt.duration_ms}
                            errorMessage={attempt.error_message}
                        />
                    </div>
                )) : (
                    <div className="rounded-lg border border-dashed border-border/70 bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                        No health snapshot yet.
                    </div>
                )}
            </div>
        </section>
    );
}
