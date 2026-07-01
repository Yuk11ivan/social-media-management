"""
草稿图片持久化 — 将 base64 图片保存到 uploads/drafts/ 目录
"""
from pathlib import Path
import base64
import shutil

UPLOAD_DIR = Path(__file__).parent / "uploads"
DRAFTS_DIR = UPLOAD_DIR / "drafts"


def _decode_b64_image(data: str) -> tuple[bytes, str]:
    ext = "png"
    payload = data
    if data.startswith("data:"):
        header, payload = data.split(",", 1)
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
        elif "webp" in header:
            ext = "webp"
        elif "gif" in header:
            ext = "gif"
    return base64.b64decode(payload), ext


def _is_base64_image(value: str) -> bool:
    if not value:
        return False
    if value.startswith("data:image"):
        return True
    if value.startswith("/uploads/") or value.startswith("http"):
        return False
    return len(value) > 200


def persist_images(item_id: str, images: list[str], subfolder: str = "") -> list[str]:
    """保存图片列表到磁盘，返回 /uploads/... 可访问 URL 列表"""
    if not images:
        return []

    target = DRAFTS_DIR / item_id
    if subfolder:
        target = target / subfolder
    target.mkdir(parents=True, exist_ok=True)

    urls: list[str] = []
    for i, img in enumerate(images):
        if not img:
            continue
        normalized = img.replace("\\", "/")
        if normalized.startswith("/uploads/"):
            urls.append(normalized)
            continue
        if normalized.startswith("http://") or normalized.startswith("https://"):
            urls.append(normalized)
            continue
        if _is_base64_image(img):
            raw, ext = _decode_b64_image(img)
            fname = f"img_{i}.{ext}"
            (target / fname).write_bytes(raw)
            rel = f"drafts/{item_id}/"
            if subfolder:
                rel += f"{subfolder}/"
            rel += fname
            urls.append(f"/uploads/{rel}")
        else:
            urls.append(img)

    return urls


def first_url(urls: list[str]) -> str | None:
    return urls[0] if urls else None


def delete_draft_files(item_id: str) -> None:
    draft = DRAFTS_DIR / item_id
    if draft.exists():
        shutil.rmtree(draft, ignore_errors=True)
