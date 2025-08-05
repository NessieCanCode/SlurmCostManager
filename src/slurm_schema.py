#!/usr/bin/env python3
import json
import argparse
import re

try:
    import pymysql
except ImportError:
    pymysql = None

from slurmdb import SlurmDB


def extract_schema(db: SlurmDB):
    """Return mapping of table names to column lists using a live DB."""
    db.connect()
    schema = {}
    with db._conn.cursor() as cur:
        cur.execute("SHOW TABLES")
        table_key = f"Tables_in_{db.database}"
        tables = [row[table_key] for row in cur.fetchall()]
        for table in tables:
            cur.execute(f"SHOW COLUMNS FROM {table}")
            schema[table] = [row['Field'] for row in cur.fetchall()]
    return schema


def extract_schema_from_dump(path: str):
    """Parse a SQL dump and return mapping of table names to column lists."""
    schema = {}
    table_re = re.compile(r'^CREATE TABLE `([^`]+)`')
    col_re = re.compile(r'^\s*`([^`]+)`')
    current = None
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            m = table_re.match(line)
            if m:
                current = m.group(1)
                schema[current] = []
                continue
            if current:
                if line.startswith(')'):
                    current = None
                    continue
                cm = col_re.match(line)
                if cm:
                    schema[current].append(cm.group(1))
    return schema


def main():
    parser = argparse.ArgumentParser(description="Export SlurmDB schema as JSON")
    parser.add_argument('--output', default='slurm_schema.json', help='output file')
    parser.add_argument('--conf', help='path to slurmdbd.conf')
    parser.add_argument('--cluster', help='cluster name (table prefix)')
    parser.add_argument('--slurm-conf', dest='slurm_conf', help='path to slurm.conf')
    parser.add_argument('--dump', help='path to SQL dump to parse instead of connecting')
    args = parser.parse_args()

    if args.dump:
        schema = extract_schema_from_dump(args.dump)
    else:
        if pymysql is None:
            raise RuntimeError('pymysql is required but not installed')
        db = SlurmDB(config_file=args.conf, cluster=args.cluster, slurm_conf=args.slurm_conf)
        schema = extract_schema(db)

    with open(args.output, 'w') as fh:
        json.dump(schema, fh, indent=2)
    print(f"Wrote {args.output}")


if __name__ == '__main__':
    main()
