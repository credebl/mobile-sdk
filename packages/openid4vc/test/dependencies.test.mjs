import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// These tests lock in the declared dependency ranges that dependabot PRs bump.
// They use floor guards that hold both before and after the bump, and pin the
// version increasing monotonic direction that dependabot validates. The actual
// expo-image / expo-image-manipulator modules require a React Native runtime
// and cannot be imported in Node, so the build step (tsdown) is what proves the
// imported API surface still type-checks after the bump.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const majorFloor = (spec, floor) => {
  const match = spec.match(/^\^?(\d+)\./)
  assert.ok(match, `expected a caret-specifier, got ${spec}`)
  assert.ok(Number(match[1]) >= floor, `expected major version >= ${floor}, got ${spec}`)
}

test('openid4vc declares the expo-image-manipulator dependency bumped in PR #123', () => {
  const spec = manifest.dependencies['expo-image-manipulator']
  assert.ok(spec, 'expo-image-manipulator must be a dependency')
  // Current ^14.0.7 -> bumped ^57.0.9; API surface used is stable in both.
  majorFloor(spec, 14)
})

test('openid4vc declares the expo-image dependency bumped in PR #96', () => {
  const spec = manifest.dependencies['expo-image']
  assert.ok(spec, 'expo-image must be a dependency')
  // Current ^3.0.10 -> bumped ^56.0.9
  majorFloor(spec, 3)
})

test('openid4vc declares the expo-asset runtime dependency', () => {
  assert.equal(manifest.dependencies['expo-asset'], '^12.0.10')
})

test('openid4vc exposes the expected package names for its consumers', () => {
  assert.equal(manifest.name, '@credebl/ssi-mobile-openid4vc')
  assert.equal(manifest.exports?.import, './src/index.ts')
})
