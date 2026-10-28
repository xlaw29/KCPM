"""Test case BVA cho API POST /api/detect-ip (va /api/detect-frame).

Chay:
    backend\\.venv\\Scripts\\python.exe -m unittest discover -s backend/tests -v

Quy uoc BVA:
    - mien hop le cua `conf` la [0.05, 0.95] (bi clamp trong handler)
    - `url` hop le khi sau khi strip co do dai >= 1
    - `conf` sai kieu (chuoi, bool, null, NaN) -> 400
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import fire_web.app as app_module  # noqa: E402
from fire_web.detector import FireDetector  # noqa: E402

SUCCESS_RESULT = {
    "detections": [],
    "summary": {
        "alert": False,
        "highest_confidence": 0.0,
        "detected_classes": [],
        "count": 0,
    },
}

UNREACHABLE_URL = "http://127.0.0.1:1/video"
CAMERA_URL = "http://camera.local/video"
IMAGE_DATA_URL = "data:image/png;base64,AAAA"

MISSING = object()  # danh dau "khong gui truong conf"
_CLIENT = None


def get_client():
    """Dung chung 1 Flask app cho tat ca test de chay nhanh."""
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = app_module.create_app().test_client()
    return _CLIENT


def fake_frame():
    """Khung hinh gia de khong can camera that."""
    return np.zeros((240, 320, 3), dtype=np.uint8)


class DetectIpBvaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = get_client()

    # ------------------------------------------------------------------ #
    # Nhom 1: bien cua `url` (do dai / rong)
    # ------------------------------------------------------------------ #
    def _post_url(self, url):
        return self.client.post("/api/detect-ip", json={"url": url})

    def test_tc01_url_khong_co_truong(self):
        """TC-01 | url khong gui | do dai = 0 -> 400"""
        res = self.client.post("/api/detect-ip", json={})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_tc02_url_rong(self):
        """TC-02 | url = '' | bien duoi (0 ky tu) -> 400"""
        self.assertEqual(self._post_url("").status_code, 400)

    def test_tc03_url_chi_khoang_trang(self):
        """TC-03 | url = '   ' | sau strip = 0 ky tu -> 400"""
        self.assertEqual(self._post_url("   ").status_code, 400)

    def test_tc04_url_null(self):
        """TC-04 | url = null | coi nhu rong -> 400"""
        self.assertEqual(self._post_url(None).status_code, 400)

    def test_tc05_url_false(self):
        """TC-05 | url = false | false or '' = '' -> 400"""
        self.assertEqual(self._post_url(False).status_code, 400)

    def test_tc06_url_so_0(self):
        """TC-06 | url = 0 | 0 or '' = '' -> 400"""
        self.assertEqual(self._post_url(0).status_code, 400)

    def test_tc07_url_1_ky_tu(self):
        """TC-07 | url = 'a' | bien tren cua mien rong (1 ky tu) -> 502"""
        self.assertEqual(self._post_url("a").status_code, 502)

    def test_tc08_url_khong_ket_noi_duoc(self):
        """TC-08 | url hop le nhung camera tat -> 502 (bug da sua)"""
        res = self._post_url(UNREACHABLE_URL)
        self.assertEqual(res.status_code, 502)
        self.assertIn("Không kết nối được camera IP", res.get_json()["error"])

    def test_tc09_url_rat_dai(self):
        """TC-09 | url dai 2000+ ky tu, host khong ton tai -> 502"""
        self.assertEqual(self._post_url("http://127.0.0.1:1/" + "a" * 2000).status_code, 502)

    def test_tc10_url_kieu_so(self):
        """TC-10 | url = 123 (number) | ep sang '123' -> 502"""
        self.assertEqual(self._post_url(123).status_code, 502)

    # ------------------------------------------------------------------ #
    # Nhom 2: bien cua `conf` [0.05, 0.95]
    # ------------------------------------------------------------------ #
    def _post_conf_ok(self, value=MISSING):
        """Goi API voi camera gia + detector gia, tra ve (response, tham so bat duoc)."""
        captured = {"called": False, "conf": MISSING}

        def fake_detect(_self, _image_bytes, conf=None):
            captured["called"] = True
            captured["conf"] = conf
            return dict(SUCCESS_RESULT)

        payload = {"url": CAMERA_URL}
        if value is not MISSING:
            payload["conf"] = value

        with (
            patch.object(app_module, "_read_ip_frame", return_value=fake_frame()),
            patch.object(FireDetector, "detect_image_bytes", fake_detect),
        ):
            res = self.client.post("/api/detect-ip", json=payload)
        return res, captured

    def _post_conf_invalid(self, conf):
        """Goi API voi conf sai kieu; camera khong duoc phep cham toi."""
        with patch.object(
            app_module, "_read_ip_frame", side_effect=AssertionError("không được gọi camera")
        ):
            return self.client.post(
                "/api/detect-ip", json={"url": CAMERA_URL, "conf": conf}
            )

    def _assert_conf(self, conf, expected):
        res, captured = self._post_conf_ok(conf)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(captured["called"])
        self.assertEqual(captured["conf"], expected)

    def test_tc11_conf_duoi_bien(self):
        """TC-11 | conf = 0.04 = min - 1 buoc -> clamp 0.05"""
        self._assert_conf(0.04, 0.05)

    def test_tc12_conf_dung_bien_duoi(self):
        """TC-12 | conf = 0.05 = min -> 0.05"""
        self._assert_conf(0.05, 0.05)

    def test_tc13_conf_tren_bien_duoi(self):
        """TC-13 | conf = 0.06 = min + 1 buoc -> 0.06"""
        self._assert_conf(0.06, 0.06)

    def test_tc14_conf_danh_nghia(self):
        """TC-14 | conf = 0.5 (giua mien) -> 0.5"""
        self._assert_conf(0.5, 0.5)

    def test_tc15_conf_duoi_bien_tren(self):
        """TC-15 | conf = 0.94 = max - 1 buoc -> 0.94"""
        self._assert_conf(0.94, 0.94)

    def test_tc16_conf_dung_bien_tren(self):
        """TC-16 | conf = 0.95 = max -> 0.95"""
        self._assert_conf(0.95, 0.95)

    def test_tc17_conf_tren_bien_tren(self):
        """TC-17 | conf = 0.96 = max + 1 buoc -> clamp 0.95"""
        self._assert_conf(0.96, 0.95)

    def test_tc18_conf_bang_0(self):
        """TC-18 | conf = 0 -> clamp 0.05"""
        self._assert_conf(0, 0.05)

    def test_tc19_conf_bang_1(self):
        """TC-19 | conf = 1 -> clamp 0.95"""
        self._assert_conf(1, 0.95)

    def test_tc20_conf_am(self):
        """TC-20 | conf = -5 -> clamp 0.05"""
        self._assert_conf(-5, 0.05)

    def test_tc21_conf_rat_lon(self):
        """TC-21 | conf = 1_000_000 -> clamp 0.95"""
        self._assert_conf(1_000_000, 0.95)

    def _assert_conf_400(self, conf):
        res = self._post_conf_invalid(conf)
        self.assertEqual(res.status_code, 400)
        self.assertIn("conf", res.get_json()["error"])

    def test_tc22_conf_kieu_chuoi(self):
        """TC-22 | conf = '0.5' (sai kieu) -> 400"""
        self._assert_conf_400("0.5")

    def test_tc23_conf_null(self):
        """TC-23 | conf = null (gui tuong minh) -> 400"""
        self._assert_conf_400(None)

    def test_tc24_conf_true(self):
        """TC-24 | conf = true (bool khong phai so) -> 400"""
        self._assert_conf_400(True)

    def test_tc25_conf_false(self):
        """TC-25 | conf = false (bool khong phai so) -> 400"""
        self._assert_conf_400(False)

    def test_tc26_conf_khong_hop_le_json(self):
        """TC-26 | conf = NaN (khong huu han) -> 400"""
        self._assert_conf_400(float("nan"))

    def test_tc27_conf_khong_gui(self):
        """TC-27 | khong gui conf -> 200, detector nhan None (dung mac dinh 0.45)"""
        res, captured = self._post_conf_ok()
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(captured["conf"])

    # ------------------------------------------------------------------ #
    # Nhom 3: chuyen trang thai HTTP (loi da sua)
    # ------------------------------------------------------------------ #
    def test_tc28_khong_doc_duoc_khung_hinh(self):
        """TC-28 | camera ket noi duoc nhung imencode loi -> 500 (truoc day 200)"""
        with (
            patch.object(app_module, "_read_ip_frame", return_value=fake_frame()),
            patch("cv2.imencode", return_value=(False, None)),
        ):
            res = self.client.post("/api/detect-ip", json={"url": CAMERA_URL})
        self.assertEqual(res.status_code, 500)
        self.assertIn("error", res.get_json())

    def test_tc29_thanh_cong(self):
        """TC-29 | camera hoat dong binh thuong -> 200"""
        with (
            patch.object(app_module, "_read_ip_frame", return_value=fake_frame()),
            patch.object(
                FireDetector, "detect_image_bytes", return_value=dict(SUCCESS_RESULT)
            ),
        ):
            res = self.client.post("/api/detect-ip", json={"url": CAMERA_URL})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["result_type"], "image")


class DetectFrameConfTest(unittest.TestCase):
    """Cung quy tac `conf` duoc ap dung cho /api/detect-frame."""

    @classmethod
    def setUpClass(cls):
        cls.client = get_client()

    def test_tc30_conf_sai_kieu_tra_400(self):
        """TC-30 | detect-frame voi conf = '0.5' -> 400"""
        res = self.client.post(
            "/api/detect-frame", json={"image": IMAGE_DATA_URL, "conf": "0.5"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("conf", res.get_json()["error"])

    def test_tc31_conf_hop_le_duoc_clamp(self):
        """TC-31 | detect-frame voi conf = 0.04 -> 200, detector nhan 0.05"""
        captured = {}

        def fake_detect(_self, _image_bytes, conf=None):
            captured["conf"] = conf
            return dict(SUCCESS_RESULT)

        with (
            patch.object(app_module, "decode_data_url", return_value=b"fake-image"),
            patch.object(FireDetector, "detect_image_bytes", fake_detect),
        ):
            res = self.client.post(
                "/api/detect-frame", json={"image": IMAGE_DATA_URL, "conf": 0.04}
            )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(captured["conf"], 0.05)


if __name__ == "__main__":
    unittest.main(verbosity=2)
