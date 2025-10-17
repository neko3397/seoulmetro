// @ts-nocheck
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { bearerAuth } from "npm:hono/bearer-auth";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";
import {
  AUTHORIZED_EMPLOYEES,
  type AuthorizedEmployee,
} from "./authorized_employees.ts";

const app = new Hono();

// CORS middleware
app.use("*", cors());

app.use("*", logger(console.log));

app.use(
  "*",
  bearerAuth({
    verifyToken: async (token, c) => {
      // Implement your token verification logic here, e.g., using Supabase
      // const { data: { user }, error } = await supabase.auth.getUser(token);
      // return !error && user;
      return true; // Placeholder for demonstration
    },
  }),
);

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const AUTHORIZED_EMPLOYEES_KEY = "authorized_employees";
const USER_RECORD_PREFIX = "user_record_";

interface StoredUserRecord {
  id: string;
  employeeId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

const isAuthorizedEmployeeList = (
  value: unknown,
): value is AuthorizedEmployee[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as AuthorizedEmployee).employeeId === "string" &&
      typeof (item as AuthorizedEmployee).name === "string",
  );

const canonicalizeEmployeeId = (employeeId: string) =>
  employeeId.replace(/\D/g, "").trim();
const canonicalizeEmployeeName = (name: string) =>
  name.replace(/\s+/g, "").trim();

async function initializeAuthorizedEmployees() {
  try {
    const existing = await kv.get(AUTHORIZED_EMPLOYEES_KEY);
    if (isAuthorizedEmployeeList(existing)) {
      const existingSet = new Set(
        existing.map(
          (employee) =>
            `${canonicalizeEmployeeId(employee.employeeId)}:${canonicalizeEmployeeName(employee.name)}`,
        ),
      );
      const newSet = new Set(
        AUTHORIZED_EMPLOYEES.map(
          (employee) =>
            `${canonicalizeEmployeeId(employee.employeeId)}:${canonicalizeEmployeeName(employee.name)}`,
        ),
      );

      let isSame = existingSet.size === newSet.size;
      if (isSame) {
        for (const key of newSet) {
          if (!existingSet.has(key)) {
            isSame = false;
            break;
          }
        }
      }

      if (isSame) {
        console.log("Authorized employees already initialized");
        return;
      }
    }

    await kv.set(AUTHORIZED_EMPLOYEES_KEY, AUTHORIZED_EMPLOYEES);
    console.log(
      `Authorized employees synced (${AUTHORIZED_EMPLOYEES.length} records)`,
    );
  } catch (error) {
    console.error("Error initializing authorized employees:", error);
  }
}

async function getAuthorizedEmployees(): Promise<AuthorizedEmployee[]> {
  try {
    const stored = await kv.get(AUTHORIZED_EMPLOYEES_KEY);
    if (isAuthorizedEmployeeList(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to read authorized employees from KV:", error);
  }

  return AUTHORIZED_EMPLOYEES;
}

async function saveUserRecord(record: StoredUserRecord) {
  await kv.set(`${USER_RECORD_PREFIX}${record.employeeId}`, record);
}

async function getUserRecord(
  employeeId: string,
): Promise<StoredUserRecord | null> {
  const stored = await kv.get(`${USER_RECORD_PREFIX}${employeeId}`);
  return stored ?? null;
}

async function getAllUserRecords(): Promise<StoredUserRecord[]> {
  const records = await kv.getByPrefix(USER_RECORD_PREFIX);
  return (records || [])
    .filter(
      (record: unknown): record is StoredUserRecord =>
        !!record &&
        typeof record === "object" &&
        typeof (record as StoredUserRecord).id === "string" &&
        typeof (record as StoredUserRecord).employeeId === "string" &&
        typeof (record as StoredUserRecord).name === "string",
    )
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
}

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
    if (Array.isArray(current) && current.length > 0) {
      return; // already migrated/initialized
    }

    // Try to collect existing admins stored by old pattern (admin_*)
    const oldAdmins = await kv.getByPrefix("admin_"); // returns values
    if (Array.isArray(oldAdmins) && oldAdmins.length > 0) {
      await setAdmins(oldAdmins);
      console.log(`Migrated ${oldAdmins.length} admins into list`);
      return;
    }
  } catch (e) {
    console.warn("Admin migration warning:", e);
  }
}

// Initialize default admin into list if none exists
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
    // Continue execution even if this fails
  }
}

