import { access, copyFile, rm } from "node:fs/promises";
import { BACKUP_FILE, LOCAL_FILE } from "./fixtures";

// Restore the app's working copy, or remove it if there was none before.
// If a run is killed before this, `npm run reset-data` goes back to the seed.
export default async function globalTeardown(): Promise<void> {
  const hadLocal = await access(BACKUP_FILE).then(
    () => true,
    () => false,
  );
  if (hadLocal) {
    await copyFile(BACKUP_FILE, LOCAL_FILE);
    await rm(BACKUP_FILE, { force: true });
  } else {
    await rm(LOCAL_FILE, { force: true });
  }
}
