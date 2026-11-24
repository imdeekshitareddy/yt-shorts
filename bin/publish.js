#!/usr/bin/env node
// CLI Entrypoint to publish rendered Faceless Shorts to YouTube & Instagram
import { UnifiedPublisher } from '../src/publish/index.js';
import { YouTubePublisher } from '../src/publish/youtube.js';
import { InstagramPublisher } from '../src/publish/instagram.js';

function printHelp() {
  console.log(`
Faceless Shorts Multi-Platform Publisher CLI

Usage:
  node bin/publish.js [options]

Options:
  --id <ID>           Publish rendered video for specified narrative ID
  --all               Publish all ready narratives in ~/faceless-shorts/
  --youtube-only      Publish strictly to YouTube Shorts
  --instagram-only    Publish strictly to Instagram Reels
  --dry-run           Simulate upload and print expected endpoints without uploading
  --status            Check current publishing credentials configuration in .env
  --help              Display this help message

Examples:
  node bin/publish.js --status
  node bin/publish.js --id DREAM-004 --dry-run
  node bin/publish.js --id DREAM-004
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--status')) {
    const yt = new YouTubePublisher();
    const ig = new InstagramPublisher();

    console.log('=== Publishing Configuration Status ===');
    console.log(`YouTube Client ID:     ${yt.clientId ? 'CONFIGURED' : '[MISSING]'}`);
    console.log(`YouTube Refresh Token: ${yt.refreshToken ? 'CONFIGURED' : '[MISSING]'}`);
    console.log(`YouTube Ready:         ${yt.isConfigured() ? 'YES' : 'NO'}`);
    console.log('----------------------------------------');
    console.log(`Instagram Account ID:   ${ig.accountId ? 'CONFIGURED' : '[MISSING]'}`);
    console.log(`Instagram Access Token: ${ig.accessToken ? 'CONFIGURED' : '[MISSING]'}`);
    console.log(`Instagram Ready:        ${ig.isConfigured() ? 'YES' : 'NO'}`);
    return;
  }

  const idIdx = args.indexOf('--id');
  const id = idIdx !== -1 ? args[idIdx + 1] : null;

  if (!id) {
    console.error('Error: Please specify narrative ID with --id <ID>.');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const skipYouTube = args.includes('--instagram-only');
  const skipInstagram = args.includes('--youtube-only');

  const publisher = new UnifiedPublisher();

  console.log(`Publishing short for ${id} (dryRun: ${dryRun})...`);
  const result = await publisher.publishNarrative(id, {
    dryRun,
    skipYouTube,
    skipInstagram
  });

  console.log('\nPublishing Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.errors && result.errors.length > 0) {
    console.log('\nWarning: Some publishing operations encountered errors.');
    process.exit(1);
  } else {
    console.log('\nAll publishing tasks completed successfully!');
  }
}

main().catch((err) => {
  console.error('\n[FATAL PUBLISHING ERROR]', err.message);
  process.exit(1);
});
