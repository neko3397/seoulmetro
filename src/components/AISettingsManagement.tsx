import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { MarkdownContent } from "./MarkdownContent";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { apiRequest } from "../lib/api";
import { normalizeChatQueryResult } from "../lib/chat";
import type { ChatQueryResult } from "../types/content";

const RETRIEVAL_SCOPE_OPTIONS = [
  { value: "guides", label: "사내규정" },
  { value: "notices", label: "공지/문서 게시물" },
];

interface AISettingsManagementProps {
  onUpdated: () => void;
}

export function AISettingsManagement({ onUpdated }: AISettingsManagementProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logSummary, setLogSummary] = useState({
    total: 0,
    success: 0,
    retrievalFailures: 0,
    generationFailures: 0,
    noContext: 0,
    errors: 0,
  });
  const [indexStatus, setIndexStatus] = useState({
    sourceCount: 0,
    chunkCount: 0,
    lastIndexedAt: "",
    scopeCounts: { guides: 0, notices: 0 },
  });
  const [formData, setFormData] = useState({
    provider: "openai",
    model: "gpt-5.4-mini",
    embeddingModel: "text-embedding-3-small",
    retrievalScope: ["guides", "notices"],
    chunkSize: 800,
    chunkOverlap: 120,
    dailyQuestionLimit: 20,
    systemPrompt: "",
    isEnabled: true,
    apiKeyConfigured: false,
  });
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<ChatQueryResult | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes, indexRes] = await Promise.all([
        apiRequest("/admin/ai/settings"),
        apiRequest("/admin/ai/query-logs"),
        apiRequest("/admin/ai/index-status"),
      ]);
      const [settingsData, logsData, indexData] = await Promise.all([
        settingsRes.json(),
        logsRes.json(),
        indexRes.json(),
      ]);

      const settings = settingsData.settings || {};
      const provider = settingsData.provider || {};
      setFormData({
        provider: settings.provider || "openai",
        model: settings.model || "gpt-5.4-mini",
        embeddingModel: settings.embeddingModel || "text-embedding-3-small",
        retrievalScope: Array.isArray(settings.retrievalScope) ? settings.retrievalScope : ["guides", "notices"],
        chunkSize: Number(settings.chunkSize || 800),
        chunkOverlap: Number(settings.chunkOverlap || 120),
        dailyQuestionLimit: Number(settings.dailyQuestionLimit || 20),
        systemPrompt: settings.systemPrompt || "",
        isEnabled: settings.isEnabled !== false,
        apiKeyConfigured: Boolean(provider.apiKeyConfigured),
      });
      setLogs(logsData.logs || []);
      setLogSummary(
        logsData.summary || {
          total: 0,
          success: 0,
          retrievalFailures: 0,
          generationFailures: 0,
          noContext: 0,
          errors: 0,
        },
      );
      setIndexStatus(
        indexData.status || {
          sourceCount: 0,
          chunkCount: 0,
          lastIndexedAt: "",
          scopeCounts: { guides: 0, notices: 0 },
        },
      );
    } catch (error) {
      console.error("Failed to load AI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/admin/ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: formData.provider,
          model: formData.model,
          embeddingModel: formData.embeddingModel,
          retrievalScope: formData.retrievalScope,
          chunkSize: Number(formData.chunkSize),
          chunkOverlap: Number(formData.chunkOverlap),
          dailyQuestionLimit: Number(formData.dailyQuestionLimit),
          systemPrompt: formData.systemPrompt,
          isEnabled: formData.isEnabled,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "AI 설정 저장에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      alert("AI 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    try {
      setReindexing(true);
      const response = await apiRequest("/admin/ai/reindex", {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "재색인에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to reindex:", error);
      alert("재색인 중 오류가 발생했습니다.");
    } finally {
      setReindexing(false);
    }
  };

  const handleTestQuery = async () => {
    if (!testQuestion.trim()) return;
    try {
      setQuerying(true);
      const response = await apiRequest("/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: testQuestion,
          employeeId: "00000000",
        }),
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setTestResult(normalizeChatQueryResult(data));
      await load();
    } catch (error) {
      console.error("Failed to run test query:", error);
      alert("테스트 질문 중 오류가 발생했습니다.");
    } finally {
      setQuerying(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">AI 설정을 불러오는 중...</CardContent>
      </Card>
    );
  }

  const toggleScope = (scope: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      retrievalScope: checked
        ? Array.from(new Set([...prev.retrievalScope, scope]))
        : prev.retrievalScope.filter((value) => value !== scope),
    }));
  };

  const testSources = testResult?.sources || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI 제공자 설정</CardTitle>
          <CardDescription>기본 제공자는 OpenAI이며, RAG 파라미터와 기본 모델을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="provider">제공자</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData((prev) => ({ ...prev, provider: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="model">기본 생성 모델</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="embeddingModel">임베딩 모델</Label>
              <Input
                id="embeddingModel"
                value={formData.embeddingModel}
                onChange={(e) => setFormData((prev) => ({ ...prev, embeddingModel: e.target.value }))}
              />
            </div>
            <div>
              <Label>검색 범위</Label>
              <div className="mt-2 space-y-2 rounded-md border p-3">
                {RETRIEVAL_SCOPE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.retrievalScope.includes(option.value)}
                      onCheckedChange={(checked) => toggleScope(option.value, checked === true)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="chunkSize">청크 크기</Label>
              <Input
                id="chunkSize"
                type="number"
                value={formData.chunkSize}
                onChange={(e) => setFormData((prev) => ({ ...prev, chunkSize: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <Label htmlFor="chunkOverlap">청크 오버랩</Label>
              <Input
                id="chunkOverlap"
                type="number"
                value={formData.chunkOverlap}
                onChange={(e) => setFormData((prev) => ({ ...prev, chunkOverlap: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <Label htmlFor="dailyQuestionLimit">사용자별 일일 질문 제한</Label>
              <Input
                id="dailyQuestionLimit"
                type="number"
                min={1}
                value={formData.dailyQuestionLimit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dailyQuestionLimit: Math.max(1, Number(e.target.value || 1)) }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="ai-enabled"
              type="checkbox"
              checked={formData.isEnabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, isEnabled: e.target.checked }))}
            />
            <Label htmlFor="ai-enabled">챗봇 활성화</Label>
            <span className="text-sm text-muted-foreground">
              API 키 상태: {formData.apiKeyConfigured ? "설정됨" : "미설정"}
            </span>
          </div>

          <div>
            <Label htmlFor="systemPrompt">시스템 프롬프트</Label>
            <Textarea
              id="systemPrompt"
              rows={5}
              value={formData.systemPrompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              설정 저장
            </Button>
            <Button variant="outline" onClick={handleReindex} disabled={reindexing}>
              재색인 실행
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAG 상태</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">문서 수</div>
            <div className="text-2xl font-bold">{indexStatus.sourceCount}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">청크 수</div>
            <div className="text-2xl font-bold">{indexStatus.chunkCount}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">마지막 색인</div>
            <div className="text-sm font-medium">
              {indexStatus.lastIndexedAt
                ? new Date(indexStatus.lastIndexedAt).toLocaleString("ko-KR")
                : "없음"}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">범위별 문서 수</div>
            <div className="space-y-1 text-sm font-medium">
              <div>사내규정 {indexStatus.scopeCounts?.guides || 0}</div>
              <div>공지/문서 {indexStatus.scopeCounts?.notices || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>테스트 질의</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={3}
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            placeholder="문서 검색 기반으로 테스트할 질문을 입력하세요."
          />
          <Button onClick={handleTestQuery} disabled={querying}>
            질문 실행
          </Button>
          {testResult ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
                <div className="border-b border-slate-100 bg-[linear-gradient(90deg,#eff6ff_0%,#f8fafc_100%)] px-4 py-3 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                  Markdown Preview
                </div>
                <div className="p-4">
                  <MarkdownContent value={testResult.answer} compact />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>상태: {testResult.status}</span>
                <span>모델: {testResult.model}</span>
                <span>
                  사용량: {testResult.usage.usedToday}/{testResult.usage.dailyLimit}
                </span>
                <span>남은 횟수: {testResult.usage.remainingToday}</span>
                {testResult.diagnostics?.failureStage ? (
                  <span>실패 단계: {testResult.diagnostics.failureStage}</span>
                ) : null}
              </div>
              {testResult.diagnostics?.retrieval ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-3 text-sm">
                    <div className="text-muted-foreground">후보 / 재정렬 / 선택</div>
                    <div className="font-medium">
                      {testResult.diagnostics.retrieval.candidateCount} / {testResult.diagnostics.retrieval.rerankedCount} /{" "}
                      {testResult.diagnostics.retrieval.selectedCount}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <div className="text-muted-foreground">최종 점수 / 원 검색 점수</div>
                    <div className="font-medium">
                      {Number(testResult.diagnostics.retrieval.topScore || 0).toFixed(3)} /{" "}
                      {Number(testResult.diagnostics.retrieval.topRetrievalScore || 0).toFixed(3)}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 text-sm">
                    <div className="text-muted-foreground">임계값 / 임베딩 사용</div>
                    <div className="font-medium">
                      {Number(testResult.diagnostics.retrieval.thresholdApplied || 0).toFixed(3)} /{" "}
                      {testResult.diagnostics.retrieval.queryHasEmbedding ? "예" : "아니오"}
                    </div>
                  </div>
                </div>
              ) : null}
              {testSources.length ? (
                <div className="space-y-2">
                  {testSources.map((source, index) => (
                    <div
                      key={`${source.sourceId}-${source.target.id}-${index}`}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="font-medium">{source.title}</div>
                      <div className="text-muted-foreground">
                        {source.sourceType} / 관련도 {Number(source.score ?? 0).toFixed(3)}
                      </div>
                      <div className="mt-1 text-muted-foreground">{source.snippet}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 챗봇 로그</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">총 로그</div>
              <div className="text-2xl font-bold">{logSummary.total}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">성공</div>
              <div className="text-2xl font-bold">{logSummary.success}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">검색 실패</div>
              <div className="text-2xl font-bold">{logSummary.retrievalFailures}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">생성 실패</div>
              <div className="text-2xl font-bold">{logSummary.generationFailures}</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시각</TableHead>
                <TableHead>질문</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>실패 단계</TableHead>
                <TableHead>모델</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{log.question}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.failure_stage || (log.status === "no_context" ? "retrieval" : "-")}</TableCell>
                  <TableCell>{log.model || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
