import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, UserPlus, Trash2, Loader2, AlertCircle, Pencil, RefreshCcw, Users } from "lucide-react";
import { apiRequest } from "../lib/api";

interface AuthorizedEmployee {
  employeeId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AuthorizedEmployeeManagementProps {
  onUpdated?: () => void;
}

const emptyForm = {
  employeeId: "",
  name: "",
};

export function AuthorizedEmployeeManagement({ onUpdated }: AuthorizedEmployeeManagementProps) {
  const [employees, setEmployees] = useState<AuthorizedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AuthorizedEmployee | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const dialogTitle = useMemo(
    () => (editingEmployee ? "로그인 허용 사용자 수정" : "로그인 허용 사용자 추가"),
    [editingEmployee],
  );

  const loadEmployees = async (query = searchQuery) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/admin/authorized_employees?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "목록을 불러오지 못했습니다.");
      }

      const data = await response.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees("");
  }, []);

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData(emptyForm);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (employee: AuthorizedEmployee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.employeeId,
      name: employee.name,
    });
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    if (formData.employeeId.length !== 8) {
      throw new Error("사번은 8자리 숫자여야 합니다.");
    }
    if (!formData.name.trim()) {
      throw new Error("이름을 입력해주세요.");
    }
  };

  const handleSubmit = async () => {
    try {
      validateForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "입력값을 확인해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const path = editingEmployee
        ? `/admin/authorized_employees/${editingEmployee.employeeId}`
        : "/admin/authorized_employees";
      const method = editingEmployee ? "PUT" : "POST";

      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          name: formData.name.trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "저장에 실패했습니다.");
      }

      handleDialogChange(false);
      await loadEmployees(searchQuery);
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee: AuthorizedEmployee) => {
    if (!confirm(`${employee.name} (${employee.employeeId}) 사용자를 로그인 허용 명단에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiRequest(`/admin/authorized_employees/${employee.employeeId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "삭제에 실패했습니다.");
      }

      await loadEmployees(searchQuery);
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    loadEmployees(searchInput);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>로그인 허용 사용자 관리</CardTitle>

        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadEmployees(searchQuery)} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                사용자 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>
                  로그인 허용 대상자의 사번과 이름을 등록합니다.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="authorized-employee-id">사번</Label>
                  <Input
                    id="authorized-employee-id"
                    placeholder="8자리 숫자"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        employeeId: e.target.value.replace(/\D/g, "").slice(0, 8),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorized-employee-name">이름</Label>
                  <Input
                    id="authorized-employee-name"
                    placeholder="사용자 이름"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogChange(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingEmployee ? "수정" : "추가"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="사번 또는 이름으로 검색"
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            검색
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사번</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>수정일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      로딩 중...
                    </div>
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    {searchQuery ? "검색 결과가 없습니다." : "등록된 로그인 허용 사용자가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">{employee.employeeId}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(employee.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(employee.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(employee)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(employee)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
