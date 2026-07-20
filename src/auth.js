import { supabase } from "./supabaseClient";

const USERNAME_RE = /^[a-z0-9_.-]{3,20}$/;
const EMAIL_DOMAIN = "mealtracker@gmail.com";

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

async function lookupEmail(username) {
  const { data, error } = await supabase.rpc("get_email_for_username", {
    p_username: username,
  });
  if (error) throw error;
  return data || null;
}

export async function signUpWithUsername(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const existing = await lookupEmail(username);
  if (existing) throw new Error("That username is already taken.");

  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign up failed. Please try again.");

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, username });
  if (profileError) {
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
