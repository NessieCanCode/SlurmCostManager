import json
import argparse

try:
    import pymysql
except ImportError:
    pymysql = None

from slurmdb import SlurmDB


def extract_schema(db: SlurmDB):
    """Return mapping of table names to column lists."""
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


def main():
    parser = argparse.ArgumentParser(description="Export SlurmDB schema as JSON")
    parser.add_argument('--output', default='slurm_schema.json', help='output file')
    parser.add_argument('--conf', help='path to slurmdbd.conf')
    parser.add_argument('--cluster', help='cluster name (table prefix)')
    parser.add_argument('--slurm-conf', dest='slurm_conf', help='path to slurm.conf')
    args = parser.parse_args()

    if pymysql is None:
        raise RuntimeError('pymysql is required but not installed')

    db = SlurmDB(config_file=args.conf, cluster=args.cluster, slurm_conf=args.slurm_conf)
    schema = extract_schema(db)

    with open(args.output, 'w') as fh:
        json.dump(schema, fh, indent=2)
    print(f"Wrote {args.output}")


if __name__ == '__main__':
    main()
