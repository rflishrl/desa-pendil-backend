// Creates or updates an admin account in Supabase Auth with app_metadata.role = "admin".
// Passwords are read interactively without echoing to protect terminal history.
//
// Requires in .env.local: SUPABASE_URL, SUPABASE_SECRET_KEY.
// Usage: npm run create-admin -- admin@desapendil.id
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const email = process.argv[2]?.trim().toLowerCase();

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Isi SUPABASE_URL dan SUPABASE_SECRET_KEY di .env.local.");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Pemakaian: npm run create-admin -- admin@domain.com");
  process.exit(1);
}

/** Reads a line from the terminal without displaying input. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    let muted = false;
    rl._writeToOutput = (text) => {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

const password = await askHidden(
  `Password untuk ${email} (minimal 8 karakter): `,
);
if (password.length < 8) {
  console.error("Password minimal 8 karakter.");
  process.exit(1);
}
const again = await askHidden("Ulangi password: ");
if (again !== password) {
  console.error("Password tidak sama.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "admin" },
});

if (!error) {
  console.log(`Admin dibuat: ${created.user.email}`);
  process.exit(0);
}

// User exists: update password and assign admin role.
if (error.code !== "email_exists") {
  console.error("Gagal membuat admin:", error.message);
  process.exit(1);
}

let existing;
for (let page = 1; !existing; page += 1) {
  const { data, error: listError } = await supabase.auth.admin.listUsers({
    page,
    perPage: 200,
  });
  if (listError) {
    console.error("Gagal mencari user:", listError.message);
    process.exit(1);
  }
  existing = data.users.find((user) => user.email?.toLowerCase() === email);
  if (data.users.length < 200) break;
}
if (!existing) {
  console.error("Email terdaftar tapi user tidak ditemukan.");
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(
  existing.id,
  {
    password,
    app_metadata: { ...existing.app_metadata, role: "admin" },
  },
);
if (updateError) {
  console.error("Gagal memperbarui admin:", updateError.message);
  process.exit(1);
}
console.log(`Admin diperbarui: ${email}`);
