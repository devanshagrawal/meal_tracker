import { supabase } from "./supabaseClient";

const USERNAME_RE = /^[a-z0-9_.-]{3,20}$/;
const EMAIL_DOMAIN = "mealtracker@gmail.com";

export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
export const CITY_OPTIONS = ["Delhi-NCR", "Bangalore"];

function normalizeUsername(raw) {
  return raw.trim().toLowerCase();
}

function usernameToEmail(username) {
  return `${username}.${EMAIL_DOMAIN}`;
}

export function validateUsername(raw) {
  const username = normalizeUsername(raw);
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3-20 characters: lowercase letters, numbers, dot, underscore, or hyphen.";
  }
  return null;
}

export function validatePassword(password) {
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
}

export function validateProfile({ firstName, lastName, age, gender, city }) {
  if (!firstName.trim()) return "First name is required.";
  if (!lastName.trim()) return "Last name is required.";
  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum <= 0 || ageNum >= 120) {
    return "Enter a valid age.";
  }
  if (!GENDER_OPTIONS.includes(gender)) return "Select a gender.";
  if (!CITY_OPTIONS.includes(city)) return "Select a city.";
  return null;
}

async function lookupEmail(username) {
  const { data, error } = await supabase.rpc("get_email_for_username", {
    p_username: username,
  });
  if (error) throw error;
  return data || null;
}

export async function signUpWithUsername(rawUsername, password, profile) {
  const username = normalizeUsername(rawUsername);
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const profileError = validateProfile(profile);
  if (profileError) throw new Error(profileError);

  const existing = await lookupEmail(username);
  if (existing) throw new Error("That username is already taken.");

  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign up failed. Please try again.");

  const { error: insertError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username,
    first_name: profile.firstName.trim(),
    last_name: profile.lastName.trim(),
    age: Number(profile.age),
    gender: profile.gender,
    city: profile.city,
  });
  if (insertError) {
    throw new Error(
      "Account created but profile setup failed. Try logging in, or contact support."
    );
  }

  return data;
}

export async function signInWithUsername(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  const email = await lookupEmail(username);
  if (!email) throw new Error("No account found with that username.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error("Incorrect username or password.");
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Always resolves (never throws) — the backend intentionally returns a
// generic message regardless of whether the username/recovery-email
// exists, to avoid revealing account details to an attacker.
export async function requestPasswordReset(rawUsername) {
  const username = normalizeUsername(rawUsername);
  await supabase.functions.invoke("request-password-reset", { body: { username } });
}

export async function confirmPasswordReset(token, newPassword) {
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);

  const { data, error } = await supabase.functions.invoke("confirm-password-reset", {
    body: { token, newPassword },
  });
  if (error) throw new Error("This reset link is invalid or has expired.");
  if (data?.error) throw new Error(data.error);
  return data;
}
