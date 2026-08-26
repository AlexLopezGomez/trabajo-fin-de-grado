"use client";

/**
 * Admin UI - Query Approval Queue (Client Component)
 * 
 * Supervisors use this page to approve or reject heavy queries from Operators.
 */

import { useState, useEffect, useTransition } from "react";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Database,
    User,
    LayoutDashboard,
    Zap,
    Loader2,
    AlertCircle,
    History,
    ClipboardList,
    Code2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import {
    getPendingApprovals,
    getApprovalHistory,
    approveQuery,
    rejectQuery,
} from "@/app/actions/query-approval";
import type { ApprovalQueueItem, QueryApproval } from "@/types/rbac";

type TabType = "pending" | "history";

export default function ApprovalsClientPage() {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<TabType>("pending");
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalQueueItem[]>([]);
    const [historyApprovals, setHistoryApprovals] = useState<QueryApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [expandedApprovalId, setExpandedApprovalId] = useState<string | null>(null);

    // Load data
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setError(null);

            try {
                if (activeTab === "pending") {
                    const data = await getPendingApprovals();
                    setPendingApprovals(data);
                } else {
                    const data = await getApprovalHistory(50);
                    setHistoryApprovals(data);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load approvals");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [activeTab]);

    const handleApprove = (approvalId: string) => {
        if (!confirm("Confirm approval for this query?")) return;

        setActionError(null);
        startTransition(async () => {
            try {
                await approveQuery(approvalId);
                setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
            } catch (err) {
                setActionError(err instanceof Error ? err.message : "Failed to approve");
            }
        });
    };

    const handleOpenRejectModal = (approvalId: string) => {
        setRejectingId(approvalId);
        setRejectNotes("");
        setActionError(null);
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (!rejectingId) return;
        if (!rejectNotes.trim()) {
            setActionError("Please provide a reason for rejection");
            return;
        }

        setActionError(null);
        startTransition(async () => {
            try {
                await rejectQuery(rejectingId, rejectNotes);
                setPendingApprovals((prev) => prev.filter((a) => a.id !== rejectingId));
                setShowRejectModal(false);
                setRejectingId(null);
                setRejectNotes("");
            } catch (err) {
                setActionError(err instanceof Error ? err.message : "Failed to reject");
            }
        });
    };

    const getCostBadgeClass = (score: number) => {
        if (score >= 70) return "bg-red-500/10 text-red-400 border-red-500/30";
        if (score >= 40) return "bg-muted text-muted-foreground border-border";
        return "bg-primary/10 text-primary border-primary/30";
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <ClipboardList className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Query Approvals</h1>
                                <p className="text-sm text-muted-foreground">
                                    Review and approve heavy queries from Operators
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <span className="text-primary font-medium">
                                    {pendingApprovals.length} pending
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-border">
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === "pending"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Clock className="w-4 h-4" />
                        Pending
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === "history"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <History className="w-4 h-4" />
                        History
                    </button>
                </div>

                {/* Action Error */}
                {actionError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {actionError}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">Loading approvals...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                        <p className="font-medium">Error loading approvals</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                )}

                {/* Pending Tab */}
                {!loading && !error && activeTab === "pending" && (
                    <div className="space-y-4">
                        {pendingApprovals.length === 0 ? (
                            <div className="text-center py-12 bg-card/50 border border-border rounded-lg">
                                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                                <p className="text-lg text-foreground font-medium">All caught up!</p>
                                <p className="text-muted-foreground mt-1">
                                    No pending approvals at this time.
                                </p>
                            </div>
                        ) : (
                            pendingApprovals.map((approval) => (
                                <div
                                    key={approval.id}
                                    className="bg-card/50 border border-border rounded-lg p-5 hover:border-border/80 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="flex items-center gap-1.5 text-foreground font-medium">
                                                    <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                                                    {approval.dashboardName}
                                                </span>
                                                {approval.widgetName && (
                                                    <span className="text-xs text-muted-foreground">
                                                        &bull; {approval.widgetName}
                                                    </span>
                                                )}
                                                <span
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium border",
                                                        getCostBadgeClass(approval.costScore)
                                                    )}
                                                >
                                                    <Zap className="w-3 h-3 inline mr-1" />
                                                    Cost: {approval.costScore}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="w-4 h-4" />
                                                    {approval.requesterName}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Database className="w-4 h-4" />
                                                    {approval.collection}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    {approval.daysPending === 0
                                                        ? "Today"
                                                        : `${approval.daysPending}d ago`}
                                                </span>
                                            </div>

                                            {approval.originalQuestion && (
                                                <div className="mt-3 text-sm text-foreground">
                                                    <span className="text-muted-foreground">Consulta:</span>{" "}
                                                    {approval.originalQuestion}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    setExpandedApprovalId(
                                                        expandedApprovalId === approval.id ? null : approval.id
                                                    )
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                    "bg-card/80 text-foreground border border-border",
                                                    "hover:bg-muted/60 hover:border-border"
                                                )}
                                            >
                                                <Code2 className="w-4 h-4" />
                                                {expandedApprovalId === approval.id ? "Ocultar" : "Detalles"}
                                                {expandedApprovalId === approval.id ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleApprove(approval.id)}
                                                disabled={isPending}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                    "bg-primary/10 text-primary border border-primary/30",
                                                    "hover:bg-primary/20 hover:border-primary/50",
                                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                                )}
                                            >
                                                {isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleOpenRejectModal(approval.id)}
                                                disabled={isPending}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                    "bg-red-500/10 text-red-400 border border-red-500/30",
                                                    "hover:bg-red-500/20 hover:border-red-500/50",
                                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                                )}
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>

                                    {expandedApprovalId === approval.id && (
                                        <div className="mt-4 border-t border-border/60 pt-4">
                                            <div className="text-xs text-muted-foreground uppercase mb-2">
                                                Mongo Aggregation Pipeline
                                            </div>
                                            <pre className="bg-card rounded-lg p-3 text-xs text-foreground overflow-x-auto">
                                                <code>{JSON.stringify(approval.pipeline || [], null, 2)}</code>
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* History Tab */}
                {!loading && !error && activeTab === "history" && (
                    <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Dashboard
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Requester
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Reviewer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {historyApprovals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            No approval history yet.
                                        </td>
                                    </tr>
                                ) : (
                                    historyApprovals.map((approval) => (
                                        <tr key={approval.id} className="hover:bg-muted/10">
                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                                        approval.status === "approved"
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-red-500/10 text-red-400"
                                                    )}
                                                >
                                                    {approval.status === "approved" ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3" />
                                                    )}
                                                    {approval.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground">
                                                {approval.collection}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {approval.requesterName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {approval.reviewerName || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {approval.reviewedAt
                                                    ? new Date(approval.reviewedAt).toLocaleDateString()
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowRejectModal(false)}
                    />
                    <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-foreground mb-2">Reject Query</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Please provide a reason for rejecting this query. This will be
                            visible to the requester.
                        </p>

                        <textarea
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full h-24 px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        />

                        {actionError && (
                            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {actionError}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isPending || !rejectNotes.trim()}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    "bg-red-500 text-foreground",
                                    "hover:bg-red-600",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                Reject Query
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
