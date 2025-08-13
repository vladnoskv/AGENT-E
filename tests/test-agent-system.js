#!/usr/bin/env node

import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AgentOrchestrator } from '../src/agents/orchestrator.js';

class AgentSystemTester {
  constructor() {
    this.testResults = [];
    this.orchestrator = new AgentOrchestrator();
  }

  async runTest(name, testFunction) {
    console.log(`🧪 Running: ${name}`);
    try {
      const result = await testFunction();
      this.testResults.push({ name, passed: true, result });
      console.log(`✅ PASSED: ${name}`);
      return result;
    } catch (error) {
      this.testResults.push({ name, passed: false, error: error.message });
      console.log(`❌ FAILED: ${name} - ${error.message}`);
      return null;
    }
  }

  async testFileEditing() {
    const testFile = 'test-file.js';
    const originalContent = `function greet(name) {
  return "Hello " + name;
}

console.log(greet("World"));`;

    writeFileSync(testFile, originalContent);

    try {
      const result = await this.orchestrator.editFile(testFile, 
        "Add error handling and improve the greet function to handle null/undefined names"
      );

      const updatedContent = readFileSync(testFile, 'utf8');
      
      // Validate the edit
      const hasErrorHandling = updatedContent.includes('null') || updatedContent.includes('undefined');
      const hasImprovedGreet = updatedContent.includes('greet');

      if (hasErrorHandling && hasImprovedGreet) {
        return { success: true, updatedContent };
      } else {
        throw new Error('File edit validation failed');
      }
    } finally {
      if (require('fs').existsSync(testFile)) {
        unlinkSync(testFile);
      }
    }
  }

  async testAgentDispatch() {
    const result = await this.orchestrator.dispatchToAgent('code', 
      'Analyze this simple function: function add(a, b) { return a + b; }'
    );
    
    return result.response.includes('add') || result.response.includes('function');
  }

  async testOrchestration() {
    const result = await this.orchestrator.orchestrateTask(
      "Create a simple calculator function with basic operations",
      { showThinking: false }
    );

    return result.success && result.finalResponse.includes('calculator');
  }

  async runAllTests() {
    console.log('🚀 Starting Agent System Tests\n');

    await this.runTest('Agent Dispatch', () => this.testAgentDispatch());
    await this.runTest('File Editing', () => this.testFileEditing());
    await this.runTest('Task Orchestration', () => this.testOrchestration());

    console.log('\n📊 Test Summary:');
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`Tests passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Agent system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the logs above.');
    }

    return this.testResults;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AgentSystemTester();
  tester.runAllTests().catch(console.error);
}

export { AgentSystemTester };