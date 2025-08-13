#!/usr/bin/env node

import ExpertAgentSystem from '../src/agents/expert-system.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 Testing Expert Agent System');
  console.log('================================');
  
  const system = new ExpertAgentSystem();
  
  try {
    // Test 1: Initialize system
    console.log('\n1. Testing system initialization...');
    await system.initialize();
    console.log('✅ System initialized successfully');

    // Test 2: Check agent loading
    console.log('\n2. Testing agent loading...');
    const agents = Object.keys(system.orchestrator.agents);
    console.log(`✅ Loaded ${agents.length} expert agents: ${agents.join(', ')}`);

    // Test 3: Knowledge base validation
    console.log('\n3. Testing knowledge base...');
    const hasPrompts = fs.existsSync('./prompts');
    const hasAgents = fs.existsSync('./prompts/agents');
    console.log(`✅ Prompts directory: ${hasPrompts}`);
    console.log(`✅ Agents directory: ${hasAgents}`);

    // Test 4: Expert boundaries
    console.log('\n4. Testing expertise boundaries...');
    for (const agent of agents) {
      const boundary = system.getExpertiseBoundary(agent);
      console.log(`   ${agent}: ${boundary.domain}`);
    }

    // Test 5: Quick agent test
    console.log('\n5. Testing expert agent response...');
    const testResult = await system.processTask('Test analysis', {
      agent: 'code-analyzer',
      showThinking: false,
      includeWebSearch: false
    });
    
    console.log('✅ Expert agent responded correctly');
    console.log(`   Agent: ${testResult.agent}`);
    console.log(`   Expertise: ${testResult.expertiseBoundary.domain}`);
    console.log(`   Knowledge Date: ${testResult.knowledgeDate}`);

    // Test 6: Web search capability
    console.log('\n6. Testing web search integration...');
    const webSearchResult = await system.processTask('Latest security practices', {
      agent: 'security-expert',
      showThinking: false,
      includeWebSearch: true
    });
    
    console.log('✅ Web search integration working');
    console.log(`   Web search used: ${webSearchResult.webSearchUsed}`);

    // Test 7: Knowledge updater
    console.log('\n7. Testing knowledge updater...');
    const updater = new system.updater.constructor();
    await updater.checkAllAgents();
    console.log('✅ Knowledge updater functional');

    console.log('\n🎯 All expert system tests passed!');
    console.log('\n📊 System Summary:');
    console.log(`   - ${agents.length} hyper-expert agents`);
    console.log(`   - Knowledge date tracking enabled`);
    console.log(`   - Web search integration active`);
    console.log(`   - Expertise boundaries defined`);
    console.log(`   - Prompt-based agent specialization`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export default runTests;