// Initialize default data from mock
async function initializeDefaultData() {
  try {
    const categoriesData = await kv.get("education_categories");
    if (
      !categoriesData ||
      (Array.isArray(categoriesData) &&
        categoriesData.length === 0)
    ) {
      const defaultCategories = [
        {
          id: "fire",
          title: "화재발생 시 대응요령",
          subtitle: "객실 화재 발생 시 승우원 행동요령",
          image:
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
          description:
            "지하철 화재 발생 시 대응 방법을 학습합니다.",
        },
        {
          id: "safety",
          title: "지하철 안전운행",
          subtitle: "안전한 지하철 운행을 위한 기본 수칙",
          image:
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
          description:
            "지하철 운행 안전 수칙과 주의사항을 학습합니다.",
        },
        {
          id: "emergency",
          title: "응급상황 대응",
          subtitle: "응급상황 발생 시 신속한 대응 방법",
          image:
            "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop",
          description:
            "응급상황 발생 시 대응 방법을 학습합니다.",
        },
      ];
      await kv.set("education_categories", defaultCategories);

      // Initialize some default videos
      const fireVideos = [
        {
          id: "fire_1",
          title: "지하철 화재 발생 시 초기 대응",
          description:
            "지하철에서 화재가 발생했을 때 승무원이 취해야 할 초기 대응 방법에 대해 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "5:30",
          thumbnail:
            "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
        {
          id: "fire_2",
          title: "승객 대피 유도 방법",
          description:
            "화재 발생 시 승객을 안전하게 대피시키는 방법과 유의사항을 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "7:15",
          thumbnail:
            "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
        {
          id: "fire_3",
          title: "화재 진압 장비 사용법 (로컬 영상)",
          description:
            "지하철 내 화재 진압 장비의 올바른 사용 방법을 학습합니다.",
          videoUrl: "/demo-video.mp4",
          videoType: "local",
          duration: "6:45",
          thumbnail:
            "https://via.placeholder.com/480x270/ff6b6b/ffffff?text=Local+Video",
          createdAt: new Date().toISOString(),
        },
      ];
      await kv.set("videos_fire", fireVideos);

      const safetyVideos = [
        {
          id: "safety_1",
          title: "지하철 안전운행 기본 수칙",
          description:
            "지하철을 안전하게 운행하기 위한 기본적인 수칙과 절차를 학습합니다.",
          youtubeId: "dQw4w9WgXcQ",
          videoType: "youtube",
          duration: "8:20",
          thumbnail:
            "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          createdAt: new Date().toISOString(),
        },
      ];
      await kv.set("videos_safety", safetyVideos);

      console.log("Default categories and videos initialized");
    } else {
      console.log(
        "Default categories and videos already exist",
      );
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
    // Continue execution even if this fails
  }
}

// Initialize video bucket
async function initializeVideoBucket() {
  try {
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }

    const bucketName = "make-a8898ff1-videos";
    const bucketExists = buckets?.some(
      (bucket: any) => bucket.name === bucketName,
    );

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(
        bucketName,
        {
          public: false,
        },
      );

      if (error) {
        console.error("Error creating video bucket:", error);
        // Continue execution even if bucket creation fails
      } else {
        console.log("Video bucket created successfully");
      }
    } else {
      console.log("Video bucket already exists");
    }
  } catch (error) {
    console.error("Error initializing video bucket:", error);
    // Continue execution even if this fails
  }
}

async function initializeImageBucket() {
  try {
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }

    const bucketName = "make-a8898ff1-images";
    const bucketExists = buckets?.some(
      (bucket: any) => bucket.name === bucketName,
    );

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(
        bucketName,
        {
          public: true,
        },
      );

      if (error) {
        console.error("Error creating image bucket:", error);
        // Continue execution even if bucket creation fails
      } else {
        console.log("Image bucket created successfully");
      }
    } else {
      console.log("Image bucket already exists");
      // Ensure bucket is public for serving images
      const { error: updateError } = await supabase.storage.updateBucket(
        bucketName,
        { public: true },
      );
      if (updateError) {
        console.warn("Could not set image bucket to public:", updateError);
      } else {
        console.log("Image bucket set to public");
      }
    }
  } catch (error) {
    console.error("Error initializing image bucket:", error);
    // Continue execution even if this fails
  }
}

