#!/usr/bin/env node
// Script to verify that each package.json has a corresponding package-lock.json

const fs = require('fs');
const path = require('path');

// Directories to check. Add any other directories containing package.json here.
const directories = ['frontend', 'netlify/functions'];

let missing = 0;

directories.forEach(dir => {
  const pkgPath = path.resolve(__dirname, '..', dir, 'package.json');
  const lockPath = path.resolve(__dirname, '..', dir, 'package-lock.json');

  if (fs.existsSync(pkgPath)) {
    if (fs.existsSync(lockPath)) {
      console.log(`✅ ${dir}/package-lock.json exists.`);
    } else {
      console.error(`❌ Missing lock file: ${dir}/package-lock.json`);
      missing++;
    }
  } else {
    console.warn(`⚠️ Skipping ${dir}: package.json not found.`);
  }
});

if (missing > 0) {
  console.error(`\n${missing} lock file(s) missing.`);
  process.exit(1);
} else {
  console.log('\nAll lock files present.');
  process.exit(0);
}