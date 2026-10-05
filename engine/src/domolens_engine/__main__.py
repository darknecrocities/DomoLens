"""Entrypoint for running the DomoLens Python Engine.

Enforces listening on 127.0.0.1 (localhost only).
"""

import argparse
import sys
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="DomoLens Python Engine")
    parser.add_argument("--port", type=int, default=14220, help="Port to listen on (default: 14220)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (enforced 127.0.0.1)")

    args = parser.parse_args()

    # Security check: never allow binding to 0.0.0.0 or external interfaces
    if args.host not in ("127.0.0.1", "localhost"):
        print("Security Error: DomoLens engine must bind to 127.0.0.1 only.", file=sys.stderr)
        sys.exit(1)

    uvicorn.run(
        "domolens_engine.api:app",
        host="127.0.0.1",
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
