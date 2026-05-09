# Contributing

---

## Getting Started

1. Fork the repository and clone your fork
2. Follow `docs/guides/getting-started.md` to set up a local development environment
3. Create a feature branch from `main`

---

## Branch Naming

| Type                | Pattern                      | Example                            |
| ------------------- | ---------------------------- | ---------------------------------- |
| New feature         | `feat/<scope>-<description>` | `feat/rag-document-upload`         |
| Bug fix             | `fix/<scope>-<description>`  | `fix/auth-refresh-token-rotation`  |
| Chore / maintenance | `chore/<description>`        | `chore/update-openai-sdk`          |
| Documentation       | `docs/<description>`         | `docs/rag-pipeline-guide`          |
| Refactor            | `refactor/<description>`     | `refactor/use-case-error-handling` |

Use lowercase and hyphens. Keep descriptions short but specific.

---

## Commit Messages

Use **Conventional Commits** format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type       | When to use                               |
| ---------- | ----------------------------------------- |
| `feat`     | A new feature                             |
| `fix`      | A bug fix                                 |
| `docs`     | Documentation only                        |
| `refactor` | Code change with no functional difference |
| `test`     | Adding or updating tests                  |
| `chore`    | Build tooling, dependencies, CI           |
| `perf`     | Performance improvement                   |

### Scope

The scope identifies which part of the codebase the commit touches. Examples:

- `feat(rag): add PDF ingestion support`
- `fix(auth): prevent refresh token reuse after rotation`
- `chore(deps): update pydantic to 2.7`
- `test(billing): add webhook idempotency tests`

### Rules

- Summary line: imperative mood, no capital first letter, no period, max 72 characters
- Body: explain the _why_, not the _what_ (the diff shows the what)
- Breaking changes: add `BREAKING CHANGE:` in the footer, or append `!` after the type: `feat(api)!: rename user endpoint`

---

## Test-Driven Development (TDD)

**Every new behavior starts with a failing test.** This is non-negotiable.

### Red-Green-Refactor Cycle

```
1. RED   — write a test that describes the behavior, run it, watch it fail
2. GREEN — write the minimum code to make the test pass
3. REFACTOR — clean up without breaking the test
```

### Two-Commit Rule

Each TDD cycle produces two commits:

```bash
git commit -m "test(rag): RED — retriever returns empty list for unknown space"
# Now implement
git commit -m "feat(rag): GREEN — retriever filters chunks by space_id"
```

Reviewers can verify the test existed before the implementation by checking `git log`.

### Test Anatomy (Backend)

```python
class TestRetrieverFiltering:
    @pytest.mark.asyncio
    async def test_returns_empty_for_unknown_space(self, retriever, db):
        # Arrange
        chunks = await ChunkFactory.create_batch(3, space_id="space-A")
        # Act
        result = await retriever.retrieve("query", space_id="space-B", top_k=5)
        # Assert
        assert result == []
```

All unit tests mock I/O (DB, HTTP, filesystem). Integration tests use a real test DB.

---

## Quality Gates

All of the following must pass before a PR is merged.

### Backend

```bash
cd apps/backend

# Type checking
mypy --strict .

# Linting
ruff check .
ruff format --check .

# Tests with coverage
pytest --cov=. --cov-report=term-missing --cov-fail-under=80
```

### Frontend

```bash
cd apps/frontend

# Type checking
pnpm tsc --noEmit

# Linting
pnpm eslint . --max-warnings 0

# Tests
pnpm vitest run

# No console.log in production code
pnpm eslint --rule 'no-console: error' src/
```

### Shared Packages

```bash
# From root — runs lint and typecheck for all packages
pnpm turbo run lint typecheck
```

---

## Pull Request Process

1. **Self-review your diff** before requesting a review. Read every line.
2. **Write a clear PR description** explaining what the change does and why. Link related issues.
3. **Keep PRs small and focused.** One logical change per PR. Large PRs are harder to review and more likely to introduce bugs.
4. **Add tests** for every new behavior. Bug fixes must include a test that fails before the fix and passes after.
5. **Update documentation** if you change behavior that is documented in `docs/`.
6. **Request a review** from at least one other contributor.
7. **Address all review comments** before merging. Resolve conversations when addressed.
8. **Squash merge** into main with a conventional commit message summarizing the PR.

---

## New Feature Checklist

Follow the 12-step TDD checklist from `CLAUDE.md`:

1. ADR in `docs/architecture/decisions/NNN-feature-name.md`
2. **RED**: Write failing unit tests for the domain entity / value object
3. Domain entity + port interface in `core/domain/` (GREEN)
4. **RED**: Write failing unit tests for the use case
5. Use case in `core/use_cases/` — zero framework imports (GREEN)
6. **RED**: Write failing integration tests for the adapter
7. Input adapter (FastAPI route) in `adapters/input/` (GREEN)
8. Output adapter (repository / service) in `adapters/output/` (GREEN)
9. Alembic migration if schema changes
10. REFACTOR — clean up without breaking tests
11. Feature doc in `docs/features/`
12. Feature flag in `.env.example` + `CLAUDE.md` flag table

---

## Architecture Rules

These rules are enforced by CI and reviewed in every PR:

- `core/domain/` must not import `fastapi`, `sqlalchemy`, `openai`, `anthropic`, `redis`, or any other infrastructure package
- Use cases must not import adapters directly — only port interfaces
- Adapters in `adapters/output/` must not import from `adapters/input/`
- All new endpoints must be under `/api/v1/`
- All user-facing strings must use i18n keys, not hardcoded text
- No `console.log` in frontend production code (`src/` directory)

If you have a good reason to deviate from a rule, discuss it in the PR and document the exception in a comment.

---

## Reporting Bugs

File a GitHub Issue with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Python version, Node version, Docker version)
- Relevant logs (redact any secrets or PII)

---

## Security Issues

Do not file GitHub Issues for security vulnerabilities. Email `security@myapp.com` with a description and steps to reproduce. We aim to respond within 48 hours.
