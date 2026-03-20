import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { apiRequest } from "../lib/api";

interface AISettingsManagementProps {
  onUpdated: () => void;
}

export function AISettingsManagement({ onUpdated }: AISettingsManagementProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [indexStatus, setIndexStatus] = useState({ sourceCount: 0, chunkCount: 0, lastIndexedAt: "" });
  const [formData, setFormData] = useState({
    provider: "openai",
    model: "gpt-5.4",
    embeddingModel: "text-embedding-3-small",
    retrievalScope: "guides,community",
    chunkSize: 800,
    chunkOverlap: 120,
    systemPrompt: "",
    isEnabled: true,
    apiKeyConfigured: false,
  });
  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState("");

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
        model: settings.model || "gpt-5.4",
        embeddingModel: settings.embeddingModel || "text-embedding-3-small",
        retrievalScope: Array.isArray(settings.retrievalScope)
          ? settings.retrievalScope.join(",")
          : "guides,community",
        chunkSize: Number(settings.chunkSize || 800),
        chunkOverlap: Number(settings.chunkOverlap || 120),
        systemPrompt: settings.systemPrompt || "",
        isEnabled: settings.isEnabled !== false,
        apiKeyConfigured: Boolean(provider.apiKeyConfigured),
      });
      setLogs(logsData.logs || []);
      setIndexStatus(indexData.status || { sourceCount: 0, chunkCount: 0, lastIndexedAt: "" });
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
          retrievalScope: formData.retrievalScope.split(",").map((value) => value.trim()).filter(Boolean),
          chunkSize: Number(formData.chunkSize),
          chunkOverlap: Number(formData.chunkOverlap),
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
      setTestAnswer(data.answer || "");
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
              <Label htmlFor="retrievalScope">색인 범위</Label>
              <Input
                id="retrievalScope"
                value={formData.retrievalScope}
                onChange={(e) => setFormData((prev) => ({ ...prev, retrievalScope: e.target.value }))}
                placeholder="guides,community"
              />
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
        <CardContent className="grid gap-4 md:grid-cols-3">
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
          {testAnswer && (
            <div className="rounded-md border p-4 whitespace-pre-wrap text-sm">
              {testAnswer}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 챗봇 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시각</TableHead>
                <TableHead>질문</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>모델</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{log.question}</TableCell>
                  <TableCell>{log.status}</TableCell>
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
