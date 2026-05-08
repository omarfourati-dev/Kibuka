#!/usr/bin/env python3
"""
Central configuration updater for Omar's App Template.
Reads project.config.yaml and updates all dependent configuration files.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

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
        replacements[f"{{{{ {key} }}}}", ] = value
        # Pattern 2: {{app.name}}
        replacements[f"{{{{{key}}}}}"] = value
        # Pattern 3: ${APP_NAME} (uppercase with underscores)
        env_style = key.upper().replace(".", "_")
        replacements[f"${{{env_style}}}"] = value

    return replacements


def update_file(file_path: Path, replacements: Dict[str, str]) -> bool:
    """
    Update a single file with replacements.
    Returns True if file was updated, False if file doesn't exist or no changes.
    """
    if not file_path.exists():
        return False

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except (IOError, UnicodeDecodeError):
        return False

    original_content = content

    # Apply replacements
    for pattern, value in replacements.items():
        content = content.replace(pattern, value)

    # Only write if content changed
    if content != original_content:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except IOError:
            return False

    return False


def main():
    """Main configuration update routine."""
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
    errors = []

    print("\n" + "=" * 60)
    print("OMAR'S APP - Configuration Update")
    print("=" * 60 + "\n")

    for file_rel_path in files_to_update:
        file_path = project_root / file_rel_path

        if update_file(file_path, replacements):
            print(f"✓ {file_rel_path}")
            updated_count += 1
        elif file_path.exists():
            print(f"- {file_rel_path} (no changes needed)")
        else:
            print(f"⚠ {file_rel_path} (not found - skipped)")
            skipped_count += 1

    print("\n" + "=" * 60)
    print(f"Summary: {updated_count} file(s) updated, {skipped_count} file(s) skipped")
    print("=" * 60 + "\n")

    if errors:
        print("Errors encountered:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

    return 0


if __name__ == "__main__":
    sys.exit(main())
