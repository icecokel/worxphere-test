#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
hooks_dir="$repo_root/.githooks/_"
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/workflow-hooks.XXXXXX")
trap 'rm -r -- "$test_dir"' EXIT

export GIT_INDEX_FILE="$test_dir/index"
git read-tree HEAD
prompts_oid=$(
  {
    git show HEAD:PROMPTS.md
    printf '\n'
  } | git hash-object -w --stdin
)
git update-index --add --cacheinfo 100644 "$prompts_oid" PROMPTS.md

printf '%s\n' 'feat(project-setup): 훅 검증' > "$test_dir/valid-message"
"$hooks_dir/commit-msg" "$test_dir/valid-message"

printf '%s\n' 'feat: 범위 없는 커밋' > "$test_dir/no-scope-message"
if "$hooks_dir/commit-msg" "$test_dir/no-scope-message" >/dev/null 2>&1; then
  printf '범위 없는 기능 커밋이 허용되었습니다.\n' >&2
  exit 1
fi

printf '%s\n' 'feat(missing-log): 로그 없는 커밋' > "$test_dir/missing-log-message"
if "$hooks_dir/commit-msg" "$test_dir/missing-log-message" >/dev/null 2>&1; then
  printf 'PROMPTS.md 로그가 없는 기능 커밋이 허용되었습니다.\n' >&2
  exit 1
fi

unset GIT_INDEX_FILE

push_repo="$test_dir/push-repo"
git init --quiet "$push_repo"
git -C "$push_repo" config user.name "Hook Test"
git -C "$push_repo" config user.email "hook-test@example.com"

printf 'base\n' > "$push_repo/file"
git -C "$push_repo" add file
git -C "$push_repo" commit --quiet -m "base"
base_oid=$(git -C "$push_repo" rev-parse HEAD)

printf 'next\n' >> "$push_repo/file"
git -C "$push_repo" add file
git -C "$push_repo" commit --quiet -m "next"
next_oid=$(git -C "$push_repo" rev-parse HEAD)

printf 'refs/heads/main %s refs/heads/main %s\n' "$next_oid" "$base_oid" |
  (cd "$push_repo" && "$hooks_dir/pre-push" origin example)

if printf 'refs/heads/main %s refs/heads/main %s\n' "$base_oid" "$next_oid" |
  (cd "$push_repo" && "$hooks_dir/pre-push" origin example) >/dev/null 2>&1; then
  printf '비 fast-forward push가 허용되었습니다.\n' >&2
  exit 1
fi

printf 'Git hook checks passed.\n'
