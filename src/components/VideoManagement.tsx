import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Edit, Trash2, Video, ExternalLink, Upload, Youtube, FileVideo, Info } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId?: string;
  videoUrl?: string;
  videoType: 'youtube' | 'local';
  duration: string;
  thumbnail: string;
  createdAt: string;
  updatedAt?: string;
}

interface Category {
  id: string;
  title: string;
}

interface VideoManagementProps {
  onStatsUpdate: () => void;
}

export function VideoManagement({ onStatsUpdate }: VideoManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<{ [categoryId: string]: Video[] }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeId: '',
    duration: '',
    videoType: 'youtube' as 'youtube' | 'local'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'youtube' | 'local'>('youtube');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadVideos(selectedCategory);
    }
  }, [selectedCategory]);

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
      
      if (data.categories && data.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to demo mode
      const mockCategories = [
        { id: 'fire', title: '화재발생 시 대응요령' },
        { id: 'safety', title: '지하철 안전운행' },
        { id: 'emergency', title: '응급상황 대응' }
      ];
      setCategories(mockCategories);
      if (!selectedCategory) {
        setSelectedCategory(mockCategories[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async (categoryId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${categoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(prev => ({
        ...prev,
        [categoryId]: data.videos || []
      }));
    } catch (error) {
      console.error('Error loading videos:', error);
      // Fallback to demo mode
      const mockVideos = {
        'fire': [
          {
            id: 'fire_1',
            title: '지하철 화재 발생 시 초기 대응',
            description: '지하철에서 화재가 발생했을 때 승무원이 취해야 할 초기 대응 방법을 학습합니다.',
            youtubeId: 'dQw4w9WgXcQ',
            videoType: 'youtube' as 'youtube' | 'local',
            duration: '5:30',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            createdAt: new Date().toISOString()
          }
        ],
        'safety': [
          {
            id: 'safety_1',
            title: '지하철 안전운행 기본 수칙',
            description: '지하철을 안전하게 운행하기 위한 기본적인 수칙과 절차를 학습합니다.',
            youtubeId: 'dQw4w9WgXcQ',
            videoType: 'youtube' as 'youtube' | 'local',
            duration: '8:20',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            createdAt: new Date().toISOString()
          }
        ],
        'emergency': []
      };
      
      setVideos(prev => ({
        ...prev,
        [categoryId]: mockVideos[categoryId] || []
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        alert('비디오 파일만 업로드 가능합니다.');
        return;
      }
      
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('파일 크기는 100MB를 초과할 수 없습니다.');
        return;
      }
      
      setSelectedFile(file);
      
      // Auto-detect duration using video element
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        const duration = Math.floor(video.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        setFormData(prev => ({
          ...prev,
          duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
        }));
        URL.revokeObjectURL(video.src);
      };
    }
  };

  const uploadVideoFile = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('video', file);
      formData.append('categoryId', selectedCategory);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/upload-video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.videoUrl;
      } else {
        throw new Error(data.error || '파일 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    // Validation
    if (uploadMethod === 'youtube' && !formData.youtubeId) {
      alert('YouTube URL 또는 ID를 입력해주세요.');
      return;
    }
    
    if (uploadMethod === 'local' && !selectedFile && !editingVideo) {
      alert('업로드할 비디오 파일을 선택해주세요.');
      return;
    }

    // Check if backend is configured
    if (projectId === 'placeholder-project-id' || publicAnonKey === 'placeholder-anon-key') {
      alert('데모 모드에서는 영상을 실제로 저장할 수 없습니다. 실제 배포 시 Supabase 설정이 필요합니다.');
      setIsDialogOpen(false);
      resetForm();
      return;
    }

    try {
      let videoUrl = '';
      
      // Upload video file if local type and file selected
      if (uploadMethod === 'local' && selectedFile) {
        videoUrl = await uploadVideoFile(selectedFile);
      }

      const url = editingVideo
        ? `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${selectedCategory}/${editingVideo.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos`;

      const method = editingVideo ? 'PUT' : 'POST';
      const body = {
        ...formData,
        videoType: uploadMethod,
        videoUrl: uploadMethod === 'local' ? videoUrl : undefined,
        categoryId: !editingVideo ? selectedCategory : undefined
      };

      // Remove empty youtube fields for local videos
      if (uploadMethod === 'local') {
        delete body.youtubeId;
      } else {
        delete body.videoUrl;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        await loadVideos(selectedCategory);
        onStatsUpdate();
        setIsDialogOpen(false);
        resetForm();
      } else {
        alert(data.error || '영상 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      alert('영상 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!selectedCategory) return;
    
    if (!confirm('정말로 이 영상을 삭제하시겠습니까?')) return;

    // Check if backend is configured
    if (projectId === 'placeholder-project-id' || publicAnonKey === 'placeholder-anon-key') {
      alert('데모 모드에서는 영상을 실제로 삭제할 수 없습니다.');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${selectedCategory}/${videoId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        await loadVideos(selectedCategory);
        onStatsUpdate();
      } else {
        alert(data.error || '영상 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('영상 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      youtubeId: video.youtubeId || '',
      duration: video.duration,
      videoType: video.videoType
    });
    setUploadMethod(video.videoType);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      description: '',
      youtubeId: '',
      duration: '',
      videoType: 'youtube'
    });
    setSelectedFile(null);
    setUploadMethod('youtube');
    setUploadProgress(0);
    setIsUploading(false);
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : url;
  };

  const formatDuration = (duration: string) => {
    // If it's already in MM:SS format, return as is
    if (duration.includes(':')) return duration;
    
    // If it's in seconds, convert to MM:SS
    const totalSeconds = parseInt(duration);
    if (!isNaN(totalSeconds)) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return duration;
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

  const currentVideos = selectedCategory ? videos[selectedCategory] || [] : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>영상 관리</CardTitle>
          <CardDescription>
            카테고리별 교육 영상을 추가, 수정, 삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Label htmlFor="category-select">카테고리:</Label>
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={!selectedCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 영상 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingVideo ? '영상 수정' : '새 영상 추가'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingVideo ? '영상 정보를 수정합니다.' : '새로운 교육 영상을 추가합니다.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">영상 제목</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="영상 제목을 입력하세요"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">영상 설명</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="영상에 대한 설명을 입력하세요"
                        rows={3}
                        required
                      />
                    </div>
                  </div>

                  {/* 업로드 방법 선택 */}
                  {!editingVideo && (
                    <div>
                      <Label>영상 업로드 방법</Label>
                      <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'youtube' | 'local')} className="mt-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="youtube" className="flex items-center gap-2">
                            <Youtube className="w-4 h-4" />
                            YouTube 링크
                          </TabsTrigger>
                          <TabsTrigger value="local" className="flex items-center gap-2">
                            <FileVideo className="w-4 h-4" />
                            파일 업로드
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="youtube" className="space-y-4 mt-4">
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              YouTube 영상 URL이나 비디오 ID를 입력하세요. 공개 또는 '링크로 공유 가능한' 영상만 재생 가능합니다.
                            </AlertDescription>
                          </Alert>
                          <div>
                            <Label htmlFor="youtubeId">YouTube 링크 또는 ID</Label>
                            <Input
                              id="youtubeId"
                              value={formData.youtubeId}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                youtubeId: extractYouTubeId(e.target.value)
                              }))}
                              placeholder="https://www.youtube.com/watch?v=VIDEO_ID 또는 VIDEO_ID"
                              required={uploadMethod === 'youtube'}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="local" className="space-y-4 mt-4">
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              MP4, MOV, AVI 등의 비디오 파일을 업로드하세요. 최대 파일 크기: 50MB
                            </AlertDescription>
                          </Alert>
                          <div>
                            <Label htmlFor="videoFile">비디오 파일</Label>
                            <Input
                              id="videoFile"
                              type="file"
                              accept="video/*"
                              onChange={handleFileSelect}
                              required={uploadMethod === 'local' && !editingVideo}
                              className="cursor-pointer"
                            />
                            {selectedFile && (
                              <div className="mt-2 p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                  <FileVideo className="w-4 h-4" />
                                  <span>{selectedFile.name}</span>
                                  <Badge variant="outline">
                                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* 수정 모드에서는 현재 타입만 표시 */}
                  {editingVideo && (
                    <div>
                      <Label>영상 타입</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          {editingVideo.videoType === 'youtube' ? (
                            <>
                              <Youtube className="w-4 h-4" />
                              <span>YouTube 영상</span>
                            </>
                          ) : (
                            <>
                              <FileVideo className="w-4 h-4" />
                              <span>업로드된 파일</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingVideo.videoType === 'youtube' && (
                        <div className="mt-4">
                          <Label htmlFor="youtubeId">YouTube 링크 또는 ID</Label>
                          <Input
                            id="youtubeId"
                            value={formData.youtubeId}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              youtubeId: extractYouTubeId(e.target.value)
                            }))}
                            placeholder="YouTube URL 또는 비디오 ID"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="duration">영상 길이</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="예: 10:30 또는 630 (초)"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      로컬 파일의 경우 자동으로 감지됩니다.
                    </p>
                  </div>

                  {/* 업로드 진행률 */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>파일 업로드 중...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                      취소
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        editingVideo ? '수정' : '추가'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {!selectedCategory ? (
            <div className="text-center py-12 text-gray-500">
              <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>카테고리를 선택해 주세요.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>썸네일</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>길이</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVideos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        등록된 영상이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentVideos.map(video => (
                      <TableRow key={video.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-16 h-9 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/120x68/f0f0f0/666?text=Video";
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate" title={video.title}>
                            {video.title}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm text-gray-600" title={video.description}>
                            {video.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {video.videoType === 'youtube' ? (
                              <>
                                <Youtube className="w-4 h-4 text-red-600" />
                                <span className="text-xs">YouTube</span>
                              </>
                            ) : (
                              <>
                                <FileVideo className="w-4 h-4 text-blue-600" />
                                <span className="text-xs">로컬</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatDuration(video.duration)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(video.createdAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {video.videoType === 'youtube' && video.youtubeId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtubeId}`, '_blank')}
                                title="YouTube에서 보기"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                            {video.videoType === 'local' && video.videoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.videoUrl, '_blank')}
                                title="영상 보기"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(video)}
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(video.id)}
                              className="text-red-600 hover:text-red-700"
                              title="삭제"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}