# How to contribute to Reclaim

## Branch naming

feature/what-you-built
fix/what-you-fixed
chore/what-you-cleaned

Examples:
  feature/claim-expiry-job
  feature/match-scoring-algorithm
  fix/block-self-claim
  fix/chat-message-limit
  chore/update-dependencies

## Commit message format

type: short description in lowercase

Types:
  feat      new feature
  fix       bug fix
  chore     cleanup, deps, config
  docs      documentation only
  test      tests only
  refactor  code change, no feature or fix

Examples:
  feat: add 72h claim expiry background job
  fix: block self-claim on listing creation
  test: add claim limit unit tests
  docs: update SETUP.md with migration steps

## Pull request rules

- Every PR must include tests
- All tests must pass before merge
- One PR = one feature or one fix only
- Write what the PR does and why in the description
- Link to the issue if there is one

## TDD rule — strictly followed

Always write the test first, then write the code.

Red   → write a failing test
Green → write minimum code to make it pass
Refactor → clean up the code, test still passes

Never write code without a test first.

## Code rules

- No ORM — raw SQL only using pg
- No Redis, no RabbitMQ
- Business logic goes in services/ only
- Controllers only handle req and res
- All routes must have validators
- Soft delete only — never hard delete user data
- GPS coordinates never sent to frontend