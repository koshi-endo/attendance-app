#!/usr/bin/env python3
"""Script to run Alembic migration."""

import sys

sys.path.append('.')

from alembic.config import Config

from alembic import command


def main():
    config = Config('alembic.ini')
    command.upgrade(config, 'head')
    print("Migration completed successfully!")

if __name__ == "__main__":
    main()
