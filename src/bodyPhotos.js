import { supabase } from "./supabaseClient";
import { compressImage } from "./imageUtils";

const BUCKET = "body-photos";

export async function uploadBodyPhoto(userId, logDate, angle, file) {
  const blob = await compressImage(file, 1280, 0.7);
  const path = `${userId}/${logDate}/${angle}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function deleteBodyPhoto(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// `version` cache-busts the URL — the storage path is deterministic
// (overwritten on re-upload), so without a changing query param the
// browser would keep serving a stale cached copy after a replace.
export function bodyPhotoUrl(path, version) {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return version ? `${data.publicUrl}?v=${version}` : data.publicUrl;
}
