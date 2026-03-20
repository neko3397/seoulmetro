import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Search, UserPlus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "../lib/api";
import { Alert, AlertDescription } from "./ui/alert";

interface AuthorizedEmployee {
  employeeId: string;
  name: string;
  createdAt: string;
}

export const AuthorizedEmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<AuthorizedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Add Employee Form State
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchEmployees = async (query: string = "") => {
    setLoading(true);
    try {
      const response = await apiRequest(`/admin/authorized_employees?search=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("명단을 불러오지 못했습니다.");
      const data = await response.json();
      setEmployees(data.employees);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(search);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees(search);
  };

  const handleAddEmployee = async () => {
    if (newEmployeeId.length !== 8) {
      alert("사번은 8자리여야 합니다.");
      return;
    }
    if (!newName.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await apiRequest("/admin/authorized_employees", {
        method: "POST",
        body: JSON.stringify({ employeeId: newEmployeeId, name: newName }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "추가 실패");
      }
      
      setNewEmployeeId("");
      setNewName("");
      setIsDialogOpen(false);
      fetchEmployees(search);
    } catch (err) {
      alert(err instanceof Error ? err.message : "추가 중 오류가 발생했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, name: string) => {
    if (!confirm(`${name}(${employeeId}) 직원을 명단에서 삭제하시겠습니까?`)) return;

    try {
      const response = await apiRequest(`/admin/authorized_employees/${employeeId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("삭제 실패");
      fetchEmployees(search);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">로그인 승인 직원 관리</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                직원 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새로운 승인 직원 추가</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employeeId" className="text-right">사번</Label>
                  <Input
                    id="employeeId"
                    placeholder="8자리 숫자"
                    className="col-span-3"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">이름</Label>
                  <Input
                    id="name"
                    placeholder="직원 성함"
                    className="col-span-3"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                <Button onClick={handleAddEmployee} disabled={isAdding}>
                  {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  추가하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="사번 또는 이름으로 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">검색</Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mb-4">
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
                  <TableHead>추가일시</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        로딩 중...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">{emp.employeeId}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(emp.createdAt).toLocaleDateString()} {new Date(emp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteEmployee(emp.employeeId, emp.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
