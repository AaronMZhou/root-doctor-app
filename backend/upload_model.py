"""
One-time script to upload best_model.pth to the Modal 'model-weights' volume.
Run from the backend/ directory:

    python upload_model.py

Or use the Modal CLI directly (equivalent):

    modal volume put model-weights models/best_model.pth /best_model.pth
"""

import subprocess
import sys
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "best_model.pth"
VOLUME_NAME = "model-weights"
REMOTE_PATH = "/best_model.pth"


def main():
    if not MODEL_PATH.exists():
        print(f"ERROR: Model file not found at {MODEL_PATH}")
        sys.exit(1)

    size_mb = MODEL_PATH.stat().st_size / 1024 / 1024
    print(f"Uploading {MODEL_PATH.name} ({size_mb:.1f} MB) → Modal volume '{VOLUME_NAME}:{REMOTE_PATH}'")

    result = subprocess.run(
        ["modal", "volume", "put", "--force", VOLUME_NAME, str(MODEL_PATH), REMOTE_PATH],
        check=False,
    )

    if result.returncode == 0:
        print("Upload complete!")
        print(f"\nVerify with: modal volume ls {VOLUME_NAME}")
    else:
        print("Upload failed. Check your Modal authentication with: modal token list")
        sys.exit(result.returncode)


if __name__ == "__main__":
    main()
