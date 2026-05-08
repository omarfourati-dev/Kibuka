#!/usr/bin/env python3
"""
Log Watcher — monitors backend logs for 5xx errors and exceptions,
then triggers Claude Code CLI to auto-fix them.

Usage: python scripts/log-watcher.py [--dry-run]
Cooldown: max 1 fix attempt per 5 minutes.
Fix log: ~/.claude/error-fixes.log
"""
import subprocess
import time
import re
import json
import argparse
import signal
import sys
import tempfile
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

COOLDOWN_MINUTES = 5
FIX_LOG = Path.home() / '.claude' / 'error-fixes.log'
DOCKER_COMPOSE = 'deploy/docker/docker-compose.dev.yml'
BACKEND_SERVICE = 'backend'

# Only trigger on server errors, not client errors
TRIGGER_PATTERNS = [
    r'ERROR.*Exception',
    r'CRITICAL',
    r'Traceback \(most recent call last\)',
    r'HTTP/1\.[01]" 5\d\d',  # 5xx status codes
]

# Patterns to ignore (not worth fixing automatically)
IGNORE_PATTERNS = [
    r'404 Not Found',
    r'401 Unauthorized',
    r'403 Forbidden',
    r'ConnectionResetError',
]

last_fix_time: Optional[datetime] = None
running = True


def log_fix(error_snippet: str, status: str, dry_run: bool) -> None:
    FIX_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'status': status,
        'dry_run': dry_run,
        'error': error_snippet[:500],
    }
    with open(FIX_LOG, 'a') as f:
        f.write(json.dumps(entry) + '\n')


def should_trigger(line: str) -> bool:
    for pattern in IGNORE_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return False
    for pattern in TRIGGER_PATTERNS:
        if re.search(pattern, line):
            return True
    return False


def in_cooldown() -> bool:
    global last_fix_time
    if last_fix_time is None:
        return False
    return (datetime.utcnow() - last_fix_time).total_seconds() < timedelta(minutes=COOLDOWN_MINUTES).total_seconds()


def attempt_fix(error_context: str, dry_run: bool) -> None:
    global last_fix_time

    if in_cooldown():
        assert last_fix_time is not None
        remaining = COOLDOWN_MINUTES - int((datetime.utcnow() - last_fix_time).total_seconds() // 60)
        print(f"[log-watcher] In cooldown, {remaining}m remaining. Skipping fix.")
        return

    print(f"[log-watcher] Error detected! Triggering @log-fixer...")
    log_fix(error_context, 'triggered', dry_run)
    last_fix_time = datetime.utcnow()

    if dry_run:
        print(f"[log-watcher] DRY RUN — would run: claude --print '@log-fixer Fix this error: {error_context[:100]}'")
        return

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write(f"Error detected in backend logs:\n\n{error_context}")
            tmp_path = tmp.name

        try:
            result = subprocess.run(
                [
                    'claude', '--print',
                    f'@log-fixer Read the error context in {tmp_path} and fix the root cause. '
                    f'Run tests to verify, then commit the fix.'
                ],
                capture_output=True,
                text=True,
                timeout=300,  # 5 min timeout
            )
            status = 'success' if result.returncode == 0 else 'error'
            log_fix(error_context, status, dry_run)
            print(f"[log-watcher] Fix attempt: {status}")
        finally:
            os.unlink(tmp_path)
    except subprocess.TimeoutExpired:
        log_fix(error_context, 'timeout', dry_run)
        print("[log-watcher] Fix attempt timed out")
    except FileNotFoundError:
        print("[log-watcher] ERROR: 'claude' CLI not found in PATH")


def watch_logs(dry_run: bool) -> None:
    print(f"[log-watcher] Starting. Dry run: {dry_run}. Cooldown: {COOLDOWN_MINUTES}m")

    # Keep a rolling buffer of recent log lines for context
    recent_lines: list[str] = []
    in_traceback = False
    traceback_lines: list[str] = []

    proc = subprocess.Popen(
        ['docker', 'compose', '-f', DOCKER_COMPOSE, 'logs', '-f', '--no-color', BACKEND_SERVICE],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    try:
        for line in proc.stdout:
            line = line.rstrip()
            print(f"[backend] {line}")

            # Detect start of Python Traceback
            if 'Traceback (most recent call last)' in line:
                in_traceback = True
                traceback_lines = recent_lines[-5:] + [line]  # include 5 lines of context
                continue

            if in_traceback:
                traceback_lines.append(line)
                # End of traceback: last line is the exception type (e.g. "ValueError: ...")
                # Tracebacks end when we see a non-indented non-empty line that's not "Traceback"
                if line and not line.startswith(' ') and not line.startswith('\t') and not line.startswith('Traceback'):
                    in_traceback = False
                    context = '\n'.join(traceback_lines)
                    traceback_lines = []
                    attempt_fix(context, dry_run)
                continue

            # Check other trigger patterns (5xx, CRITICAL, ERROR Exception)
            if should_trigger(line):
                context = '\n'.join(recent_lines[-10:]) + '\n' + line
                attempt_fix(context, dry_run)

            # Rolling buffer
            recent_lines.append(line)
            if len(recent_lines) > 50:
                recent_lines = recent_lines[-50:]
    finally:
        proc.terminate()


def handle_signal(sig, frame):
    global running
    print("\n[log-watcher] Shutting down...")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description='Log watcher for auto bug fixing')
    parser.add_argument('--dry-run', action='store_true', help='Do not actually call Claude CLI')
    args = parser.parse_args()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    watch_logs(args.dry_run)


if __name__ == '__main__':
    main()
