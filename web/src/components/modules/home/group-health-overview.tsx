'use client';

import { useMemo } from 'react';
import { Activity, CheckCircle2, Clock3, FolderTree, LoaderCircle, Play, Siren, XCircle } from 'lucide-react';
import { useGroupHealthList, useRunAllGroupHealth, useRunGroupHealth, type GroupHealthAttempt, type GroupHealthGroupView } from '@/api/endpoints/group-health';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

function attemptTone(status: GroupHealthAttempt['status']) {
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

function AttemptMessage({ attempt }: { attempt: GroupHealthAttempt }) {
    return (
        <div className="mt-1 min-w-0 space-y-2 text-[11px] opacity-80">
            <div className="min-w-0 break-words">
                {attempt.http_status ? `HTTP ${attempt.http_status} · ` : ''}
                {attempt.duration_ms}ms
            </div>
            {attempt.error_message ? (
                <details className="min-w-0 rounded-xl border border-current/15 bg-background/50 p-2">
                    <summary className="cursor-pointer list-none text-[11px] font-medium opacity-90">
                        Error details
                    </summary>
                    <div className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                        {attempt.error_message}
                    </div>
                </details>
            ) : null}
        </div>
    );
}

function summarize(view: GroupHealthGroupView) {
    const attempts = view.latest?.attempts ?? [];
    const successCount = attempts.filter((attempt) => attempt.status === 'success').length;
    return {
        attempts,
        successCount,
    };
}

function GroupHealthCard({
    view,
    onRun,
    isRunningMutation,
}: {
    view: GroupHealthGroupView;
    onRun: (groupId: number) => void;
    isRunningMutation: boolean;
}) {
    const { attempts, successCount } = summarize(view);
    const latest = view.latest;
    return (
        <article className="min-w-0 overflow-hidden rounded-3xl border border-border/70 bg-card p-4">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <FolderTree className="size-4 text-primary" />
                        <h3 className="truncate text-base font-semibold">{view.group_name}</h3>
                    </div>
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
                        className="rounded-xl"
                        disabled={isRunningMutation || latest?.status === 'running'}
                        onClick={() => onRun(view.group_id)}
                    >
                        {latest?.status === 'running' ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                        Run
                    </Button>
                </div>
            </header>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Activity className="size-4" />
                    {successCount}/{attempts.length || 0} healthy
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock3 className="size-4" />
                    {latest?.duration_ms ?? 0}ms
                </span>
            </div>

            <div className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                {attempts.length > 0 ? attempts.map((attempt) => (
                    <div
                        key={attempt.id}
                        className={cn('min-w-0 overflow-hidden rounded-2xl border px-3 py-2 text-xs', attemptTone(attempt.status))}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate font-medium">
                                {attempt.channel_name}
                                {attempt.key_remark ? ` / ${attempt.key_remark}` : ''}
                            </div>
                            <div className="shrink-0">
                                {attempt.status}
                            </div>
                        </div>
                        <AttemptMessage attempt={attempt} />
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                        No health snapshot yet.
                    </div>
                )}
            </div>
        </article>
    );
}

export function GroupHealthOverview() {
    const { data: views = [] } = useGroupHealthList();
    const runGroupHealth = useRunGroupHealth();
    const runAllGroupHealth = useRunAllGroupHealth();

    const summary = useMemo(() => {
        const running = views.filter((view) => view.latest?.status === 'running').length;
        const failed = views.filter((view) => view.latest?.status === 'failed').length;
        const partial = views.filter((view) => view.latest?.status === 'partial').length;
        const success = views.filter((view) => view.latest?.status === 'success').length;
        return { running, failed, partial, success };
    }, [views]);

    return (
        <section className="rounded-3xl bg-card border-card-border border text-card-foreground custom-shadow p-5 space-y-4">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Siren className="size-5 text-primary" />
                        Group Health
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><LoaderCircle className="size-3.5" />{summary.running} running</span>
                        <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" />{summary.success} success</span>
                        <span className="inline-flex items-center gap-1"><Activity className="size-3.5" />{summary.partial} partial</span>
                        <span className="inline-flex items-center gap-1"><XCircle className="size-3.5" />{summary.failed} failed</span>
                    </div>
                </div>

                <Button
                    type="button"
                    className="rounded-2xl"
                    onClick={() => runAllGroupHealth.mutate()}
                    disabled={runAllGroupHealth.isPending}
                >
                    {runAllGroupHealth.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Run All
                </Button>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {views.map((view) => (
                    <GroupHealthCard
                        key={view.group_id}
                        view={view}
                        onRun={(groupId) => runGroupHealth.mutate(groupId)}
                        isRunningMutation={runGroupHealth.isPending && runGroupHealth.variables === view.group_id}
                    />
                ))}
            </div>
        </section>
    );
}
