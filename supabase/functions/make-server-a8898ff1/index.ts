// @ts-nocheck
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { bearerAuth } from "npm:hono/bearer-auth";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();

// CORS middleware
app.use("*", cors());

app.use("*", logger(console.log));

app.use(
  "*",
  bearerAuth({
    verifyToken: async (_token, _c) => {
      // Supabase Functions는 기본적으로 JWT 검증을 수행합니다.
      // 프런트엔드에서 public anon key를 Bearer 토큰으로 전달하면 통과합니다.
      return true;
    },
  }),
);

// Initialize Supabase client (Service Role for server-side operations)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Admin storage: single list under one key (migration from per-key admin_*)
const ADMINS_KEY = "admins_list";

async function getAdmins() {
  return (await kv.get(ADMINS_KEY)) || [];
}

async function setAdmins(list: any[]) {
  await kv.set(ADMINS_KEY, list);
}

async function migrateAdminsToList() {
  try {
    const current = await kv.get(ADMINS_KEY);
    if (Array.isArray(current) && current.length > 0) return;

    const oldAdmins = await kv.getByPrefix("admin_");
    if (Array.isArray(oldAdmins) && oldAdmins.length > 0) {
      await setAdmins(oldAdmins);
      console.log(`Migrated ${oldAdmins.length} admins into list`);
    }
  } catch (e) {
    console.warn("Admin migration warning:", e);
  }
}

async function initializeDefaultAdmin() {
  try {
    await migrateAdminsToList();
    const admins = await getAdmins();
    if (!admins || admins.length === 0) {
      const defaultAdmin = {
        id: "admin_001",
        name: "시스템 관리자",
        employeeId: "ADMIN001",
        password: "admin123!",
        isMainAdmin: true,
        createdAt: new Date().toISOString(),
      };
      await setAdmins([defaultAdmin]);
      console.log("Default admin initialized (list)");
    } else {
      console.log("Admins list already initialized");
    }
  } catch (error) {
    console.error("Error initializing default admin (list):", error);
  }
}

async function initializeDefaultData() {
  try {
    const categoriesData = await kv.get("education_categories");
    if (!categoriesData || (Array.isArray(categoriesData) && categoriesData.length === 0)) {
      const defaultCategories = [
        {
          id: "fire",
          title: "화재발생 시 대응요령",
          subtitle: "객실 화재 발생 시 승우원 행동요령",
          image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
          description: "지하철 화재 발생 시 대응 방법을 학습합니다.",
        },
        {
          id: "safety",
          title: "지하철 안전운행",
          subtitle: "안전한 지하철 운행을 위한 기본 수칙",
          image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
          description: "지하철 운행 안전 수칙과 주의사항을 학습합니다.",
        },
        {
          id: "emergency",
          title: "응급상황 대응",
          subtitle: "응급상황 발생 시 신속한 대응 방법",
          image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop",
          description: "응급상황 발생 시 대응 방법을 학습합니다.",
        },
      ];
      await kv.set("education_categories", defaultCategories);

      const fireVideos = [
        {
          id: "fire_1",
          title: "지하철 화재 발생 시 초기 대응",
          description: "지하철에서 화재가 발생했을 때 승무원이 취해야 할 초기 대응 방법에 대해 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "5:30",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
        {
          id: "fire_2",
          title: "승객 대피 유도 방법",
          description: "화재 발생 시 승객을 안전하게 대피시키는 방법과 유의사항을 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "7:15",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
        {
          id: "fire_3",
          title: "화재 진압 장비 사용법 (로컬 영상)",
          description: "지하철 내 화재 진압 장비의 올바른 사용 방법을 학습합니다.",
          videoUrl: "/demo-video.mp4",
          videoType: "local",
          duration: "6:45",
          thumbnail: "https://via.placeholder.com/480x270/ff6b6b/ffffff?text=Local+Video",
          createdAt: new Date().toISOString(),
        },
      ];
      await kv.set("videos_fire", fireVideos);

      const safetyVideos = [
        {
          id: "safety_1",
          title: "지하철 안전운행 기본 수칙",
          description: "지하철을 안전하게 운행하기 위한 기본적인 수칙과 절차를 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "8:20",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
      ];
      await kv.set("videos_safety", safetyVideos);

      console.log("Default categories and videos initialized");
    } else {
      console.log("Default categories and videos already exist");
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}

async function initializeVideoBucket() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }
    const bucketName = "make-a8898ff1-videos";
    const bucketExists = buckets?.some((bucket: any) => bucket.name === bucketName);
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, { public: false });
      if (error) console.error("Error creating video bucket:", error);
      else console.log("Video bucket created successfully");
    } else {
      console.log("Video bucket already exists");
    }
  } catch (error) {
    console.error("Error initializing video bucket:", error);
  }
}

