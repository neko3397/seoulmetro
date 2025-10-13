import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, Edit, Trash2, Users, Shield, AlertTriangle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Admin {
  id: string;
  name: string;
  employeeId: string;
  isMainAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AdminManagementProps {
  currentAdmin: Admin;
}

export function AdminManagement({ currentAdmin }: AdminManagementProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    password: ''
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/list`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Error loading admins:', error);
      // Fallback to demo mode
      const mockAdmins = [
        {
          id: 'admin_001',
          name: '시스템 관리자',
          employeeId: 'ADMIN001',
          isMainAdmin: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'admin_002',
          name: '김철수',
          employeeId: 'EMP001',
          isMainAdmin: false,
          createdAt: new Date().toISOString()
        }
      ];
      setAdmins(mockAdmins);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingAdmin
        ? `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/${editingAdmin.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/create`;

      const method = editingAdmin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        await loadAdmins();
        setIsDialogOpen(false);
        resetForm();
      } else {
        alert(data.error || '관리자 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving admin:', error);
      alert('관리자 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (adminId: string, admin: Admin) => {
    if (admin.isMainAdmin) {
      alert('메인 관리자는 삭제할 수 없습니다.');
      return;
    }

    if (admin.id === currentAdmin.id) {
      alert('현재 로그인한 계정은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm(`정말로 관리자 "${admin.name}"을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/${adminId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        await loadAdmins();
      } else {
        alert(data.error || '관리자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('관리자 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      employeeId: admin.employeeId,
      password: '' // 비밀번호는 비워둠
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      employeeId: '',
      password: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>데이터를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>관리자 계정 관리</CardTitle>
          <CardDescription>
            관리자 계정을 추가, 수정, 삭제할 수 있습니다. 메인 관리자는 삭제할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 관리자 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingAdmin ? '관리자 수정' : '새 관리자 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAdmin ? '관리자 정보를 수정합니다.' : '새로운 관리자 계정을 추가합니다.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="관리자 이름을 입력하세요"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="employeeId">사번</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      placeholder="사번을 입력하세요"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">
                      비밀번호 {editingAdmin && <span className="text-sm text-gray-500">(변경하지 않으려면 비워두세요)</span>}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="비밀번호를 입력하세요"
                      required={!editingAdmin}
                    />
                  </div>

                  {editingAdmin && editingAdmin.isMainAdmin && (
                    <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        메인 관리자 계정입니다. 신중하게 수정해 주세요.
                      </span>
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit">
                      {editingAdmin ? '수정' : '추가'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>사번</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>마지막 수정</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>등록된 관리자가 없습니다.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map(admin => (
                    <TableRow key={admin.id} className={admin.id === currentAdmin.id ? 'bg-blue-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {admin.isMainAdmin && <Shield className="h-4 w-4 text-blue-600" />}
                          <span>{admin.name}</span>
                          {admin.id === currentAdmin.id && (
                            <Badge variant="secondary" className="text-xs">본인</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{admin.employeeId}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={admin.isMainAdmin ? "default" : "secondary"}
                          className={admin.isMainAdmin ? "bg-blue-600" : ""}
                        >
                          {admin.isMainAdmin ? '메인 관리자' : '일반 관리자'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(admin.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {admin.updatedAt ? formatDate(admin.updatedAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(admin.id, admin)}
                            disabled={admin.isMainAdmin || admin.id === currentAdmin.id}
                            className={!admin.isMainAdmin && admin.id !== currentAdmin.id ? "text-red-600 hover:text-red-700" : ""}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">권한 안내</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>메인 관리자:</strong> 모든 기능에 접근 가능하며, 다른 관리자를 관리할 수 있습니다. 삭제할 수 없습니다.</li>
              <li>• <strong>일반 관리자:</strong> 영상, 카테고리, 사용자 관리 기능에 접근할 수 있습니다.</li>
              <li>• 현재 로그인한 계정은 삭제할 수 없습니다.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}