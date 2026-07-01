import base64
import binascii
import os
from pathlib import Path
from typing import Any


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp", "mp4", "mov", "avi", "mkv"}
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv"}
ALERT_CLASSES = {"fire", "smoke"}

# Nhan hien thi tieng Viet cho tung lop.
CLASS_LABELS_VI = {"fire": "Cháy", "smoke": "Khói"}
# Mau ve khung (RGB) cho tung lop.
CLASS_COLORS = {"fire": (255, 69, 0), "smoke": (120, 144, 160)}
DEFAULT_COLOR = (0, 200, 83)

_FONT_CACHE: dict[int, Any] = {}


def label_for(class_name: str) -> str:
    """Tra ve nhan tieng Viet co dau cho lop, hoac giu nguyen ten goc."""
    return CLASS_LABELS_VI.get(class_name.lower(), class_name)


def _load_font(size: int):
    """Nap font ho tro tieng Viet, co cache theo kich thuoc."""
    if size in _FONT_CACHE:
        return _FONT_CACHE[size]

    from PIL import ImageFont

    candidates: list[str] = []
    try:
        from matplotlib import font_manager

        candidates.append(font_manager.findfont("DejaVu Sans"))
    except Exception:
        pass
    candidates += [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    font = None
    for path in candidates:
        try:
            font = ImageFont.truetype(path, size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()
    _FONT_CACHE[size] = font
    return font


def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


def is_image_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in IMAGE_EXTENSIONS


def is_video_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in VIDEO_EXTENSIONS


def decode_data_url(data_url: str) -> bytes:
    if not data_url.startswith("data:image/"):
        raise ValueError("Only image data URLs are supported.")
    if "," not in data_url:
        raise ValueError("Invalid data URL.")

    header, encoded = data_url.split(",", 1)
    if ";base64" not in header:
        raise ValueError("Image data URL must be base64 encoded.")

    try:
        return base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Invalid base64 image payload.") from exc


def summarize_detections(
    detections: list[dict[str, Any]],
    confidence_threshold: float,
) -> dict[str, Any]:
    detected_classes = []
    highest_confidence = 0.0
    alert = False

    for detection in detections:
        class_name = str(detection.get("class_name", "")).lower()
        confidence = float(detection.get("confidence", 0.0))

        if class_name and class_name not in detected_classes:
            detected_classes.append(class_name)
        if class_name in ALERT_CLASSES:
            highest_confidence = max(highest_confidence, confidence)
            if confidence >= confidence_threshold:
                alert = True

    return {
        "alert": alert,
        "highest_confidence": round(highest_confidence, 4),
        "detected_classes": detected_classes,
        "count": len(detections),
    }


def summarize_video_detections(frame_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    detected_classes = []
    highest_confidence = 0.0
    alert_frames = 0
    total_detections = 0

    for summary in frame_summaries:
        highest_confidence = max(
            highest_confidence,
            float(summary.get("highest_confidence", 0.0)),
        )
        total_detections += int(summary.get("count", 0))
        if summary.get("alert"):
            alert_frames += 1

        for class_name in summary.get("detected_classes", []):
            if class_name not in detected_classes:
                detected_classes.append(class_name)

    return {
        "alert": alert_frames > 0,
        "highest_confidence": round(highest_confidence, 4),
        "detected_classes": detected_classes,
        "count": total_detections,
        "total_detections": total_detections,
        "processed_frames": len(frame_summaries),
        "alert_frames": alert_frames,
    }


class FireDetector:
    def __init__(
        self,
        model_path: str | Path,
        confidence_threshold: float = 0.45,
        imgsz: int = 1280,
    ):
        self.model_path = Path(model_path)
        self.confidence_threshold = confidence_threshold
        # Do phan giai suy luan: anh lon hon -> bat duoc lua/khoi nho & xa hon.
        self.imgsz = imgsz
        self._model = None

    @property
    def model(self):
        if self._model is None:
            if not self.model_path.exists():
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
            try:
                cache_dir = Path.cwd() / ".cache" / "matplotlib"
                cache_dir.mkdir(parents=True, exist_ok=True)
                os.environ.setdefault("MPLCONFIGDIR", str(cache_dir))
                from ultralytics import YOLO
            except ImportError as exc:
                raise RuntimeError(
                    "Missing dependency 'ultralytics'. Install requirements.txt first."
                ) from exc
            self._model = YOLO(str(self.model_path))
        return self._model

    def detect_image_bytes(
        self, image_bytes: bytes, conf: float | None = None
    ) -> dict[str, Any]:
        try:
            import cv2
            import numpy as np
        except ImportError as exc:
            raise RuntimeError(
                "Missing dependency 'opencv-python' or 'numpy'. Install requirements.txt first."
            ) from exc

        buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image. Please upload a valid image file.")

        threshold = self.confidence_threshold if conf is None else conf
        annotated, detections = self._detect_frame(image, threshold)

        ok, encoded = cv2.imencode(".jpg", annotated)
        if not ok:
            raise RuntimeError("Could not encode annotated image.")

        encoded_image = base64.b64encode(encoded.tobytes()).decode("ascii")
        return {
            "image": f"data:image/jpeg;base64,{encoded_image}",
            "detections": detections,
            "summary": summarize_detections(detections, threshold),
        }

    def detect_video_file(
        self,
        input_path: str | Path,
        output_path: str | Path,
        max_frames: int = 300,
        target_frames: int = 200,
    ) -> dict[str, Any]:
        try:
            import cv2
        except ImportError as exc:
            raise RuntimeError("Missing dependency 'opencv-python'. Install requirements.txt first.") from exc

        input_path = Path(input_path)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        capture = cv2.VideoCapture(str(input_path))
        if not capture.isOpened():
            raise ValueError("Could not open video. Please upload a valid video file.")

        fps = capture.get(cv2.CAP_PROP_FPS) or 24
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if width <= 0 or height <= 0:
            capture.release()
            raise ValueError("Video has invalid frame dimensions.")

        # Chon buoc nhay de chi xu ly khoang `target_frames` khung (nhanh tren CPU).
        stride = 1
        if total_frames > target_frames > 0:
            stride = max(1, round(total_frames / target_frames))
        out_fps = max(1.0, fps / stride)

        # avc1 (H.264) de trinh duyet phat duoc; neu khong co thi quay ve mp4v.
        writer = cv2.VideoWriter(
            str(output_path),
            cv2.VideoWriter_fourcc(*"avc1"),
            out_fps,
            (width, height),
        )
        if not writer.isOpened():
            writer = cv2.VideoWriter(
                str(output_path),
                cv2.VideoWriter_fourcc(*"mp4v"),
                out_fps,
                (width, height),
            )
        if not writer.isOpened():
            capture.release()
            raise RuntimeError("Could not create output video.")

        frame_summaries = []
        sample_detections = []
        processed_frames = 0
        source_index = 0
        first_alert = None

        try:
            while processed_frames < max_frames:
                # Voi stride > 1 thi seek thang toi khung can lay (nhanh hon
                # giai ma tuan tu); stride == 1 thi doc lien tiep.
                if stride > 1:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, source_index)
                ok, frame = capture.read()
                if not ok:
                    break

                # giay tinh theo vi tri thuc trong video goc
                timestamp = round(source_index / fps, 2) if fps else None
                annotated, detections = self._detect_frame(frame)
                for detection in detections:
                    detection["frame"] = source_index
                    detection["time"] = timestamp
                if len(sample_detections) < 20:
                    sample_detections.extend(detections[: 20 - len(sample_detections)])

                summary = summarize_detections(detections, self.confidence_threshold)
                frame_summaries.append(summary)
                if summary["alert"] and first_alert is None:
                    first_alert = {"frame": source_index, "time": timestamp}
                writer.write(annotated)
                processed_frames += 1
                source_index += stride
                if total_frames and source_index >= total_frames:
                    break
        finally:
            capture.release()
            writer.release()

        if processed_frames == 0:
            raise ValueError("Video does not contain readable frames.")

        summary = summarize_video_detections(frame_summaries)
        summary["truncated"] = processed_frames >= max_frames
        summary["frame_stride"] = stride
        summary["fps"] = round(fps, 2) if fps else None
        summary["duration_seconds"] = round(source_index / fps, 2) if fps else None
        summary["first_alert_time"] = first_alert["time"] if first_alert else None
        summary["first_alert_frame"] = first_alert["frame"] if first_alert else None
        return {
            "video_path": str(output_path),
            "detections": sample_detections,
            "summary": summary,
        }

    def _detect_frame(
        self, frame: Any, conf: float | None = None
    ) -> tuple[Any, list[dict[str, Any]]]:
        results = self.model.predict(
            source=frame,
            conf=self.confidence_threshold if conf is None else conf,
            imgsz=self.imgsz,
            verbose=False,
        )
        result = results[0]
        detections = self._extract_detections(result, frame.shape)
        annotated = self._annotate(frame, detections)
        return annotated, detections

    def _extract_detections(
        self, result: Any, frame_shape: tuple[int, ...] | None = None
    ) -> list[dict[str, Any]]:
        names = getattr(result, "names", {}) or {}
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            return []

        frame_area = None
        if frame_shape is not None and len(frame_shape) >= 2:
            frame_area = float(frame_shape[0]) * float(frame_shape[1])

        detections = []
        for box in boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            xyxy = [float(value) for value in box.xyxy[0].tolist()]
            width = xyxy[2] - xyxy[0]
            height = xyxy[3] - xyxy[1]
            class_name = str(names.get(class_id, class_id))
            detection = {
                "class_id": class_id,
                "class_name": class_name,
                "label": label_for(class_name),
                "confidence": round(confidence, 4),
                "box": {
                    "x1": round(xyxy[0], 2),
                    "y1": round(xyxy[1], 2),
                    "x2": round(xyxy[2], 2),
                    "y2": round(xyxy[3], 2),
                },
                "width": round(width, 1),
                "height": round(height, 1),
            }
            if frame_area:
                detection["area_ratio"] = round((width * height) / frame_area, 4)
            detections.append(detection)
        return detections

    def _annotate(
        self, frame: Any, detections: list[dict[str, Any]]
    ) -> Any:
        """Ve khung mau + nhan tieng Viet len anh (BGR numpy)."""
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw

        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(image)
        height = frame.shape[0]
        font = _load_font(max(16, int(height * 0.032)))
        line_width = max(2, int(round(height * 0.004)))

        for detection in detections:
            box = detection["box"]
            x1, y1, x2, y2 = box["x1"], box["y1"], box["x2"], box["y2"]
            color = CLASS_COLORS.get(detection["class_name"].lower(), DEFAULT_COLOR)
            percent = round(detection["confidence"] * 100)
            text = f"{detection['label']} {percent}%"

            draw.rectangle([x1, y1, x2, y2], outline=color, width=line_width)

            text_box = draw.textbbox((0, 0), text, font=font)
            text_w = text_box[2] - text_box[0]
            text_h = text_box[3] - text_box[1]
            pad = 4
            label_top = max(0, y1 - text_h - 2 * pad)
            draw.rectangle(
                [x1, label_top, x1 + text_w + 2 * pad, label_top + text_h + 2 * pad],
                fill=color,
            )
            draw.text((x1 + pad, label_top + pad), text, fill=(255, 255, 255), font=font)

        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