async function initializeImageBucket() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }
    const bucketName = "make-a8898ff1-images";
    const bucketExists = buckets?.some((bucket: any) => bucket.name === bucketName);
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, { public: true });
      if (error) console.error("Error creating image bucket:", error);
      else console.log("Image bucket created successfully");
    } else {
      console.log("Image bucket already exists");
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, { public: true });
      if (updateError) console.warn("Could not set image bucket to public:", updateError);
      else console.log("Image bucket set to public");
    }
  } catch (error) {
    console.error("Error initializing image bucket:", error);
  }
}

// Initialize app on startup
console.log("Starting server initialization...");
(async () => {
  try {
    await initializeDefaultAdmin();
    await initializeDefaultData();
    await initializeVideoBucket();
    await initializeImageBucket();
    console.log("✓ Server initialization completed successfully");
  } catch (error) {
    console.error("✗ Server initialization failed:", error);
    console.log("Server will continue running but some features may not work");
  }
})();

// Image upload via server (uses service role to bypass RLS for writes)
app.post("/make-server-a8898ff1/images/upload", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);

    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return c.json({ error: "파일이 필요합니다." }, 400);
    if (file.size > 5 * 1024 * 1024) return c.json({ error: "파일 크기는 5MB를 초과할 수 없습니다." }, 400);
    if (!file.type.startsWith("image/")) return c.json({ error: "이미지 파일만 업로드 가능합니다." }, 400);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `category-${Date.now()}.${ext}`;
    const filePath = `categories/${fileName}`;
    const bucketName = "make-a8898ff1-images";

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Server upload error:", error);
      return c.json({ error: error.message }, 500);
    }
    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return c.json({ success: true, path: data?.path ?? filePath, publicUrl: publicData.publicUrl });
  } catch (error) {
    console.error("Upload endpoint error:", error);
    return c.json({ error: "이미지 업로드 중 오류가 발생했습니다." }, 500);
  }
});

// Admin authentication
app.post("/make-server-a8898ff1/admin/login", async (c: any) => {
  try {
    const { employeeId, password } = await c.req.json();
    await migrateAdminsToList();
    const admins = await getAdmins();
    const admin = admins.find((a: any) => a?.employeeId === employeeId && a?.password === password);
    if (!admin) return c.json({ error: "사번 또는 비밀번호가 올바르지 않습니다." }, 401);
    return c.json({ success: true, admin: { id: admin.id, name: admin.name, employeeId: admin.employeeId, isMainAdmin: admin.isMainAdmin } });
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json({ error: "로그인 중 오류가 발생했습니다." }, 500);
  }
});

// Get all admins
app.get("/make-server-a8898ff1/admin/list", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    await migrateAdminsToList();
    const admins = await getAdmins();
    return c.json({ admins });
  } catch (error) {
    console.error("Error getting admins:", error);
    return c.json({ error: "관리자 목록 조회 중 오류가 발생했습니다." }, 500);
  }
});

// Create admin
app.post("/make-server-a8898ff1/admin/create", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const body = await c.req.json();
    const admins = await getAdmins();
    admins.push({ ...body, id: body.id || `admin_${Date.now()}`, createdAt: new Date().toISOString() });
    await setAdmins(admins);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error creating admin:", error);
    return c.json({ error: "관리자 생성 중 오류가 발생했습니다." }, 500);
  }
});

// Update admin
app.put("/make-server-a8898ff1/admin/update/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const id = c.req.param("id");
    const body = await c.req.json();
    const admins = await getAdmins();
    const idx = admins.findIndex((a: any) => a.id === id);
    if (idx === -1) return c.json({ error: "관리자를 찾을 수 없습니다." }, 404);
    admins[idx] = { ...admins[idx], ...body };
    await setAdmins(admins);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating admin:", error);
    return c.json({ error: "관리자 수정 중 오류가 발생했습니다." }, 500);
  }
});

// Delete admin
app.delete("/make-server-a8898ff1/admin/delete/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const id = c.req.param("id");
    const admins = await getAdmins();
    const filtered = admins.filter((a: any) => a.id !== id);
    await setAdmins(filtered);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return c.json({ error: "관리자 삭제 중 오류가 발생했습니다." }, 500);
  }
});

