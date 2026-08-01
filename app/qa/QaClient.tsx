"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageCircleQuestion,
  Search,
  CheckCircle2,
  XCircle,
  Undo2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  getAdminQuestions,
  getAdminQuestion,
  approveQuestion,
  rejectQuestion,
  takedownQuestion,
  editQuestion,
  createQuestionDirect,
  bulkApproveQuestions,
  bulkRejectQuestions,
  getAdminAnswers,
  approveAnswer,
  rejectAnswer,
  takedownAnswer,
  createAnswerDirect,
  bulkApproveAnswers,
  bulkRejectAnswers,
  qaErrorMessage,
} from "@/lib/api/qa";
import type {
  AdminQuestionListItem,
  AdminQuestionDetail,
  AdminAnswer,
  QAStatus,
  QAStatusCounts,
} from "@/types/qa";

type ContentType = "questions" | "answers";
type StatusFilter = QAStatus | "all";

const EMPTY_COUNTS: QAStatusCounts = { total: 0, pending: 0, approved: 0, rejected: 0 };

function StatusBadge({ status }: { status: QAStatus }) {
  if (status === "approved") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-red-500/30 bg-red-500/10 text-red-400">Rejected</Badge>
    );
  }
  return (
    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Pending</Badge>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
}

export function QaClient() {
  const { toast } = useToast();

  const [contentType, setContentType] = useState<ContentType>("questions");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [questions, setQuestions] = useState<AdminQuestionListItem[]>([]);
  const [answers, setAnswers] = useState<AdminAnswer[]>([]);
  const [statusCounts, setStatusCounts] = useState<QAStatusCounts>(EMPTY_COUNTS);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [detailQuestion, setDetailQuestion] = useState<AdminQuestionDetail | null>(null);
  const [detailAnswer, setDetailAnswer] = useState<AdminAnswer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const [rejectDraft, setRejectDraft] = useState<{
    kind: "reject" | "takedown";
    scope: "single" | "bulk";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [newAnswerBody, setNewAnswerBody] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [createIsFaq, setCreateIsFaq] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // ---- debounce search ----
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [contentType, statusFilter, debouncedSearch]);

  // ---- fetch list ----
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      if (contentType === "questions") {
        const res = await getAdminQuestions({
          status: statusParam,
          search: debouncedSearch || undefined,
          page,
          ordering: "-created_at",
        });
        setQuestions(res.results);
        setStatusCounts(res.status_counts);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      } else {
        const res = await getAdminAnswers({
          status: statusParam,
          search: debouncedSearch || undefined,
          page,
        });
        setAnswers(res.results);
        setStatusCounts(res.status_counts);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      }
    } catch (err) {
      const msg = qaErrorMessage(err, "Failed to load Q&A content");
      setError(msg);
      toast({ title: "Error loading Q&A", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [contentType, statusFilter, debouncedSearch, page, toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ---- selection ----
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const idsOnPage =
      contentType === "questions" ? questions.map((q) => q.id) : answers.map((a) => a.id);
    setSelectedIds((prev) => {
      const allSelected = idsOnPage.every((id) => prev.has(id)) && idsOnPage.length > 0;
      return allSelected ? new Set() : new Set(idsOnPage);
    });
  };

  // ---- detail open ----
  const openQuestionDetail = async (slug: string) => {
    setDetailLoading(true);
    setEditMode(false);
    setNewAnswerBody("");
    try {
      const detail = await getAdminQuestion(slug);
      setDetailQuestion(detail);
    } catch (err) {
      toast({
        title: "Couldn't load question",
        description: qaErrorMessage(err, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailQuestion(null);
    setDetailAnswer(null);
    setRejectDraft(null);
    setRejectReason("");
    setEditMode(false);
  };

  const refreshDetailQuestion = async () => {
    if (!detailQuestion) return;
    const fresh = await getAdminQuestion(detailQuestion.slug);
    setDetailQuestion(fresh);
  };

  // ---- single question actions ----
  const runQuestionAction = async (
    action: "approve" | "reject" | "takedown",
    slug: string,
    reason?: string
  ) => {
    setActionPending(true);
    try {
      if (action === "approve") await approveQuestion(slug);
      if (action === "reject") await rejectQuestion(slug, reason);
      if (action === "takedown") await takedownQuestion(slug, reason);
      toast({
        title:
          action === "approve"
            ? "Question approved"
            : action === "reject"
              ? "Question rejected"
              : "Question taken down",
      });
      setRejectDraft(null);
      setRejectReason("");
      if (detailQuestion?.slug === slug) await refreshDetailQuestion();
      fetchList();
    } catch (err) {
      toast({
        title: "Action failed",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setActionPending(false);
    }
  };

  // ---- single answer actions ----
  const runAnswerAction = async (
    action: "approve" | "reject" | "takedown",
    id: string,
    reason?: string,
    fromQuestionDetail?: boolean
  ) => {
    setActionPending(true);
    try {
      if (action === "approve") await approveAnswer(id);
      if (action === "reject") await rejectAnswer(id, reason);
      if (action === "takedown") await takedownAnswer(id, reason);
      toast({
        title:
          action === "approve"
            ? "Answer approved"
            : action === "reject"
              ? "Answer rejected"
              : "Answer taken down",
      });
      setRejectDraft(null);
      setRejectReason("");
      if (fromQuestionDetail) await refreshDetailQuestion();
      else fetchList();
      if (detailAnswer?.id === id) setDetailAnswer(null);
    } catch (err) {
      toast({
        title: "Action failed",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setActionPending(false);
    }
  };

  // ---- bulk actions ----
  const runBulkAction = async (action: "approve" | "reject", reason?: string) => {
    if (selectedIds.size === 0) return;
    setActionPending(true);
    try {
      const ids = Array.from(selectedIds);
      if (contentType === "questions") {
        if (action === "approve") await bulkApproveQuestions(ids);
        else await bulkRejectQuestions(ids, reason);
      } else {
        if (action === "approve") await bulkApproveAnswers(ids);
        else await bulkRejectAnswers(ids, reason);
      }
      toast({
        title: `${ids.length} item${ids.length === 1 ? "" : "s"} ${
          action === "approve" ? "approved" : "rejected"
        }`,
      });
      setSelectedIds(new Set());
      setRejectDraft(null);
      setRejectReason("");
      fetchList();
    } catch (err) {
      toast({
        title: "Bulk action failed",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setActionPending(false);
    }
  };

  // ---- edit ----
  const startEdit = () => {
    if (!detailQuestion) return;
    setEditTitle(detailQuestion.title);
    setEditBody(detailQuestion.body);
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!detailQuestion) return;
    setActionPending(true);
    try {
      await editQuestion(detailQuestion.slug, { title: editTitle, body: editBody });
      toast({ title: "Question updated" });
      setEditMode(false);
      await refreshDetailQuestion();
      fetchList();
    } catch (err) {
      toast({
        title: "Update failed",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setActionPending(false);
    }
  };

  // ---- add answer directly (from question detail) ----
  const submitAdminAnswer = async () => {
    if (!detailQuestion || newAnswerBody.trim().length === 0) return;
    setActionPending(true);
    try {
      await createAnswerDirect(detailQuestion.id, newAnswerBody.trim());
      toast({ title: "Answer added and published" });
      setNewAnswerBody("");
      await refreshDetailQuestion();
    } catch (err) {
      toast({
        title: "Couldn't add answer",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setActionPending(false);
    }
  };

  // ---- direct-create question ----
  const submitCreateQuestion = async () => {
    if (createTitle.trim().length < 10) {
      toast({
        title: "Title too short",
        description: "Title must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }
    setCreateSubmitting(true);
    try {
      await createQuestionDirect({
        title: createTitle.trim(),
        body: createBody.trim() || undefined,
        is_faq: createIsFaq,
      });
      toast({ title: "Question published" });
      setCreateOpen(false);
      setCreateTitle("");
      setCreateBody("");
      setCreateIsFaq(false);
      fetchList();
    } catch (err) {
      toast({
        title: "Couldn't create question",
        description: qaErrorMessage(err, "Something went wrong."),
        variant: "destructive",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const idsOnPage =
    contentType === "questions" ? questions.map((q) => q.id) : answers.map((a) => a.id);
  const allOnPageSelected = idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.has(id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion className="h-6 w-6 text-rose-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Q&amp;A Moderation</h1>
            <p className="text-sm text-zinc-400">
              Review questions and answers before they go public.
            </p>
          </div>
        </div>
        {contentType === "questions" && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        )}
      </div>

      {/* content type switch */}
      <div className="mb-4 flex gap-2 border-b border-white/10">
        {(["questions", "answers"] as ContentType[]).map((type) => (
          <button
            key={type}
            onClick={() => setContentType(type)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              contentType === type
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* status filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All", value: statusCounts.total },
            { key: "pending", label: "Pending", value: statusCounts.pending },
            { key: "approved", label: "Approved", value: statusCounts.approved },
            { key: "rejected", label: "Rejected", value: statusCounts.rejected },
          ] as { key: StatusFilter; label: string; value: number }[]
        ).map((pill) => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(pill.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === pill.key
                ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {pill.label} ({pill.value})
          </button>
        ))}
      </div>

      {/* search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${contentType}...`}
          className="pl-9"
        />
      </div>

      {/* bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-2.5">
          <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={actionPending}
              onClick={() => runBulkAction("approve")}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionPending}
              onClick={() => setRejectDraft({ kind: "reject", scope: "bulk" })}
              className="gap-1.5 text-red-400"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/40">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
          <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {count} {contentType}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-400">{error}</div>
        ) : contentType === "questions" ? (
          questions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No questions in this view.
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[0.02]"
              >
                <Checkbox
                  checked={selectedIds.has(q.id)}
                  onCheckedChange={() => toggleSelected(q.id)}
                  className="mt-1"
                />
                <button
                  onClick={() => openQuestionDetail(q.slug)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-zinc-100">{q.title}</span>
                    <StatusBadge status={q.status} />
                    {q.is_faq && (
                      <Badge variant="outline" className="text-[10px]">
                        FAQ
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>@{q.author?.username ?? "unknown"}</span>
                    <span>&middot;</span>
                    <span>{formatDate(q.created_at)}</span>
                    <span>&middot;</span>
                    <span>{q.answer_count} answer(s)</span>
                    {q.category && (
                      <>
                        <span>&middot;</span>
                        <span className="capitalize">{q.category}</span>
                      </>
                    )}
                  </div>
                </button>
                {q.status === "pending" && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionPending}
                      onClick={() => runQuestionAction("approve", q.slug)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400"
                      disabled={actionPending}
                      onClick={() => openQuestionDetail(q.slug)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )
        ) : answers.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">
            No answers in this view.
          </div>
        ) : (
          answers.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[0.02]"
            >
              <Checkbox
                checked={selectedIds.has(a.id)}
                onCheckedChange={() => toggleSelected(a.id)}
                className="mt-1"
              />
              <button
                onClick={() => setDetailAnswer(a)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm text-zinc-200">{a.body}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>@{a.author?.username ?? "unknown"}</span>
                  <span>&middot;</span>
                  <span>on &ldquo;{a.question_title}&rdquo;</span>
                  <span>&middot;</span>
                  <span>{formatDate(a.created_at)}</span>
                </div>
              </button>
              {a.status === "pending" && (
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending}
                    onClick={() => runAnswerAction("approve", a.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400"
                    disabled={actionPending}
                    onClick={() => setDetailAnswer(a)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Page {page}</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrev || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNext || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* -------- Bulk reject reason dialog -------- */}
      <Dialog
        open={rejectDraft?.scope === "bulk"}
        onOpenChange={(open) => !open && setRejectDraft(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedIds.size} item(s)</DialogTitle>
            <DialogDescription>
              A reason is optional but helps the author understand the decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionPending}
              onClick={() => runBulkAction("reject", rejectReason.trim() || undefined)}
            >
              {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- Question detail dialog -------- */}
      <Dialog open={Boolean(detailQuestion)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detailQuestion && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <StatusBadge status={detailQuestion.status} />
                  {detailQuestion.is_faq && <Badge variant="outline">FAQ</Badge>}
                </div>
                {editMode ? (
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                ) : (
                  <DialogTitle className="text-left">{detailQuestion.title}</DialogTitle>
                )}
                <DialogDescription className="text-left">
                  Asked by @{detailQuestion.author?.username ?? "unknown"} &middot;{" "}
                  {formatDate(detailQuestion.created_at)}
                </DialogDescription>
              </DialogHeader>

              {editMode ? (
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={5}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-zinc-300">
                  {detailQuestion.body || <span className="italic text-zinc-500">No description provided.</span>}
                </p>
              )}

              {detailQuestion.status === "rejected" && detailQuestion.rejection_reason && (
                <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                  <strong>Rejection reason:</strong> {detailQuestion.rejection_reason}
                </div>
              )}

              {detailQuestion.reviewed_by && (
                <p className="text-xs text-zinc-500">
                  Last reviewed by @{detailQuestion.reviewed_by.username} on{" "}
                  {formatDate(detailQuestion.reviewed_at)}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {editMode ? (
                  <>
                    <Button size="sm" disabled={actionPending} onClick={saveEdit}>
                      {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    {detailQuestion.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionPending}
                          onClick={() => runQuestionAction("approve", detailQuestion.slug)}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-400"
                          disabled={actionPending}
                          onClick={() => setRejectDraft({ kind: "reject", scope: "single" })}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {detailQuestion.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-400"
                        disabled={actionPending}
                        onClick={() => setRejectDraft({ kind: "takedown", scope: "single" })}
                      >
                        <Undo2 className="h-4 w-4" />
                        Take down
                      </Button>
                    )}
                    {detailQuestion.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionPending}
                        onClick={() => runQuestionAction("approve", detailQuestion.slug)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve anyway
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={startEdit}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </>
                )}
              </div>

              {/* inline reject/takedown reason for single item */}
              {rejectDraft?.scope === "single" && (
                <div className="space-y-2 rounded-md border border-white/10 p-3">
                  <Label className="text-xs">
                    {rejectDraft.kind === "takedown" ? "Takedown reason" : "Rejection reason"}{" "}
                    (optional)
                  </Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional reason for the author..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionPending}
                      onClick={() =>
                        runQuestionAction(
                          rejectDraft.kind,
                          detailQuestion.slug,
                          rejectReason.trim() || undefined
                        )
                      }
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectDraft(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* answers */}
              <div className="border-t border-white/10 pt-3">
                <h3 className="mb-2 text-sm font-semibold text-zinc-200">
                  Answers ({detailQuestion.answers?.length ?? 0})
                </h3>
                <div className="space-y-2">
                  {(detailQuestion.answers ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="rounded-md border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <span className="text-xs text-zinc-500">
                          @{a.author?.username ?? "unknown"} &middot; {formatDate(a.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{a.body}</p>
                      {a.status === "rejected" && a.rejection_reason && (
                        <p className="mt-1 text-xs text-red-300">
                          Reason: {a.rejection_reason}
                        </p>
                      )}
                      <div className="mt-2 flex gap-1.5">
                        {a.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionPending}
                              onClick={() => runAnswerAction("approve", a.id, undefined, true)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400"
                              disabled={actionPending}
                              onClick={() => runAnswerAction("reject", a.id, undefined, true)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {a.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400"
                            disabled={actionPending}
                            onClick={() => runAnswerAction("takedown", a.id, undefined, true)}
                          >
                            Take down
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(detailQuestion.answers ?? []).length === 0 && (
                    <p className="text-sm text-zinc-500">No answers yet.</p>
                  )}
                </div>

                {/* admin add answer */}
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Add an answer as admin (publishes immediately)</Label>
                  <Textarea
                    value={newAnswerBody}
                    onChange={(e) => setNewAnswerBody(e.target.value)}
                    placeholder="Write an answer on behalf of NIAT..."
                  />
                  <Button
                    size="sm"
                    disabled={actionPending || newAnswerBody.trim().length === 0}
                    onClick={submitAdminAnswer}
                  >
                    Publish answer
                  </Button>
                </div>
              </div>
            </>
          )}
          {detailLoading && !detailQuestion && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* -------- Answer detail dialog (from Answers tab) -------- */}
      <Dialog open={Boolean(detailAnswer)} onOpenChange={(open) => !open && setDetailAnswer(null)}>
        <DialogContent className="max-w-lg">
          {detailAnswer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <StatusBadge status={detailAnswer.status} />
                </div>
                <DialogTitle className="text-left text-base">
                  On &ldquo;{detailAnswer.question_title}&rdquo;
                </DialogTitle>
                <DialogDescription className="text-left">
                  @{detailAnswer.author?.username ?? "unknown"} &middot;{" "}
                  {formatDate(detailAnswer.created_at)}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{detailAnswer.body}</p>
              {detailAnswer.status === "rejected" && detailAnswer.rejection_reason && (
                <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                  <strong>Rejection reason:</strong> {detailAnswer.rejection_reason}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {detailAnswer.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      disabled={actionPending}
                      onClick={() => runAnswerAction("approve", detailAnswer.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400"
                      disabled={actionPending}
                      onClick={() => setRejectDraft({ kind: "reject", scope: "single" })}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {detailAnswer.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400"
                    disabled={actionPending}
                    onClick={() => setRejectDraft({ kind: "takedown", scope: "single" })}
                  >
                    Take down
                  </Button>
                )}
              </div>
              {rejectDraft?.scope === "single" && (
                <div className="space-y-2 rounded-md border border-white/10 p-3">
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional reason for the author..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionPending}
                      onClick={() =>
                        runAnswerAction(
                          rejectDraft.kind,
                          detailAnswer.id,
                          rejectReason.trim() || undefined
                        )
                      }
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectDraft(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -------- Create question dialog -------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a question directly</DialogTitle>
            <DialogDescription>
              Published immediately as approved &mdash; use this for official FAQ content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. What is the NIAT admission process?"
              />
            </div>
            <div>
              <Label className="text-xs">Body (optional)</Label>
              <Textarea
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={createIsFaq} onCheckedChange={(v) => setCreateIsFaq(Boolean(v))} />
              <Label className="text-xs">Show in FAQ list</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createSubmitting} onClick={submitCreateQuestion}>
              {createSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
