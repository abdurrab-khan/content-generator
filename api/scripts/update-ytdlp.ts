/**
 * Update the pinned yt-dlp binary in place (`yt-dlp -U`). YouTube rotates
 * player requirements regularly — when downloads suddenly fail with HTTP
 * 403 while metadata still works, a stale binary is the prime suspect.
 *
 *   pnpm tools:update-ytdlp
 */
import 'dotenv/config';
import { execa } from 'execa';

async function main(): Promise<void> {
  const binary = process.env.YTDLP_PATH ?? 'yt-dlp';
  const { stdout, stderr } = await execa(binary, ['-U']);
  const output = [stdout, stderr].filter(Boolean).join('\n').trim();
  console.log(output || 'yt-dlp is already up to date.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
