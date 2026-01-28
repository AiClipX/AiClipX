# -*- coding: utf-8 -*-
"""
Lightweight SQL migration runner (Drizzle-style).

Reads .sql files from migrations/ directory, tracks applied migrations
in database table `_migrations` and local `meta/_journal.json`.

Usage:
    # Auto-run in init_db():
    from db.migrate import run_migrations
    await run_migrations(database)

    # CLI (future):
    python -m db.migrate --status
    python -m db.migrate --run
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Paths
MIGRATIONS_DIR = Path(__file__).parent / "migrations"
META_DIR = Path(__file__).parent / "meta"
JOURNAL_PATH = META_DIR / "_journal.json"

# SQL for tracking table
CREATE_MIGRATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""


async def _ensure_migrations_table(database) -> None:
    """Create _migrations table if not exists."""
    await database.execute(CREATE_MIGRATIONS_TABLE_SQL)


async def _get_applied_migrations(database) -> set:
    """Get set of applied migration names from database."""
    rows = await database.fetch_all("SELECT name FROM _migrations ORDER BY id")
    return {row["name"] for row in rows}


def _get_pending_migrations(applied: set) -> List[Path]:
    """Get list of pending .sql files sorted by name."""
    if not MIGRATIONS_DIR.exists():
        logger.warning(f"Migrations directory not found: {MIGRATIONS_DIR}")
        return []

    all_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    pending = [f for f in all_files if f.stem not in applied]
    return pending


def _split_sql_statements(sql_content: str) -> List[str]:
    """
    Split SQL content into individual statements.

    Handles:
    - Multiple statements separated by semicolons
    - Single-line comments (--)
    - Multi-line comments (/* */)
    - Strings containing semicolons

    Returns list of non-empty statements.
    """
    statements = []
    current = []
    in_string = False
    string_char = None
    in_comment = False
    in_block_comment = False
    i = 0

    while i < len(sql_content):
        char = sql_content[i]
        next_char = sql_content[i + 1] if i + 1 < len(sql_content) else ''

        # Handle block comments /* */
        if not in_string and not in_comment and char == '/' and next_char == '*':
            in_block_comment = True
            current.append(char)
            i += 1
            continue

        if in_block_comment:
            current.append(char)
            if char == '*' and next_char == '/':
                current.append(next_char)
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        # Handle single-line comments --
        if not in_string and char == '-' and next_char == '-':
            in_comment = True
            current.append(char)
            i += 1
            continue

        if in_comment:
            current.append(char)
            if char == '\n':
                in_comment = False
            i += 1
            continue

        # Handle strings
        if char in ("'", '"') and not in_string:
            in_string = True
            string_char = char
            current.append(char)
            i += 1
            continue

        if in_string:
            current.append(char)
            # Check for escape (doubled quote)
            if char == string_char:
                if next_char == string_char:
                    # Escaped quote, skip next
                    current.append(next_char)
                    i += 2
                    continue
                else:
                    in_string = False
            i += 1
            continue

        # Statement separator
        if char == ';':
            current.append(char)
            stmt = ''.join(current).strip()
            if stmt and stmt != ';':
                statements.append(stmt)
            current = []
            i += 1
            continue

        current.append(char)
        i += 1

    # Handle remaining content (statement without trailing semicolon)
    remaining = ''.join(current).strip()
    if remaining:
        statements.append(remaining)

    return statements


def _update_journal(migration_name: str) -> None:
    """Update local journal file after successful migration."""
    META_DIR.mkdir(parents=True, exist_ok=True)

    journal: Dict[str, Any] = {"version": "1", "entries": []}
    if JOURNAL_PATH.exists():
        try:
            journal = json.loads(JOURNAL_PATH.read_text())
        except json.JSONDecodeError:
            logger.warning("Invalid journal file, resetting")
            journal = {"version": "1", "entries": []}

    journal["entries"].append({
        "idx": len(journal["entries"]),
        "name": migration_name,
        "applied_at": datetime.now(timezone.utc).isoformat()
    })

    JOURNAL_PATH.write_text(json.dumps(journal, indent=2))


async def run_migrations(database) -> int:
    """
    Run all pending migrations.

    Args:
        database: Database instance from `databases` library

    Returns:
        Number of migrations applied
    """
    logger.info("Checking migrations...")

    # Ensure tracking table exists
    await _ensure_migrations_table(database)

    # Get applied migrations
    applied = await _get_applied_migrations(database)
    logger.info(f"Found {len(applied)} previously applied migrations")

    # Find pending migrations
    pending = _get_pending_migrations(applied)

    if not pending:
        logger.info("No pending migrations")
        return 0

    logger.info(f"Found {len(pending)} pending migrations")

    applied_count = 0
    for sql_file in pending:
        migration_name = sql_file.stem

        try:
            logger.info(f"Applying: {migration_name}")

            # Read and split SQL into individual statements
            sql_content = sql_file.read_text()
            statements = _split_sql_statements(sql_content)

            # Execute each statement separately (asyncpg limitation)
            for stmt in statements:
                if stmt.strip():
                    await database.execute(stmt)

            # Record in database
            await database.execute(
                "INSERT INTO _migrations (name) VALUES (:name)",
                {"name": migration_name}
            )

            # Update local journal
            _update_journal(migration_name)

            logger.info(f"Applied: {migration_name}")
            applied_count += 1

        except Exception as e:
            logger.error(f"Migration failed: {migration_name} - {e}")
            raise RuntimeError(f"Migration {migration_name} failed: {e}") from e

    logger.info(f"Migrations complete: {applied_count} applied")
    return applied_count


async def get_migration_status(database) -> Dict[str, Any]:
    """
    Get current migration status.

    Returns:
        Dict with applied, pending, and total counts
    """
    await _ensure_migrations_table(database)

    applied = await _get_applied_migrations(database)
    all_files = sorted(MIGRATIONS_DIR.glob("*.sql")) if MIGRATIONS_DIR.exists() else []
    pending = [f.stem for f in all_files if f.stem not in applied]

    return {
        "applied": sorted(applied),
        "pending": pending,
        "applied_count": len(applied),
        "pending_count": len(pending),
        "total": len(all_files)
    }


async def bootstrap_existing_db(database) -> int:
    """
    Bootstrap an existing database by marking all migrations as applied.
    Use this when migrating from hardcoded SQL to file-based migrations.

    WARNING: Only run this once on existing databases that already have
    all schema changes applied.

    Returns:
        Number of migrations marked as applied
    """
    logger.warning("Bootstrapping existing database - marking all migrations as applied")

    await _ensure_migrations_table(database)

    applied = await _get_applied_migrations(database)
    all_files = sorted(MIGRATIONS_DIR.glob("*.sql")) if MIGRATIONS_DIR.exists() else []

    marked_count = 0
    for sql_file in all_files:
        migration_name = sql_file.stem
        if migration_name not in applied:
            await database.execute(
                "INSERT INTO _migrations (name) VALUES (:name)",
                {"name": migration_name}
            )
            _update_journal(migration_name)
            logger.info(f"Marked as applied: {migration_name}")
            marked_count += 1

    logger.info(f"Bootstrap complete: {marked_count} migrations marked as applied")
    return marked_count


# CLI support (for future use)
if __name__ == "__main__":
    import asyncio
    import argparse
    import os
    import sys

    # Add parent directory to path for imports
    sys.path.insert(0, str(Path(__file__).parent.parent))

    # Load .env file (check multiple locations)
    from dotenv import load_dotenv
    backend_dir = Path(__file__).parent.parent
    # Try backend/.env first, then parent directory
    if (backend_dir / ".env").exists():
        load_dotenv(backend_dir / ".env")
    else:
        load_dotenv(backend_dir.parent / ".env")

    from databases import Database

    parser = argparse.ArgumentParser(description="Database migration runner")
    parser.add_argument("--status", action="store_true", help="Show migration status")
    parser.add_argument("--run", action="store_true", help="Run pending migrations")
    parser.add_argument("--bootstrap", action="store_true",
                        help="Mark all migrations as applied (for existing DB)")
    args = parser.parse_args()

    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable required")
        sys.exit(1)

    # Handle postgres:// vs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # For Supabase: use direct connection (port 5432) instead of pooler (port 6543)
    # Transaction pooler doesn't support prepared statements which asyncpg uses
    if "pooler.supabase.com:6543" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(":6543", ":5432")

    async def main():
        db = Database(DATABASE_URL)
        await db.connect()

        try:
            if args.status:
                status = await get_migration_status(db)
                print(f"\nMigration Status:")
                print(f"  Applied: {status['applied_count']}")
                print(f"  Pending: {status['pending_count']}")
                print(f"  Total:   {status['total']}")
                if status['pending']:
                    print(f"\nPending migrations:")
                    for name in status['pending']:
                        print(f"  - {name}")

            elif args.bootstrap:
                count = await bootstrap_existing_db(db)
                print(f"\nBootstrap complete: {count} migrations marked as applied")

            elif args.run:
                count = await run_migrations(db)
                print(f"\nMigrations complete: {count} applied")

            else:
                parser.print_help()

        finally:
            await db.disconnect()

    asyncio.run(main())
