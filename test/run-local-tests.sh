#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Starting SlurmLedger Test Environment ==="

# Start services and rebuild if source has changed
docker compose up -d --build

echo "Waiting for services to become healthy..."
# Poll the DB healthcheck rather than sleeping a fixed interval
for i in $(seq 1 30); do
    if docker compose exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "Database is ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: Database did not become ready in time." >&2
        docker compose logs db
        exit 1
    fi
    sleep 2
done

# Give cockpit-ws a moment to initialize after the DB is up
sleep 3

# ---------------------------------------------------------------------------
# Unit tests — run against the src/ Python modules directly.
# src/ is bind-mounted at /usr/share/cockpit/slurmledger inside the container.
# The unit tests live in test/unit/ on the host; copy them in at runtime so
# pytest can discover them alongside the source they import.
# ---------------------------------------------------------------------------
echo ""
echo "=== Running Python unit tests ==="
docker compose exec -T slurmledger bash -c "
    PYTHONPATH=/usr/share/cockpit/slurmledger \
    python3 -m pytest /opt/slurmledger-tests/unit -v --tb=short
" || echo "WARN: Some unit tests failed (see output above)"

# ---------------------------------------------------------------------------
# Integration test — exercise slurmdb.py against the real MariaDB container.
# Uses --conf to read connection details from the mounted slurmdbd.conf, and
# --cluster localcluster to match the table prefix in the test fixture.
# ---------------------------------------------------------------------------
echo ""
echo "=== Testing slurmdb.py against real database ==="
docker compose exec -T slurmledger python3 /usr/share/cockpit/slurmledger/slurmdb.py \
    --conf /etc/slurm/slurmdbd.conf \
    --cluster localcluster \
    --start 2024-01-01 --end 2025-12-31 \
    --output - \
    | python3 -m json.tool | head -40

# ---------------------------------------------------------------------------
# Invoice generation smoke test
# ---------------------------------------------------------------------------
echo ""
echo "=== Testing invoice generation ==="
echo '{
  "invoice_number": "TEST-001",
  "date": "2026-03-29",
  "items": [
    {"description": "CPU Hours (March 2026)", "qty": 1000, "rate": 0.02, "amount": 20.00}
  ],
  "institution": {
    "institutionName": "Test University",
    "streetAddress": "123 Research Drive",
    "city": "Testville",
    "state": "CA",
    "postalCode": "99999"
  },
  "bank_info": ["Test Bank — ACH routing 000000000"],
  "notes": "Net 30. Test invoice — not for production use.",
  "subtotal": 20.00,
  "total_due": 20.00
}' | docker compose exec -T slurmledger \
    python3 /usr/share/cockpit/slurmledger/invoice.py > /dev/null \
    && echo "Invoice generation: OK" \
    || echo "Invoice generation: FAILED"

# ---------------------------------------------------------------------------
# Balance enforcer smoke test — no allocations will be overdrawn in the test
# fixture, so we expect a clean exit or a "no allocations" message.
# ---------------------------------------------------------------------------
echo ""
echo "=== Testing balance enforcer (dry-run) ==="
docker compose exec -T slurmledger \
    python3 /usr/share/cockpit/slurmledger/balance_enforcer.py \
    --check --json 2>&1 \
    || echo "(Expected: no allocations configured or scontrol unavailable in test env)"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Test Environment Ready ==="
echo "Cockpit UI: http://localhost:9090"
echo "  Log in with any system user account created inside the container, or"
echo "  create one with: docker compose exec slurmledger useradd -m -p \$(openssl passwd -1 testpass) testuser"
echo ""
echo "To stop and remove containers:"
echo "  docker compose -f test/docker-compose.yml down"
echo ""
echo "To tail application logs:"
echo "  docker compose -f test/docker-compose.yml logs -f slurmledger"
