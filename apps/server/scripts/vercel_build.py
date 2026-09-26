"""Vercel build step: apply migrations before the new deployment goes live.

Runs only for production builds so a preview can never migrate the shared
database. Migrations must stay backward compatible (expand/contract): the
previous deployment keeps serving against the new schema until promotion,
and a failed build after this point leaves the schema ahead of live code.
"""

import os
import subprocess
import sys


def main() -> None:
    if os.environ.get("VERCEL_ENV") != "production":
        print(f"Skipping migrations for VERCEL_ENV={os.environ.get('VERCEL_ENV')!r}.")
        return
    subprocess.run(
        [sys.executable, "manage.py", "migrate", "--noinput"],
        check=True,
    )


if __name__ == "__main__":
    main()