// Initialize app on startup
console.log("Starting server initialization...");
(async () => {
  try {
    await initializeAuthorizedEmployees();
    await initializeDefaultAdmin();
    await initializeDefaultData();
    await initializeVideoBucket();
    await initializeImageBucket();
    console.log(
      "✓ Server initialization completed successfully",
    );
  } catch (error) {
    console.error("✗ Server initialization failed:", error);
    console.log(
      "Server will continue running but some features may not work",
    );
  }
})();

// Image upload via server (uses service role to bypass RLS for writes)
app.post("/make-server-a8898ff1/images/upload", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return c.json({ error: "파일이 필요합니다." }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "파일 크기는 5MB를 초과할 수 없습니다." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return c.json({ error: "이미지 파일만 업로드 가능합니다." }, 400);
    }

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

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
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

    // Ensure data is initialized/migrated
    await migrateAdminsToList();
    const admins = await getAdmins();
    const admin = admins.find(
      (a: any) => a?.employeeId === employeeId && a?.password === password,
    );

    if (!admin) {
      return c.json(
        { error: "사번 또는 비밀번호가 올바르지 않습니다." },
        401,
      );
    }

    return c.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        employeeId: admin.employeeId,
        isMainAdmin: admin.isMainAdmin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json(
      { error: "로그인 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Get all admins
app.get("/make-server-a8898ff1/admin/list", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    await migrateAdminsToList();
    const admins = await getAdmins();
    return c.json({ admins });
  } catch (error) {
    console.error("Error getting admins:", error);
    return c.json(
      { error: "관리자 목록 조회 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Create new admin
app.post("/make-server-a8898ff1/admin/create", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const { name, employeeId, password } = await c.req.json();

    await migrateAdminsToList();
    const admins = await getAdmins();
    if (admins.some((a: any) => a?.employeeId === employeeId)) {
      return c.json({ error: "이미 존재하는 사번입니다." }, 400);
    }

    const adminId = `admin_${Date.now()}`;
    const newAdmin = {
      id: adminId,
      name,
      employeeId,
      password,
      isMainAdmin: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...admins, newAdmin];
    await setAdmins(updated);

    return c.json({
      success: true,
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        employeeId: newAdmin.employeeId,
        isMainAdmin: newAdmin.isMainAdmin,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return c.json(
      { error: "관리자 생성 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Update admin
app.put("/make-server-a8898ff1/admin/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const adminId = c.req.param("id");
    const { name, employeeId, password } = await c.req.json();

    await migrateAdminsToList();
    const admins = await getAdmins();
    const idx = admins.findIndex((a: any) => a?.id === adminId);
    if (idx === -1) {
      return c.json({ error: "관리자를 찾을 수 없습니다." }, 404);
    }

    // Check unique employeeId
    if (
      employeeId &&
      admins.some(
        (a: any, i: number) => i !== idx && a?.employeeId === employeeId,
      )
    ) {
      return c.json({ error: "이미 존재하는 사번입니다." }, 400);
    }

    const existing = admins[idx];
    const updatedAdmin = {
      ...existing,
      name,
      employeeId,
      password,
      updatedAt: new Date().toISOString(),
    };
    const updated = [...admins];
    updated[idx] = updatedAdmin;
    await setAdmins(updated);

    return c.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        employeeId: updatedAdmin.employeeId,
        isMainAdmin: updatedAdmin.isMainAdmin,
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    return c.json(
      { error: "관리자 수정 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Delete admin
app.delete("/make-server-a8898ff1/admin/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const adminId = c.req.param("id");
    await migrateAdminsToList();
    const admins = await getAdmins();
    const admin = admins.find((a: any) => a?.id === adminId);
    if (!admin) {
      return c.json({ error: "관리자를 찾을 수 없습니다." }, 404);
    }
    if (admin.isMainAdmin) {
      return c.json({ error: "메인 관리자는 삭제할 수 없습니다." }, 400);
    }

    const updated = admins.filter((a: any) => a?.id !== adminId);
    await setAdmins(updated);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return c.json(
      { error: "관리자 삭제 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Validate user authorization
app.post("/make-server-a8898ff1/users/validate", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ success: false, error: "인증이 필요합니다." }, 401);
    }

    const { employeeId, name } = await c.req.json();

    if (!employeeId || !name) {
      return c.json(
        {
          success: false,
          error: "사번과 이름을 모두 입력해주세요.",
        },
        400,
      );
    }

    const normalizedEmployeeId = canonicalizeEmployeeId(employeeId);
    const normalizedEmployeeName = canonicalizeEmployeeName(name);

    if (!normalizedEmployeeId || !normalizedEmployeeName) {
      return c.json(
        {
          success: false,
          error: "사번 또는 이름 형식이 올바르지 않습니다.",
        },
        400,
      );
    }

    const authorizedEmployees = await getAuthorizedEmployees();
    const isAuthorized = authorizedEmployees.some(
      (employee) =>
        canonicalizeEmployeeId(employee.employeeId) ===
        normalizedEmployeeId &&
        canonicalizeEmployeeName(employee.name) ===
        normalizedEmployeeName,
    );

    return c.json({ success: isAuthorized });
  } catch (error) {
    console.error("Error validating employee authorization:", error);
    return c.json(
      {
        success: false,
        error: "사번 검증 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});

// Create or update user record
app.post("/make-server-a8898ff1/users", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const { userId, employeeId, name } = await c.req.json();

    if (!userId || !employeeId || !name) {
      return c.json(
        { error: "userId, 사번, 이름을 모두 전달해주세요." },
        400,
      );
    }

    const normalizedEmployeeId = canonicalizeEmployeeId(employeeId);
    const normalizedEmployeeName = canonicalizeEmployeeName(name);
    const displayName = name.trim();

    if (normalizedEmployeeId.length !== 8) {
      return c.json(
        { error: "사번은 8자리 숫자여야 합니다." },
        400,
      );
    }

    if (!displayName) {
      return c.json({ error: "이름을 입력해주세요." }, 400);
    }

    const authorizedEmployees = await getAuthorizedEmployees();
    const isAuthorized = authorizedEmployees.some(
      (employee) =>
        canonicalizeEmployeeId(employee.employeeId) ===
        normalizedEmployeeId &&
        canonicalizeEmployeeName(employee.name) ===
        normalizedEmployeeName,
    );

    if (!isAuthorized) {
      return c.json(
        { error: "승인된 사용자만 로그인할 수 있습니다." },
        403,
      );
    }

    const timestamp = new Date().toISOString();
    const existingRecord = await getUserRecord(normalizedEmployeeId);

    const storedRecord: StoredUserRecord = {
      id: existingRecord?.id ?? String(userId),
      employeeId: normalizedEmployeeId,
      name: displayName,
      createdAt: existingRecord?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
    };

    await saveUserRecord(storedRecord);

    return c.json({ success: true, user: storedRecord });
  } catch (error) {
    console.error("Error saving user record:", error);
    return c.json(
      { error: "사용자 정보를 저장하지 못했습니다." },
      500,
    );
  }
});

// List user records for admin dashboard
app.get("/make-server-a8898ff1/users", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const users = await getAllUserRecords();
    return c.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json(
      { error: "사용자 정보를 조회하지 못했습니다." },
      500,
    );
  }
});

// Get categories
app.get("/make-server-a8898ff1/categories", async (c: any) => {
  try {
    const categoriesData = await kv.get("education_categories");
    if (!categoriesData) {
      // Initialize default categories
      const defaultCategories = [
        {
          id: "cat_1",
          title: "지하철 안전교육",
          subtitle: "지하철 운행 및 승객 안전",
          image:
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
          description:
            "지하철 안전 운행을 위한 기초 교육 과정입니다.",
        },
        {
          id: "cat_2",
          title: "화재 안전교육",
          subtitle: "화재 예방 및 대응",
          image:
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
          description: "화재 예방과 긴급 상황 대응 교육입니다.",
        },
        {
          id: "cat_3",
          title: "응급처치교육",
          subtitle: "응급상황 대응",
          image:
            "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop",
          description:
            "응급상황 발생 시 대응 방법을 학습합니다.",
        },
      ];
      await kv.set("education_categories", defaultCategories);
      return c.json({ categories: defaultCategories });
    }

    return c.json({ categories: categoriesData });
  } catch (error) {
    console.error("Error getting categories:", error);
    return c.json(
      { error: "카테고리 조회 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Create category
app.post("/make-server-a8898ff1/categories", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const { title, subtitle, image, description } =
      await c.req.json();

    const categoriesData =
      (await kv.get("education_categories")) || [];
    const newCategory = {
      id: `cat_${Date.now()}`,
      title,
      subtitle,
      image,
      description,
    };

    categoriesData.push(newCategory);
    await kv.set("education_categories", categoriesData);

    return c.json({ success: true, category: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json(
      { error: "카테고리 생성 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Update category
app.put("/make-server-a8898ff1/categories/:id", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const categoryId = c.req.param("id");
    const { title, subtitle, image, description } =
      await c.req.json();

    const categoriesData =
      (await kv.get("education_categories")) || [];
    const categoryIndex = categoriesData.findIndex(
      (cat: any) => cat.id === categoryId,
    );

    if (categoryIndex === -1) {
      return c.json(
        { error: "카테고리를 찾을 수 없습니다." },
        404,
      );
    }

    categoriesData[categoryIndex] = {
      ...categoriesData[categoryIndex],
      title,
      subtitle,
      image,
      description,
    };

    await kv.set("education_categories", categoriesData);

    return c.json({
      success: true,
      category: categoriesData[categoryIndex],
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json(
      { error: "카테고리 수정 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Delete category
app.delete(
  "/make-server-a8898ff1/categories/:id",
  async (c: any) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "인증이 필요합니다." }, 401);
      }

      const categoryId = c.req.param("id");

      const categoriesData =
        (await kv.get("education_categories")) || [];
      const filteredCategories = categoriesData.filter(
        (cat: any) => cat.id !== categoryId,
      );

      if (filteredCategories.length === categoriesData.length) {
        return c.json(
          { error: "카테고리를 찾을 수 없습니다." },
          404,
        );
      }

      await kv.set("education_categories", filteredCategories);

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      return c.json(
        { error: "카테고리 삭제 중 오류가 발생했습니다." },
        500,
      );
    }
  },
);

// Get videos for category
app.get(
  "/make-server-a8898ff1/videos/:categoryId",
  async (c: any) => {
    try {
      const categoryId = c.req.param("categoryId");
      const videosData =
        (await kv.get(`videos_${categoryId}`)) || [];

      return c.json({ videos: videosData });
    } catch (error) {
      console.error("Error getting videos:", error);
      return c.json(
        { error: "영상 조회 중 오류가 발생했습니다." },
        500,
      );
    }
  },
);

// Upload video file
app.post("/make-server-a8898ff1/upload-video", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const formData = await c.req.formData();
    const videoFile = formData.get("video") as File;
    const categoryId = formData.get("categoryId") as string;

    if (!videoFile || !categoryId) {
      return c.json(
        { error: "비디오 파일과 카테고리 ID가 필요합니다." },
        400,
      );
    }

    // Check file size (max 100MB)
    if (videoFile.size > 100 * 1024 * 1024) {
      return c.json(
        { error: "파일 크기는 100MB를 초과할 수 없습니다." },
        400,
      );
    }

    // Check file type
    const allowedTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/webm",
    ];
    if (!allowedTypes.includes(videoFile.type)) {
      return c.json(
        { error: "지원되지 않는 파일 형식입니다." },
        400,
      );
    }

    const bucketName = "make-a8898ff1-videos";
    const fileName = `${categoryId}/${Date.now()}_${videoFile.name}`;

    // Convert File to ArrayBuffer
    const fileBuffer = await videoFile.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: videoFile.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return c.json(
        { error: "파일 업로드에 실패했습니다." },
        500,
      );
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return c.json(
        { error: "업로드된 파일 URL 생성에 실패했습니다." },
        500,
      );
    }

    return c.json({
      success: true,
      videoUrl: signedUrlData.signedUrl,
      fileName: data.path,
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    return c.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Create video
app.post("/make-server-a8898ff1/videos", async (c: any) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const {
      categoryId,
      title,
      description,
      youtubeId,
      videoUrl,
      videoType,
      duration,
    } = await c.req.json();

    const videosData =
      (await kv.get(`videos_${categoryId}`)) || [];
    const newVideo: any = {
      id: `video_${Date.now()}`,
      title,
      description,
      videoType: videoType || "youtube",
      duration,
      createdAt: new Date().toISOString(),
    };

    // Add type-specific fields
    if (videoType === "youtube" && youtubeId) {
      newVideo.youtubeId = youtubeId;
      newVideo.thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    } else if (videoType === "local" && videoUrl) {
      newVideo.videoUrl = videoUrl;
      newVideo.thumbnail =
        "https://via.placeholder.com/480x270/4f46e5/ffffff?text=Local+Video";
    } else {
      return c.json(
        { error: "영상 정보가 올바르지 않습니다." },
        400,
      );
    }

    videosData.push(newVideo);
    await kv.set(`videos_${categoryId}`, videosData);

    return c.json({ success: true, video: newVideo });
  } catch (error) {
    console.error("Error creating video:", error);
    return c.json(
      { error: "영상 생성 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Update video
app.put(
  "/make-server-a8898ff1/videos/:categoryId/:videoId",
  async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "인증이 필요합니다." }, 401);
      }

      const categoryId = c.req.param("categoryId");
      const videoId = c.req.param("videoId");
      const {
        title,
        description,
        youtubeId,
        videoUrl,
        videoType,
        duration,
      } = await c.req.json();

      const videosData =
        (await kv.get(`videos_${categoryId}`)) || [];
      const videoIndex = videosData.findIndex(
        (video) => video.id === videoId,
      );

      if (videoIndex === -1) {
        return c.json(
          { error: "영상을 찾을 수 없습니다." },
          404,
        );
      }

      const existingVideo = videosData[videoIndex];
      const updatedVideo = {
        ...existingVideo,
        title,
        description,
        duration,
        updatedAt: new Date().toISOString(),
      };

      // Update type-specific fields
      if (existingVideo.videoType === "youtube" && youtubeId) {
        updatedVideo.youtubeId = youtubeId;
        updatedVideo.thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      } else if (existingVideo.videoType === "local") {
        // For local videos, keep existing URL and thumbnail unless explicitly changed
        if (videoUrl) {
          updatedVideo.videoUrl = videoUrl;
        }
      }

      videosData[videoIndex] = updatedVideo;
      await kv.set(`videos_${categoryId}`, videosData);

      return c.json({ success: true, video: updatedVideo });
    } catch (error) {
      console.error("Error updating video:", error);
      return c.json(
        { error: "영상 수정 중 오류가 발생했습니다." },
        500,
      );
    }
  },
);

// Delete video
app.delete(
  "/make-server-a8898ff1/videos/:categoryId/:videoId",
  async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "인증이 필요합니다." }, 401);
      }

      const categoryId = c.req.param("categoryId");
      const videoId = c.req.param("videoId");

      const videosData =
        (await kv.get(`videos_${categoryId}`)) || [];
      const filteredVideos = videosData.filter(
        (video) => video.id !== videoId,
      );

      if (filteredVideos.length === videosData.length) {
        return c.json(
          { error: "영상을 찾을 수 없습니다." },
          404,
        );
      }

      await kv.set(`videos_${categoryId}`, filteredVideos);

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting video:", error);
      return c.json(
        { error: "영상 삭제 중 오류가 발생했습니다." },
        500,
      );
    }
  },
);

// Save user progress
app.post("/make-server-a8898ff1/progress", async (c) => {
  try {
    const { userId, videoId, categoryId, progress, watchTime } =
      await c.req.json();

    const progressKey = `progress_${userId}_${videoId}`;
    const progressData = {
      userId,
      videoId,
      categoryId,
      progress,
      watchTime,
      lastWatched: new Date().toISOString(),
    };

    await kv.set(progressKey, progressData);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    return c.json(
      { error: "진행률 저장 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Get user progress
app.get("/make-server-a8898ff1/progress/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const progressKeys = await kv.getByPrefix(
      `progress_${userId}_`,
    );
    const progressData = [];

    for (const key of progressKeys) {
      const progress = await kv.get(key);
      if (progress) {
        progressData.push(progress);
      }
    }

    return c.json({ progress: progressData });
  } catch (error) {
    console.error("Error getting progress:", error);
    return c.json(
      { error: "진행률 조회 중 오류가 발생했습니다." },
      500,
    );
  }
});

// Get all user progress for admin
app.get("/make-server-a8898ff1/admin/progress", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "인증이 필요합니다." }, 401);
    }

    const progressKeys = await kv.getByPrefix("progress_");
    const allProgress = [];

    for (const key of progressKeys) {
      const progress = await kv.get(key);
      if (progress) {
        allProgress.push(progress);
      }
    }

    return c.json({ progress: allProgress });
  } catch (error) {
    console.error("Error getting all progress:", error);
    return c.json(
      { error: "전체 진행률 조회 중 오류가 발생했습니다." },
      500,
    );
  }
});

console.log("Server is ready to accept requests");
Deno.serve(app.fetch);