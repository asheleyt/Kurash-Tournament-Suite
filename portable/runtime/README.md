# Portable Runtime Layout

The packaged controller/scoreboard build now expects one deterministic runtime layout under `portable/runtime/`.

Required PHP path:
- `portable/runtime/php/php.exe`
- `portable/runtime/php/php.ini`
- `portable/runtime/php/ext/`

Required MariaDB path:
- `portable/runtime/mariadb/bin/mysqld.exe`
- `portable/runtime/mariadb/bin/mysql.exe`
- `portable/runtime/mariadb/bin/mysqladmin.exe`

These binaries are staged locally by `electron-app/prepare-portable-from-xampp.ps1` and are intentionally ignored by Git.

The Electron packaging flow now stages a generated source bundle at `electron-app/runtime-stage/` before every packaged build through `electron-app/scripts/stage-portable-runtime.mjs`.

Supported source order for staging:
- `KTS_PHP_SOURCE` and `KTS_MARIADB_SOURCE` when explicitly set
- repo-local cached sources under `portable/bin/php/*` and `portable/bin/mariadb/*` if they are complete
- local XAMPP at `C:\xampp\php` and `C:\xampp\mysql`

If none of those sources contain the required executables, the build must fail before packaging.
