#!/usr/bin/env python3
"""Validate JobFit commit messages.

Project rule: the first line must be `type(scope): Korean imperative subject`.
Runtime/Lore trailers may be appended after the project WHY/WHAT body, but they
must not replace the project header.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ALLOWED_TYPES = {
    "feat",
    "fix",
    "docs",
    "refactor",
    "perf",
    "style",
    "test",
    "chore",
    "ci",
}

ALLOWED_SCOPES = {
    "dashboard",
    "analysis",
    "profile",
    "resume",
    "interview",
    "jd",
    "roadmap",
    "agent",
    "problem",
    "auth",
    "companies",
    "api",
    "deploy",
    "config",
    "docs",
}

SUBJECT_RE = re.compile(r"^(?P<type>[a-z]+)\((?P<scope>[a-z-]+)\): (?P<subject>\S.{0,71})$")
TRAILER_RE = re.compile(r"^[A-Za-z][A-Za-z-]*: .+")


def _is_generated_commit(subject: str) -> bool:
    """Allow Git-generated messages that are hard to author manually."""
    return subject.startswith(("Merge ", "Revert ")) or subject.startswith(("fixup! ", "squash! "))


def validate(message: str) -> list[str]:
    lines = message.splitlines()
    non_comment_lines = [line.rstrip() for line in lines if not line.lstrip().startswith("#")]
    while non_comment_lines and non_comment_lines[-1] == "":
        non_comment_lines.pop()

    if not non_comment_lines:
        return ["커밋 메시지가 비어 있습니다."]

    subject = non_comment_lines[0]
    if _is_generated_commit(subject):
        return []

    errors: list[str] = []
    match = SUBJECT_RE.match(subject)
    if not match:
        errors.append("첫 줄은 반드시 `type(scope): subject` 형식이어야 합니다.")
    else:
        commit_type = match.group("type")
        scope = match.group("scope")
        detail = match.group("subject")
        if commit_type not in ALLOWED_TYPES:
            errors.append(f"허용되지 않은 type `{commit_type}`입니다: {', '.join(sorted(ALLOWED_TYPES))}")
        if scope not in ALLOWED_SCOPES:
            errors.append(f"허용되지 않은 scope `{scope}`입니다: {', '.join(sorted(ALLOWED_SCOPES))}")
        if len(subject) > 72:
            errors.append("첫 줄은 72자 이하여야 합니다.")
        if detail.endswith((".", "。")):
            errors.append("subject 끝에는 마침표를 쓰지 않습니다.")

    body_lines = non_comment_lines[1:]
    meaningful_body = [line for line in body_lines if line.strip()]
    if meaningful_body:
        has_why = any(line.startswith("WHY: ") for line in meaningful_body)
        has_what = any(line == "WHAT:" for line in meaningful_body)
        # Trailer-only bodies are not useful for this project. Runtime trailers are allowed,
        # but only after the project WHY/WHAT body has been written.
        if not has_why:
            errors.append("body를 작성할 때는 `WHY: ...`가 필요합니다.")
        if not has_what:
            errors.append("body를 작성할 때는 `WHAT:` 섹션이 필요합니다.")

        what_index = next((i for i, line in enumerate(body_lines) if line == "WHAT:"), None)
        if what_index is not None:
            has_bullet = any(line.startswith("- ") for line in body_lines[what_index + 1 :])
            if not has_bullet:
                errors.append("`WHAT:` 아래에는 `- `로 시작하는 변경사항이 하나 이상 필요합니다.")

        # Catch common failure mode: Lore/runtime intent line as the first line with trailers only.
        if match is None and any(TRAILER_RE.match(line) for line in meaningful_body):
            errors.append("Lore/런타임 trailer는 프로젝트 WHY/WHAT 뒤에만 추가할 수 있습니다.")

    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: validate_commit_msg.py <commit-msg-file>", file=sys.stderr)
        return 2

    path = Path(argv[1])
    errors = validate(path.read_text(encoding="utf-8"))
    if not errors:
        return 0

    print("JobFit 커밋 메시지 컨벤션 위반:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    print(
        "\n예시:\n"
        "docs(config): 커밋 컨벤션 검증 훅 추가\n\n"
        "WHY: 컨벤션이 런타임 trailer에 밀려 재발 가능성이 남아 있음\n"
        "WHAT:\n"
        "- 첫 줄 type(scope) 형식을 자동 검증\n"
        "- Lore trailer는 WHY/WHAT 뒤에만 허용",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