// Categories CRUD
app.get("/make-server-a8898ff1/categories", async (_c: any) => {
  try {
    const categories = (await kv.get("education_categories")) || [];
    return new Response(JSON.stringify({ categories }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error getting categories:", error);
    return new Response(JSON.stringify({ error: "카테고리 조회 중 오류가 발생했습니다." }), { status: 500 });
  }
});

app.post("/make-server-a8898ff1/categories", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const body = await c.req.json();
    const categories = (await kv.get("education_categories")) || [];
    categories.push(body);
    await kv.set("education_categories", categories);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ error: "카테고리 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/categories/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const id = c.req.param("id");
    const update = await c.req.json();
    const categories = (await kv.get("education_categories")) || [];
    const idx = categories.findIndex((c: any) => c.id === id);
    if (idx === -1) return c.json({ error: "카테고리를 찾을 수 없습니다." }, 404);
    categories[idx] = { ...categories[idx], ...update };
    await kv.set("education_categories", categories);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json({ error: "카테고리 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/categories/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const id = c.req.param("id");
    const categories = (await kv.get("education_categories")) || [];
    const filtered = categories.filter((cat: any) => cat.id !== id);
    await kv.set("education_categories", filtered);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json({ error: "카테고리 삭제 중 오류가 발생했습니다." }, 500);
  }
});

// Videos by category
app.get("/make-server-a8898ff1/videos/:categoryId", async (c: any) => {
  try {
    const categoryId = c.req.param("categoryId");
    const videos = (await kv.get(`videos_${categoryId}`)) || [];
    return c.json({ videos });
  } catch (error) {
    console.error("Error getting videos:", error);
    return c.json({ error: "영상 목록 조회 중 오류가 발생했습니다." }, 500);
  }
});

// Upload local video (stores in storage, returns signed URL)
app.post("/make-server-a8898ff1/upload-video", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const formData = await c.req.formData();
    const file = formData.get("file");
    const categoryId = formData.get("categoryId") as string | null;
    if (!(file instanceof File)) return c.json({ error: "파일이 필요합니다." }, 400);
    if (!categoryId) return c.json({ error: "categoryId가 필요합니다." }, 400);

    const bucket = "make-a8898ff1-videos";
    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${categoryId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(filename, file, { cacheControl: "3600", upsert: false });
    if (error) return c.json({ error: error.message }, 500);

    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(filename, 60 * 60 * 24 * 7);
    return c.json({ success: true, url: signed?.signedUrl });
  } catch (error) {
    console.error("Error uploading video:", error);
    return c.json({ error: "영상 업로드 중 오류가 발생했습니다." }, 500);
  }
});

// User progress APIs
app.post("/make-server-a8898ff1/progress", async (c: any) => {
  try {
    const body = await c.req.json();
    const { userId, videoId, categoryId, progress, watchTime, userName, employeeId } = body;
    if (!userId || !videoId) return c.json({ error: "userId, videoId가 필요합니다." }, 400);
    const key = `progress_${userId}_${videoId}`;
    const nowIso = new Date().toISOString();
    const record = {
      userId,
      userName: userName || '',
      employeeId: employeeId || '',
      videoId,
      categoryId,
      progress, // percentage 0-100
      watchTime: typeof watchTime === 'number' ? watchTime : 0, // seconds
      lastWatched: nowIso,
      updatedAt: nowIso,
    } as const;
    await kv.set(key, record);
    return c.json(
      { success: true },
      200,
      {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      }
    );
  } catch (error) {
    console.error("Error setting progress:", error);
    return c.json({ error: "진행률 저장 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/progress/:userId", async (c: any) => {
  try {
    const userId = c.req.param("userId");
    const progressKeys = await kv.getByPrefix(`progress_${userId}_`);
    const progressData: any[] = [];
    for (const key of progressKeys) {
      const progress = await kv.get(key);
      if (progress) progressData.push(progress);
    }
    return c.json(
      { progress: progressData },
      200,
      {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      }
    );
  } catch (error) {
    console.error("Error getting progress:", error);
    return c.json({ error: "진행률 조회 중 오류가 발생했습니다." }, 500);
  }
});

// Get all user progress for admin
app.get("/make-server-a8898ff1/admin/progress", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "인증이 필요합니다." }, 401);
    const progressKeys = await kv.getByPrefix("progress_");
    const allProgress: any[] = [];
    for (const key of progressKeys) {
      const progress = await kv.get(key);
      if (progress) allProgress.push(progress);
    }
    return c.json(
      { progress: allProgress },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error getting all progress:", error);
    return c.json({ error: "전체 진행률 조회 중 오류가 발생했습니다." }, 500);
  }
});

// Get all users
app.get("/make-server-a8898ff1/users", async (c: any) => {
  try {
    const users = await kv.get("users_list") || [];
    return c.json(
      { users },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error getting users:", error);
    return c.json({ error: "사용자 목록 조회 중 오류가 발생했습니다." }, 500);
  }
});

// Create or update user
app.post("/make-server-a8898ff1/users", async (c: any) => {
  try {
    const { userId, name, employeeId, department } = await c.req.json();

    if (!userId || !name || !employeeId) {
      return c.json({ error: "사용자 ID, 이름, 사번은 필수입니다." }, 400);
    }

    const users = await kv.get("users_list") || [];
    const existingIndex = users.findIndex((u: any) => u.id === userId);

    const userData = {
      id: userId,
      name,
      employeeId,
      department: department || "",
      createdAt: existingIndex === -1 ? new Date().toISOString() : users[existingIndex].createdAt,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex === -1) {
      users.push(userData);
    } else {
      users[existingIndex] = userData;
    }

    await kv.set("users_list", users);

    return c.json(
      { success: true, user: userData },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return c.json({ error: "사용자 정보 저장 중 오류가 발생했습니다." }, 500);
  }
});

// Video Management Endpoints

// Create video
app.post("/make-server-a8898ff1/videos", async (c: any) => {
  try {
    const { categoryId, video } = await c.req.json();

    if (!categoryId || !video) {
      return c.json({ error: "카테고리 ID와 비디오 정보가 필요합니다." }, 400);
    }

    // Generate unique video ID
    const videoId = `${categoryId}_${Date.now()}`;
    const newVideo = {
      ...video,
      id: videoId,
      createdAt: new Date().toISOString(),
    };

    // Get existing videos for category
    const videosKey = `videos_${categoryId}`;
    const existingVideos = (await kv.get(videosKey)) || [];

    // Add new video
    existingVideos.push(newVideo);

    // Save updated videos list
    await kv.set(videosKey, existingVideos);

    return c.json(
      { success: true, video: newVideo },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error creating video:", error);
    return c.json({ error: "비디오 생성 중 오류가 발생했습니다." }, 500);
  }
});

// Update video
app.put("/make-server-a8898ff1/videos/:categoryId/:videoId", async (c: any) => {
  try {
    const categoryId = c.req.param("categoryId");
    const videoId = c.req.param("videoId");
    const updatedVideo = await c.req.json();

    const videosKey = `videos_${categoryId}`;
    const existingVideos = (await kv.get(videosKey)) || [];

    const videoIndex = existingVideos.findIndex((v: any) => v.id === videoId);
    if (videoIndex === -1) {
      return c.json({ error: "비디오를 찾을 수 없습니다." }, 404);
    }

    // Update video with new data
    existingVideos[videoIndex] = {
      ...existingVideos[videoIndex],
      ...updatedVideo,
      id: videoId,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(videosKey, existingVideos);

    return c.json(
      { success: true, video: existingVideos[videoIndex] },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error updating video:", error);
    return c.json({ error: "비디오 수정 중 오류가 발생했습니다." }, 500);
  }
});

// Delete video
app.delete("/make-server-a8898ff1/videos/:categoryId/:videoId", async (c: any) => {
  try {
    const categoryId = c.req.param("categoryId");
    const videoId = c.req.param("videoId");

    const videosKey = `videos_${categoryId}`;
    const existingVideos = (await kv.get(videosKey)) || [];

    const videoIndex = existingVideos.findIndex((v: any) => v.id === videoId);
    if (videoIndex === -1) {
      return c.json({ error: "비디오를 찾을 수 없습니다." }, 404);
    }

    // Remove video from array
    existingVideos.splice(videoIndex, 1);

    await kv.set(videosKey, existingVideos);

    return c.json(
      { success: true, message: "비디오가 삭제되었습니다." },
      200,
      { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" }
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return c.json({ error: "비디오 삭제 중 오류가 발생했습니다." }, 500);
  }
});

console.log("Server is ready to accept requests");
Deno.serve(app.fetch);
