#!/usr/bin/env node

import KnowledgeUpdater from './knowledge-updater.js';

async function main() {
  console.log('🔄 Starting knowledge update process...');
  const updater = new KnowledgeUpdater();
  await updater.checkAllAgents();
}

main().catch(console.error);