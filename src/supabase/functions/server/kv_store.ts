// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

export interface KvEntry<T = any> {
  key: string;
  value: T;
}

const KV_TABLE = "kv_store_a8898ff1";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const isArray = (v: unknown): v is any[] => Array.isArray(v);
const nowIso = () => new Date().toISOString();

const normalizeEmployeeId = (employeeId: string) =>
  String(employeeId || "").replace(/\D/g, "").trim();

const parseUserRecordKey = (key: string) => {
  const m = /^user_record_(.+)$/.exec(key);
  return m ? m[1] : null;
};

const parseVideosKey = (key: string) => {
  const m = /^videos_(.+)$/.exec(key);
  return m ? m[1] : null;
};

const parseProgressKey = (key: string) => {
  const m = /^progress_(.+?)_(.+)$/.exec(key);
  return m ? { employeeId: m[1], videoId: m[2] } : null;
};

const parseAttendanceLogKey = (key: string) => {
  const m = /^attendance_log_(.+?)_(.+)$/.exec(key);
  return m ? { employeeId: m[1], suffix: m[2] } : null;
};

const legacyGet = async (key: string): Promise<any> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

const legacySet = async (key: string, value: any): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(KV_TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
};

const legacyDelete = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from(KV_TABLE).delete().eq("key", key);
  if (error) throw new Error(error.message);
};

const legacyGetByPrefix = async (prefix: string): Promise<KvEntry[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select("key, value")
    .like("key", `${prefix}%`);
  if (error) throw new Error(error.message);
  return data?.map((d) => ({ key: d.key, value: d.value })) ?? [];
};

const upsertAuthorizedEmployees = async (employees: any[]) => {
  const supabase = client();
  const rows = employees
    .map((e) => {
      const employeeId = normalizeEmployeeId(e?.employeeId);
      const name = String(e?.name || "").trim();
      if (!employeeId || !name) return null;
      return {
        employee_id: employeeId,
        name,
        normalized_name: name.replace(/\s+/g, "").trim(),
        is_active: true,
        updated_at: nowIso(),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("authorized_employees")
    .upsert(rows, { onConflict: "employee_id" });
  if (error) throw new Error(error.message);
};

const getAuthorizedEmployees = async (): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("authorized_employees")
    .select("employee_id, name")
    .eq("is_active", true)
    .order("employee_id", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({ employeeId: r.employee_id, name: r.name }));
};

const getAdminsList = async (): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("admins")
    .select("id, name, employee_id, password, is_main_admin, created_at, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((a) => ({
    id: a.id,
    name: a.name,
    employeeId: a.employee_id,
    password: a.password,
    isMainAdmin: a.is_main_admin,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));
};

