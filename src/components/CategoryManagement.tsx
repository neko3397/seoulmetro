import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, FolderOpen, ExternalLink, Upload, X } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// NOTE: 서버 초기화 코드에서 사용하는 버킷 네이밍과 일치시키기
// src/supabase/functions/server/index.tsx 에서 'make-a8898ff1-images' 버킷을 사용
const IMAGE_BUCKET = 'make-a8898ff1-images';

interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
}

interface CategoryManagementProps {
  onStatsUpdate: () => void;
}

export function CategoryManagement({ onStatsUpdate }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image: '',
    description: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
      }

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

      // FormData 객체 생성 및 파일 추가
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filePath', filePath);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
          // 'Content-Type'은 FormData 사용 시 자동 설정됨
        },
        body: formData
      });

      const data = await response.json();



      if (!response.ok) {
        console.error('Upload error:', data.error || response.statusText);
        throw new Error(data.error || '이미지 업로드에 실패했습니다.');
      }

      console.log('Upload successful:', data);

      return data.publicUrl.publicUrl;
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setImagePreview('');
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to demo mode
      const mockCategories = [
        {
          id: 'fire',
          title: '화재발생 시 대응요령',
          subtitle: '객실 화재 발생 시 승무원 행동요령',
          image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
          description: '지하철 화재 발생 시 대응 방법을 학습합니다.'
        },
        {
          id: 'safety',
          title: '지하철 안전운행',
          subtitle: '안전한 지하철 운행을 위한 기본 수칙',
          image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop',
          description: '지하철 운행 안전 수칙과 주의사항을 학습합니다.'
        }
      ];
      setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = formData.image;

      // 새로운 파일이 선택된 경우 업로드
      if (selectedFile) {
        try {
          imageUrl = await uploadImage(selectedFile);
        } catch (uploadError) {
          // 업로드 실패 시 사용자에게 선택권 제공
          const continueWithoutImage = confirm(
            `이미지 업로드에 실패했습니다.\n\n${uploadError instanceof Error ? uploadError.message : '알 수 없는 오류'}\n\n이미지 없이 카테고리를 저장하시겠습니까?`
          );

          if (!continueWithoutImage) {
            throw uploadError; // 사용자가 취소하면 전체 프로세스 중단
          }

          // 기존 이미지 유지 또는 기본 이미지 사용
          imageUrl = formData.image || 'https://via.placeholder.com/400x300/f0f0f0/666?text=No+Image';
        }
      }

      const submitData = {
        ...formData,
        image: imageUrl
      };

      const url = editingCategory
        ? `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories/${editingCategory.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories`;

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        await loadCategories();
        onStatsUpdate();
        setIsDialogOpen(false);
        resetForm();
      } else {
        alert(data.error || '카테고리 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving category:', error);

      let errorMessage = '카테고리 저장 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('row-level security policy') || error.message.includes('RLS')) {
          errorMessage = '이미지 업로드 권한이 없습니다.\n\nSupabase Storage에서 다음 설정이 필요합니다:\n1. Storage > Settings에서 RLS 비활성화\n2. 또는 Public 정책 추가\n\n관리자에게 문의하세요.';
        } else if (error.message.includes('파일 크기') || error.message.includes('이미지 파일')) {
          errorMessage = error.message;
        } else {
          errorMessage = `저장 실패: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('정말로 이 카테고리를 삭제하시겠습니까? 해당 카테고리의 모든 영상도 함께 삭제됩니다.')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories/${categoryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        await loadCategories();
        onStatsUpdate();
      } else {
        alert(data.error || '카테고리 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      subtitle: category.subtitle,
      image: category.image,
      description: category.description
    });
    setImagePreview(category.image);
    setSelectedFile(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      title: '',
      subtitle: '',
      image: '',
      description: ''
    });
    setSelectedFile(null);
    setImagePreview('');
  };

  const getImagePreview = (imageUrl: string) => {
    if (!imageUrl) return null;

    return (
      <img
        src={imageUrl}
        alt="미리보기"
        className="w-16 h-12 object-cover rounded border"
      />
    );
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
          <CardTitle>카테고리 관리</CardTitle>
          <CardDescription>
            교육 카테고리를 추가, 수정, 삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 카테고리 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? '카테고리 수정' : '새 카테고리 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? '카테고리 정보를 수정합니다.' : '새로운 교육 카테고리를 추가합니다.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">카테고리 제목</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="카테고리 제목을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subtitle">부제목</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="카테고리 부제목을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="image">카테고리 이미지</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeSelectedFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {(imagePreview || formData.image) && (
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">미리보기:</Label>
                          <div className="flex items-start gap-3">
                            <img
                              src={imagePreview || formData.image}
                              alt="미리보기"
                              className="w-24 h-18 object-cover rounded border"
                            />
                            {selectedFile && (
                              <div className="text-sm text-gray-600">
                                <p>선택된 파일: {selectedFile.name}</p>
                                <p>크기: {(selectedFile.size / 1024 / 1024).toFixed(2)}MB</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!editingCategory && !selectedFile && (
                        <p className="text-sm text-gray-500">
                          JPG, PNG, GIF 형식의 이미지를 업로드하세요. (최대 5MB)
                        </p>
                      )}

                      {editingCategory && !selectedFile && (
                        <p className="text-sm text-gray-500">
                          새 이미지를 선택하지 않으면 기존 이미지가 유지됩니다.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="카테고리에 대한 설명을 입력하세요"
                      rows={3}
                      required
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                      취소
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Upload className="h-4 w-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        editingCategory ? '수정' : '추가'
                      )}
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
                  <TableHead>이미지</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>부제목</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>등록된 카테고리가 없습니다.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <img
                          src={category.image}
                          alt={category.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {category.title}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {category.subtitle}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm text-gray-600" title={category.description}>
                          {category.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(category.image, '_blank')}
                            title="이미지 원본 보기"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>
    </div>
  );
}