const { execSync } = require('node:child_process')

const FALLBACK_NAME = 'github-actions[bot]'
const FALLBACK_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com'

const getSignedOffBy = () => {
  let gitUserName = FALLBACK_NAME
  let gitEmail = FALLBACK_EMAIL

  try {
    gitUserName = execSync('git config user.name', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf-8')
      .trim()
  } catch {}

  try {
    gitEmail = execSync('git config user.email', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf-8')
      .trim()
  } catch {}

  return `Signed-off-by: ${gitUserName} <${gitEmail}>`
}

const getAddMessage = async (changeset) => {
  return `docs(changeset): ${changeset.summary}\n\n${getSignedOffBy()}\n`
}

const getVersionMessage = async (releasePlan) => {
  // Keep the version commit message aligned with the release workflow's
  // GitHub Release trigger (release.yml matches head commits starting with
  // "chore(release): new version"), while still carrying the DCO sign-off.
  return `chore(release): new version\n\n${getSignedOffBy()}\n`
}

module.exports = {
  getAddMessage,
  getVersionMessage,
}
