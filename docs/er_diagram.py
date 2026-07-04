"""Ve so do ER (Entity-Relationship) cho CSDL du an phat hien chay/khoi."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

C_HEADER = "#c0392b"   # do
C_HEADER2 = "#2c3e50"  # xanh than
C_BORDER = "#7f8c8d"
C_PK = "#2980b9"
C_FK = "#27ae60"

def entity(ax, x, y, w, title, title_color, rows):
    """Ve mot bang: tieu de + danh sach cot."""
    rh = 0.42          # chieu cao moi dong
    hh = 0.62          # chieu cao header
    h = hh + rh * len(rows)
    top = y
    # Header
    ax.add_patch(FancyBboxPatch((x, top - hh), w, hh,
                 boxstyle="round,pad=0,rounding_size=0.02",
                 fc=title_color, ec=title_color, zorder=2))
    ax.text(x + w / 2, top - hh / 2, title, ha="center", va="center",
            color="white", fontsize=12, fontweight="bold", zorder=3)
    # Body
    ax.add_patch(plt.Rectangle((x, top - h), w, h - hh,
                 fc="white", ec=C_BORDER, lw=1.2, zorder=1))
    for i, (name, tag) in enumerate(rows):
        ry = top - hh - rh * (i + 0.5)
        if i > 0:
            ax.plot([x, x + w], [top - hh - rh * i, top - hh - rh * i],
                    color="#ecf0f1", lw=0.8, zorder=2)
        label = name
        color = "#2c3e50"
        weight = "normal"
        if tag == "PK":
            color = C_PK; weight = "bold"; label = "● " + name
        elif tag == "FK":
            color = C_FK; weight = "bold"; label = "◆ " + name
        ax.text(x + 0.15, ry, label, ha="left", va="center",
                fontsize=9.5, color=color, fontweight=weight, zorder=3)
        if tag in ("PK", "FK", "UQ"):
            ax.text(x + w - 0.12, ry, tag, ha="right", va="center",
                    fontsize=8, color=color, style="italic", zorder=3)
    return (x, top, w, h)

fig, ax = plt.subplots(figsize=(12, 7.2))
ax.set_xlim(0, 12)
ax.set_ylim(0, 7.2)
ax.axis("off")

users = [
    ("id", "PK"), ("email", "UQ"), ("username", ""), ("full_name", ""),
    ("password_hash", ""), ("salt", ""), ("role", ""),
    ("created_at", ""), ("last_login_at", ""),
]
dets = [
    ("id", "PK"), ("user_id", "FK"), ("camera_name", ""), ("type", ""),
    ("severity", ""), ("confidence", ""), ("detected_classes", ""),
    ("box_count", ""), ("image_path", ""), ("source", ""),
    ("acknowledged", ""), ("acknowledged_by", ""), ("created_at", ""),
]

eu = entity(ax, 0.6, 6.7, 3.6, "users", C_HEADER2, users)
ed = entity(ax, 7.0, 6.9, 4.2, "detections", C_HEADER, dets)

# Duong quan he 1 - N (users.id -> detections.user_id)
x1 = eu[0] + eu[2]           # canh phai users
y1 = 6.7 - 0.62 - 0.42 * 0.5 # dong id cua users
x2 = ed[0]                   # canh trai detections
y2 = 6.9 - 0.62 - 0.42 * 1.5 # dong user_id cua detections
arrow = FancyArrowPatch((x1, y1), (x2, y2),
                        connectionstyle="arc3,rad=-0.15",
                        arrowstyle="-", lw=2, color=C_FK, zorder=0)
ax.add_patch(arrow)
mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + 0.55
ax.text(x1 + 0.18, y1 + 0.18, "1", fontsize=13, color=C_FK, fontweight="bold")
ax.text(x2 - 0.30, y2 + 0.18, "N", fontsize=13, color=C_FK, fontweight="bold")
ax.text(mx, my, "1 user  →  N detections\n(ON DELETE SET NULL)",
        ha="center", va="center", fontsize=9, color=C_FK, style="italic")

ax.text(6, 0.35,
        "Sơ đồ ER — CSDL SQLite (fire_detection.db)   |   ● Khóa chính (PK)   ◆ Khóa ngoại (FK)   UQ: Duy nhất",
        ha="center", va="center", fontsize=9, color="#555")

plt.tight_layout()
out = "/Users/shini/Documents/TriTueNhanTao/fire_detection_project/docs/er_diagram.png"
plt.savefig(out, dpi=170, bbox_inches="tight", facecolor="white")
print("Da luu:", out)
