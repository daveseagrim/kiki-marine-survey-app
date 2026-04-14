#!/usr/bin/env node
// ============================================================================
// run_tests.js — Minimal test runner for core pure functions
// ============================================================================
// Usage: node tests/run_tests.js
//
// HOW IT WORKS (plain English):
//   - Each .test.js file in this folder describes a batch of tests.
//   - A test says: "given this input, expect this output".
//   - This runner loads every .test.js file, runs each test, and prints PASS
//     or FAIL. If everything is green, you're safe to ship. If a previously
//     fixed bug comes back, the test that was written to prevent it will
//     fail loudly.
//
// No external dependencies — uses only Node's built-in require/console.
// ============================================================================

const fs = require('fs');
const path = require('path');

const TESTS_DIR = __dirname;

// Minimal assertion helpers — attached to global for tests to use directly
let passed = 0;
let failed = 0;
let currentSuite = '';
const failures = [];

global.describe = function (suiteName, fn) {
  currentSuite = suiteName;
  console.log(`\n\x1b[1m${suiteName}\x1b[0m`);
  fn();
};

global.it = function (testName, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } catch (err) {
    failed++;
    failures.push({ suite: currentSuite, name: testName, error: err });
    console.log(`  \x1b[31m✗\x1b[0m ${testName}`);
    console.log(`      ${err.message}`);
  }
};

global.assert = {
  equal(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(msg || `Expected ${e}, got ${a}`);
    }
  },
  truthy(value, msg) {
    if (!value) throw new Error(msg || `Expected truthy, got ${JSON.stringify(value)}`);
  },
  falsy(value, msg) {
    if (value) throw new Error(msg || `Expected falsy, got ${JSON.stringify(value)}`);
  },
  throws(fn, msg) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error(msg || 'Expected function to throw');
  },
  contains(haystack, needle, msg) {
    if (!haystack || haystack.indexOf(needle) === -1) {
      throw new Error(msg || `Expected "${haystack}" to contain "${needle}"`);
    }
  },
  notContains(haystack, needle, msg) {
    if (haystack && haystack.indexOf(needle) !== -1) {
      throw new Error(msg || `Expected "${haystack}" NOT to contain "${needle}"`);
    }
  },
  arrayLength(arr, expected, msg) {
    if (!Array.isArray(arr) || arr.length !== expected) {
      throw new Error(msg || `Expected array of length ${expected}, got length ${arr ? arr.length : 'null'}`);
    }
  }
};

// Discover and run every *.test.js file
const testFiles = fs.readdirSync(TESTS_DIR)
  .filter(f => f.endsWith('.test.js'))
  .sort();

if (testFiles.length === 0) {
  console.log('No test files found. Name test files like name.test.js');
  process.exit(1);
}

console.log(`\n\x1b[1m🧪 Running ${testFiles.length} test file(s)\x1b[0m`);

testFiles.forEach(f => {
  require(path.join(TESTS_DIR, f));
});

// Summary
console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log(`\x1b[32m✓ All ${passed} tests passed\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failed} failed\x1b[0m · \x1b[32m${passed} passed\x1b[0m`);
  console.log('\nFailures:');
  failures.forEach(f => {
    console.log(`  \x1b[31m✗\x1b[0m ${f.suite} → ${f.name}`);
    console.log(`      ${f.error.message}`);
  });
  process.exit(1);
}