const setAdminsList = async (list: any[]): Promise<void> => {
  const supabase = client();
  const incoming = (isArray(list) ? list : []).map((a) => ({
    id: String(a?.id || `admin_${Date.now()}`),
    name: String(a?.name || ""),
    employee_id: String(a?.employeeId || "").trim(),
    password: String(a?.password || ""),
    is_main_admin: Boolean(a?.isMainAdmin),
    is_active: true,
    created_at: a?.createdAt || nowIso(),
    updated_at: a?.updatedAt || nowIso(),
  })).filter((a) => a.employee_id);

  if (incoming.length > 0) {
    const { error } = await supabase
      .from("admins")
      .upsert(incoming, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("admins")
    .select("id")
    .eq("is_active", true);
  if (existingErr) throw new Error(existingErr.message);

  const keepIds = new Set(incoming.map((a) => a.id));
  for (const row of existing || []) {
    if (!keepIds.has(row.id)) {
      const { error } = await supabase
        .from("admins")
        .update({ is_active: false, updated_at: nowIso() })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }
};

const getCategories = async (): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("categories")
    .select("id, title, subtitle, image, description, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    image: c.image,
    description: c.description,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
};

const setCategories = async (categories: any[]): Promise<void> => {
  const supabase = client();
  const list = (isArray(categories) ? categories : []).map((c) => ({
    id: String(c?.id || `cat_${Date.now()}`),
    title: String(c?.title || ""),
    subtitle: c?.subtitle ? String(c.subtitle) : null,
    image: c?.image ? String(c.image) : null,
    description: c?.description ? String(c.description) : null,
    created_at: c?.createdAt || nowIso(),
    updated_at: nowIso(),
  }));

  if (list.length > 0) {
    const { error } = await supabase
      .from("categories")
      .upsert(list, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("categories")
    .select("id");
  if (existingErr) throw new Error(existingErr.message);

  const keepIds = new Set(list.map((c) => c.id));
  for (const row of existing || []) {
    if (!keepIds.has(row.id)) {
      const { error } = await supabase.from("categories").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }
};

const getVideosByCategory = async (categoryId: string): Promise<any[]> => {
  const supabase = client();
  const { data, error } = await supabase
    .from("videos")
    .select("id, category_id, title, description, youtube_id, video_url, video_type, duration, thumbnail, created_at, updated_at")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((v) => ({
    id: v.id,
    categoryId: v.category_id,
    title: v.title,
    description: v.description,
    youtubeId: v.youtube_id,
    videoUrl: v.video_url,
    videoType: v.video_type,
    duration: v.duration,
    thumbnail: v.thumbnail,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }));
};

const setVideosByCategory = async (categoryId: string, videos: any[]): Promise<void> => {
  const supabase = client();
  const list = (isArray(videos) ? videos : []).map((v) => ({
    id: String(v?.id || `video_${Date.now()}`),
    category_id: categoryId,
    title: String(v?.title || ""),
    description: v?.description ? String(v.description) : null,
    youtube_id: v?.youtubeId ? String(v.youtubeId) : null,
    video_url: v?.videoUrl ? String(v.videoUrl) : null,
    video_type: String(v?.videoType || "youtube"),
    duration: v?.duration ? String(v.duration) : null,
    thumbnail: v?.thumbnail ? String(v.thumbnail) : null,
    created_at: v?.createdAt || nowIso(),
    updated_at: nowIso(),
  }));

  if (list.length > 0) {
    const { error } = await supabase
      .from("videos")
      .upsert(list, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("videos")
    .select("id")
    .eq("category_id", categoryId);
  if (existingErr) throw new Error(existingErr.message);

  const keepIds = new Set(list.map((v) => v.id));
  for (const row of existing || []) {
    if (!keepIds.has(row.id)) {
      const { error } = await supabase.from("videos").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }
};

const upsertUserRecord = async (employeeId: string, value: any): Promise<void> => {
  const supabase = client();
  const id = String(value?.id || employeeId);
  const name = String(value?.name || "").trim();
  const now = nowIso();
  const row = {
    id,
    employee_id: employeeId,
    name,
    created_at: value?.createdAt || now,
    updated_at: value?.updatedAt || now,
    last_login_at: value?.lastLoginAt || now,
    attendance: Boolean(value?.attendance),
    attendance_dates: isArray(value?.attendanceDates) ? value.attendanceDates : [],
  };

  const { error } = await supabase.from("users").upsert(row, { onConflict: "employee_id" });
  if (error) throw new Error(error.message);

  if (isArray(value?.progress)) {
    const { error: delErr } = await supabase
      .from("user_video_progress")
      .delete()
      .eq("employee_id", employeeId);
    if (delErr) throw new Error(delErr.message);

    const progressRows = value.progress
      .filter((p: any) => p && p.videoId)
      .map((p: any) => ({
        employee_id: employeeId,
        video_id: String(p.videoId),
        category_id: p?.categoryId ? String(p.categoryId) : null,
        progress: Number(p?.progress || 0),
        watch_time: p?.watchTime == null ? null : Number(p.watchTime),
        last_watched: p?.lastWatched || now,
      }));

    if (progressRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("user_video_progress")
        .upsert(progressRows, { onConflict: "employee_id,video_id" });
      if (upsertErr) throw new Error(upsertErr.message);
    }
  }
};

const getUserRecord = async (employeeId: string): Promise<any | null> => {
  const supabase = client();
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, employee_id, name, created_at, updated_at, last_login_at, attendance, attendance_dates")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (userErr) throw new Error(userErr.message);
  if (!user) return null;

  const { data: progressRows, error: progressErr } = await supabase
    .from("user_video_progress")
    .select("video_id, category_id, progress, watch_time, last_watched")
    .eq("employee_id", employeeId)
    .order("last_watched", { ascending: false });

  if (progressErr) throw new Error(progressErr.message);

  return {
    id: user.id,
    employeeId: user.employee_id,
    name: user.name,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
    attendance: Boolean(user.attendance),
    attendanceDates: isArray(user.attendance_dates) ? user.attendance_dates : [],
    progress: (progressRows || []).map((p) => ({
      videoId: p.video_id,
      categoryId: p.category_id,
      progress: Number(p.progress || 0),
      watchTime: p.watch_time == null ? undefined : Number(p.watch_time),
      lastWatched: p.last_watched,
    })),
  };
};

const getAllUserRecords = async (): Promise<KvEntry[]> => {
  const supabase = client();
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, employee_id, name, created_at, updated_at, last_login_at, attendance, attendance_dates")
    .order("employee_id", { ascending: true });

  if (usersErr) throw new Error(usersErr.message);

  const { data: progressRows, error: progressErr } = await supabase
    .from("user_video_progress")
    .select("employee_id, video_id, category_id, progress, watch_time, last_watched");
  if (progressErr) throw new Error(progressErr.message);

  const byEmployee = new Map<string, any[]>();
  for (const p of progressRows || []) {
    if (!byEmployee.has(p.employee_id)) byEmployee.set(p.employee_id, []);
    byEmployee.get(p.employee_id).push({
      videoId: p.video_id,
      categoryId: p.category_id,
      progress: Number(p.progress || 0),
      watchTime: p.watch_time == null ? undefined : Number(p.watch_time),
      lastWatched: p.last_watched,
    });
  }

  return (users || []).map((u) => ({
    key: `user_record_${u.employee_id}`,
    value: {
      id: u.id,
      employeeId: u.employee_id,
      name: u.name,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      lastLoginAt: u.last_login_at,
      attendance: Boolean(u.attendance),
      attendanceDates: isArray(u.attendance_dates) ? u.attendance_dates : [],
      progress: byEmployee.get(u.employee_id) || [],
    },
  }));
};

const upsertProgressByKey = async (key: string, value: any): Promise<void> => {
  const parsed = parseProgressKey(key);
  if (!parsed) {
    await legacySet(key, value);
    return;
  }

  const employeeId = String(value?.employeeId || value?.id || parsed.employeeId).trim();
  const videoId = String(value?.videoId || parsed.videoId).trim();
  if (!employeeId || !videoId) return;

  const supabase = client();
  const row = {
    employee_id: employeeId,
    video_id: videoId,
    category_id: value?.categoryId ? String(value.categoryId) : null,
    progress: Number(value?.progress || 0),
    watch_time: value?.watchTime == null ? null : Number(value.watchTime),
    last_watched: value?.lastWatched || nowIso(),
    user_name: value?.userName ? String(value.userName) : null,
  };

  const { error } = await supabase
    .from("user_video_progress")
    .upsert(row, { onConflict: "employee_id,video_id" });
  if (error) throw new Error(error.message);
};

const getProgressByPrefix = async (prefix: string): Promise<KvEntry[]> => {
  const supabase = client();
  let query = supabase
    .from("user_video_progress")
    .select("employee_id, video_id, category_id, progress, watch_time, last_watched, user_name");

  if (prefix !== "progress_") {
    const sub = /^progress_(.+)_$/.exec(prefix);
    if (sub?.[1]) {
      query = query.eq("employee_id", sub[1]);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((p) => ({
    key: `progress_${p.employee_id}_${p.video_id}`,
    value: {
      id: p.employee_id,
      employeeId: p.employee_id,
      userName: p.user_name,
      videoId: p.video_id,
      categoryId: p.category_id,
      progress: Number(p.progress || 0),
      watchTime: p.watch_time == null ? undefined : Number(p.watch_time),
      lastWatched: p.last_watched,
    },
  }));
};

const upsertAttendanceLogByKey = async (key: string, value: any): Promise<void> => {
  const parsed = parseAttendanceLogKey(key);
  if (!parsed) {
    await legacySet(key, value);
    return;
  }

  const supabase = client();
  const timestamp = value?.timestamp || nowIso();
  const row = {
    key,
    employee_id: String(value?.employeeId || parsed.employeeId),
    timestamp,
    payload: value || {},
    created_at: nowIso(),
  };

  const { error } = await supabase
    .from("attendance_logs")
    .upsert(row, { onConflict: "key" });
  if (error) throw new Error(error.message);
};

const getAttendanceLogsByPrefix = async (prefix: string): Promise<KvEntry[]> => {
  const supabase = client();
  const sub = /^attendance_log_(.+)_/.exec(prefix);
  let query = supabase
    .from("attendance_logs")
    .select("key, employee_id, timestamp, payload")
    .order("timestamp", { ascending: false });

  if (sub?.[1]) query = query.eq("employee_id", sub[1]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((r) => ({
    key: r.key,
    value: r.payload || {
      employeeId: r.employee_id,
      timestamp: r.timestamp,
    },
  }));
};

export const set = async (key: string, value: any): Promise<void> => {
  if (key === "authorized_employees") return upsertAuthorizedEmployees(value);
  if (key === "admins_list") return setAdminsList(value);
  if (key === "education_categories") return setCategories(value);

  const userEmployeeId = parseUserRecordKey(key);
  if (userEmployeeId) return upsertUserRecord(userEmployeeId, value);

  const videosCategoryId = parseVideosKey(key);
  if (videosCategoryId) return setVideosByCategory(videosCategoryId, value);

  if (parseProgressKey(key)) return upsertProgressByKey(key, value);
  if (parseAttendanceLogKey(key)) return upsertAttendanceLogByKey(key, value);

  return legacySet(key, value);
};

export const get = async (key: string): Promise<any> => {
  if (key === "authorized_employees") {
    const rows = await getAuthorizedEmployees();
    if (rows.length > 0) return rows;
    const legacy = await legacyGet(key);
    if (legacy) {
      await upsertAuthorizedEmployees(legacy);
      return legacy;
    }
    return undefined;
  }

  if (key === "admins_list") {
    const admins = await getAdminsList();
    if (admins.length > 0) return admins;
    const legacy = await legacyGet(key);
    if (legacy) {
      await setAdminsList(legacy);
      return legacy;
    }
    return [];
  }

  if (key === "education_categories") {
    const categories = await getCategories();
    if (categories.length > 0) return categories;
    const legacy = await legacyGet(key);
    if (legacy) {
      await setCategories(legacy);
      return legacy;
    }
    return undefined;
  }

  const userEmployeeId = parseUserRecordKey(key);
  if (userEmployeeId) {
    const record = await getUserRecord(userEmployeeId);
    if (record) return record;
    const legacy = await legacyGet(key);
    if (legacy) {
      await upsertUserRecord(userEmployeeId, legacy);
      return legacy;
    }
    return null;
  }

  const videosCategoryId = parseVideosKey(key);
  if (videosCategoryId) {
    const videos = await getVideosByCategory(videosCategoryId);
    if (videos.length > 0) return videos;
    const legacy = await legacyGet(key);
    if (legacy) {
      await setVideosByCategory(videosCategoryId, legacy);
      return legacy;
    }
    return [];
  }

  if (parseProgressKey(key)) {
    const entries = await getProgressByPrefix(`${key}_`);
    if (entries.length > 0) return entries[0]?.value;
    const legacy = await legacyGet(key);
    if (legacy) {
      await upsertProgressByKey(key, legacy);
      return legacy;
    }
    return undefined;
  }

  if (parseAttendanceLogKey(key)) {
    const supabase = client();
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("payload")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.payload) return data.payload;

    const legacy = await legacyGet(key);
    if (legacy) {
      await upsertAttendanceLogByKey(key, legacy);
      return legacy;
    }
    return undefined;
  }

  return legacyGet(key);
};

export const del = async (key: string): Promise<void> => {
  const userEmployeeId = parseUserRecordKey(key);
  if (userEmployeeId) {
    const supabase = client();
    const { error: pErr } = await supabase
      .from("user_video_progress")
      .delete()
      .eq("employee_id", userEmployeeId);
    if (pErr) throw new Error(pErr.message);

    const { error } = await supabase.from("users").delete().eq("employee_id", userEmployeeId);
    if (error) throw new Error(error.message);
    return;
  }

  const progress = parseProgressKey(key);
  if (progress) {
    const supabase = client();
    const { error } = await supabase
      .from("user_video_progress")
      .delete()
      .eq("employee_id", progress.employeeId)
      .eq("video_id", progress.videoId);
    if (error) throw new Error(error.message);
    return;
  }

  if (parseAttendanceLogKey(key)) {
    const supabase = client();
    const { error } = await supabase.from("attendance_logs").delete().eq("key", key);
    if (error) throw new Error(error.message);
    return;
  }

  return legacyDelete(key);
};

export const mset = async (keys: string[], values: any[]): Promise<void> => {
  for (let i = 0; i < keys.length; i++) {
    await set(keys[i], values[i]);
  }
};

export const mget = async (keys: string[]): Promise<any[]> => {
  const out: any[] = [];
  for (const key of keys) {
    out.push(await get(key));
  }
  return out;
};

export const mdel = async (keys: string[]): Promise<void> => {
  for (const key of keys) {
    await del(key);
  }
};

export const getByPrefix = async (prefix: string): Promise<KvEntry[]> => {
  if (prefix === "user_record_") {
    const rows = await getAllUserRecords();
    if (rows.length > 0) return rows;
  }

  if (prefix.startsWith("progress_")) {
    const rows = await getProgressByPrefix(prefix);
    if (rows.length > 0) return rows;
  }

  if (prefix.startsWith("attendance_log_")) {
    const rows = await getAttendanceLogsByPrefix(prefix);
    if (rows.length > 0) return rows;
  }

  if (prefix.startsWith("videos_")) {
    const categoryId = prefix.replace(/^videos_/, "").replace(/%$/, "").trim();
    if (categoryId && !categoryId.includes("_")) {
      const videos = await getVideosByCategory(categoryId);
      if (videos.length > 0) return [{ key: `videos_${categoryId}`, value: videos }];
    }
  }

  return legacyGetByPrefix(prefix);
};

export const migrateLegacyKvToRelational = async (): Promise<{ migrated: number; skipped: number }> => {
  let migrated = 0;
  let skipped = 0;

  const singleKeys = ["authorized_employees", "admins_list", "education_categories"];
  for (const key of singleKeys) {
    try {
      const value = await legacyGet(key);
      if (value !== null && value !== undefined) {
        await set(key, value);
        migrated++;
      }
    } catch (e) {
      console.warn(`Migration failed for key ${key}:`, e);
      skipped++;
    }
  }

  const prefixes = ["user_record_", "videos_", "progress_", "attendance_log_"];
  for (const prefix of prefixes) {
    try {
      const entries = await legacyGetByPrefix(prefix);
      for (const entry of entries) {
        try {
          await set(entry.key, entry.value);
          migrated++;
        } catch (e) {
          console.warn(`Migration failed for key ${entry.key}:`, e);
          skipped++;
        }
      }
    } catch (e) {
      console.warn(`Migration scan failed for prefix ${prefix}:`, e);
      skipped++;
    }
  }

  return { migrated, skipped };
};
