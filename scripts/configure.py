#!/usr/bin/env python3
"""
Central configuration updater for Omar's App Template.
Reads project.config.yaml and updates all dependent configuration files.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml is required. Install with: pip install pyyaml")
    sys.exit(1)


def load_config(config_path: str = "project.config.yaml") -> Dict[str, Any]:
    """Load configuration from YAML file."""
    path = Path(config_path)
    if not path.exists():
        print(f"ERROR: Configuration file not found: {config_path}")
        sys.exit(1)

    with open(path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    if not config:
        print(f"ERROR: Configuration file is empty or invalid: {config_path}")
        sys.exit(1)

    return config


def flatten_config(config: Dict[str, Any], prefix: str = "") -> Dict[str, str]:
    """Flatten nested config dict into flat dict with dot notation keys."""
    flat = {}
    for key, value in config.items():
        full_key = f"{prefix}{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(flatten_config(value, f"{full_key}."))
        else:
            flat[full_key] = str(value)
    return flat


def build_replacements(config: Dict[str, Any]) -> Dict[str, str]:
    """Build a mapping of placeholder patterns to replacement values."""
    flat = flatten_config(config)
    replacements = {}

    # Map flattened keys to common placeholder patterns
    for key, value in flat.items():
        # Pattern 1: {{ app.name }}
        replacements[f"{{{{ {key} }}}}"] = value
        # Pattern 2: {{app.name}}
        replacements[f"{{{{{key}}}}}"] = value
        # Pattern 3: ${APP_NAME} (uppercase with underscores)
        env_style = key.upper().replace(".", "_")
        replacements[f"${{{env_style}}}"] = value

    return replacements


def update_file(file_path: Path, replacements: Dict[str, str], dry_run: bool = False) -> Tuple[bool, bool, Optional[str]]:
    """
    Update a single file with replacements.
    Returns tuple of (updated, has_placeholders, error_msg)
    - updated: True if file was updated (or would be updated in dry-run)
    - has_placeholders: True if file contained placeholders
    - error_msg: Error message if any, None otherwise
    """
    if not file_path.exists():
        return False, False, None

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except (IOError, UnicodeDecodeError) as e:
        return False, False, f"Failed to read {file_path}: {str(e)}"

    original_content = content
    has_placeholders = False

    # Apply replacements
    for pattern, value in replacements.items():
        if pattern in content:
            has_placeholders = True
            content = content.replace(pattern, value)

    # Check if content changed
    if content != original_content:
        if not dry_run:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            except IOError as e:
                return False, has_placeholders, f"Failed to write {file_path}: {str(e)}"
        return True, has_placeholders, None

    return False, has_placeholders, None


def main():
    """Main configuration update routine."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Update configuration placeholders in project files"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without modifying files"
    )
    args = parser.parse_args()

    # Get the project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Load configuration
    config_path = project_root / "project.config.yaml"
    config = load_config(str(config_path))

    # Build replacements
    replacements = build_replacements(config)

    # List of files to update
    files_to_update = [
        "deploy/docker/docker-compose.yml",
        "deploy/k8s/namespace.yaml",
        "deploy/k3d/cluster-config.yaml",
        "mobile/app.config.ts",
        "README.md",
        ".github/workflows/deploy-docker.yml",
        ".env.example",
    ]

    # Track results
    updated_count = 0
    skipped_count = 0
    no_placeholders_count = 0
    errors: List[str] = []

    mode_str = "(DRY RUN)" if args.dry_run else ""
    print("\n" + "=" * 60)
    print(f"OMAR'S APP - Configuration Update {mode_str}")
    print("=" * 60 + "\n")

    for file_rel_path in files_to_update:
        file_path = project_root / file_rel_path

        updated, has_placeholders, error = update_file(file_path, replacements, dry_run=args.dry_run)

        if error:
            print(f"[ERROR] {file_rel_path}")
            errors.append(error)
        elif updated:
            print(f"[OK] {file_rel_path}")
            updated_count += 1
        elif file_path.exists():
            if has_placeholders:
                print(f"[SKIP] {file_rel_path} (no changes needed)")
            else:
                print(f"[WARN] {file_rel_path} (no placeholders found)")
                no_placeholders_count += 1
        else:
            print(f"[WARN] {file_rel_path} (not found - skipped)")
            skipped_count += 1

    print("\n" + "=" * 60)
    summary = f"Summary: {updated_count} file(s) updated, {no_placeholders_count} file(s) with no placeholders, {skipped_count} file(s) not found"
    if args.dry_run:
        summary += " (DRY RUN)"
    print(summary)
    print("=" * 60 + "\n")

    if errors:
        print("Errors encountered:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

    return 0


if __name__ == "__main__":
    sys.exit(main())
