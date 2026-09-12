import { getSession } from "@/lib/session";

export async function loadChromeSession() {
  try {
    return await getSession();
  } catch {
    return null;
  }
}
