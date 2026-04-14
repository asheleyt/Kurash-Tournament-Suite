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
