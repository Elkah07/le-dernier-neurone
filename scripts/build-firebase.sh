#!/usr/bin/env bash
set -euo pipefail

rm -rf out dist
npx next build
mv out dist
cp public/sw.js dist/sw.js
node --test tests/question-bank.test.mjs tests/rendered-html.test.mjs
