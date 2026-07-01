import os
import sys
from pathlib import Path

# Cho phep chay `python run.py` tu bat ky thu muc nao.
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fire_web import create_app


app = create_app(
    model_path=os.environ.get("FIRE_MODEL_PATH", str(BASE_DIR / "model" / "best.pt")),
    confidence_threshold=float(os.environ.get("FIRE_CONFIDENCE", "0.45")),
    imgsz=int(os.environ.get("FIRE_IMGSZ", "1280")),
)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)
