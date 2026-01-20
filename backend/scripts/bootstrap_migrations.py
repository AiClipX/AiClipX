#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bootstrap existing database with migration tracking.

Run this ONCE on existing databases that already have all schema changes
applied via the old hardcoded SQL approach.

Usage:
    python scripts/bootstrap_migrations.py

This will:
1. Create _migrations table if not exists
2. Mark all .sql files in db/migrations/ as already applied
3. Update db/meta/_journal.json
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(Path(__file__).parent.parent / ".env")

from databases import Database


async def main():
    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable required")
        print("Make sure .env file exists in backend/ directory")
        sys.exit(1)

    # Handle postgres:// vs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Use direct connection for Supabase
    if "pooler.supabase.com:6543" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(":6543", ":5432")

    print(f"Connecting to database...")

    db = Database(DATABASE_URL)
    await db.connect()

    try:
        # Import after connection to ensure paths work
        from db.migrate import bootstrap_existing_db, get_migration_status

        print("\nCurrent migration status:")
        status = await get_migration_status(db)
        print(f"  Applied: {status['applied_count']}")
        print(f"  Pending: {status['pending_count']}")
        print(f"  Total:   {status['total']}")

        if status['pending_count'] == 0:
            print("\nNo pending migrations. Database already up to date.")
            return

        print(f"\nAbout to mark {status['pending_count']} migrations as applied:")
        for name in status['pending']:
            print(f"  - {name}")

        confirm = input("\nProceed? (yes/no): ").strip().lower()
        if confirm != "yes":
            print("Aborted.")
            return

        count = await bootstrap_existing_db(db)
        print(f"\nBootstrap complete: {count} migrations marked as applied")

        # Show final status
        status = await get_migration_status(db)
        print(f"\nFinal status:")
        print(f"  Applied: {status['applied_count']}")
        print(f"  Pending: {status['pending_count']}")

    finally:
        await db.disconnect()
        print("\nDisconnected from database.")


if __name__ == "__main__":
    asyncio.run(main())
