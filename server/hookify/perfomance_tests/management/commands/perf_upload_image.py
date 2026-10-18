# performance_tests/management/commands/perf_upload_image.py

import random

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)

from performance_tests.utils import (
    list_sample_images,
    save_result,
    stopwatch,
)


class Command(BaseCommand):
    help = (
        "Perf test: upload one random image from performance_tests/images/, "
        "verify the returned URL, then delete it. Measures upload + delete."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--runs", type=int, default=1,
            help="How many upload/delete cycles to run (default 1).",
        )

    def handle(self, *args, **opts):
        runs = max(1, opts["runs"])

        images = list_sample_images()
        if not images:
            self.stderr.write(self.style.ERROR(
                "No images found in performance_tests/images/. "
                "Add at least 2–3 .jpg/.png/.webp files."
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"=== IMAGE UPLOAD PERF TEST ({runs} run(s)) ==="
        ))
        self.stdout.write(f"  Images available: {len(images)}")

        results = []

        for run in range(1, runs + 1):
            local = random.choice(images)

            self.stdout.write("")
            self.stdout.write(
                f"── Run {run}/{runs} · {local.name} "
                f"({local.stat().st_size / 1024:.1f} KB)"
            )

            # ── UPLOAD ──────────────────────────────────
            with stopwatch("upload") as up_timer:
                with open(local, "rb") as f:
                    upload = SimpleUploadedFile(
                        name=local.name,
                        content=f.read(),
                        content_type={
                            ".jpg": "image/jpeg",
                            ".jpeg": "image/jpeg",
                            ".png": "image/png",
                            ".webp": "image/webp",
                        }.get(local.suffix.lower(), "application/octet-stream"),
                    )
                    uploaded = upload_image_to_cloudinary(
                        upload, folder="perf_tests",
                    )

            # ── VERIFY ──────────────────────────────────
            url_ok = (
                uploaded
                and uploaded.get("url")
                and uploaded["url"].startswith("https://")
            )

            # ── DELETE ──────────────────────────────────
            deleted_ok = False
            delete_error = None
            if uploaded and uploaded.get("public_id"):
                with stopwatch("delete") as del_timer:
                    try:
                        delete_image_from_cloudinary(uploaded["public_id"])
                        deleted_ok = True
                    except Exception as e:
                        delete_error = str(e)
            else:
                del_timer = type("T", (), {"elapsed": 0.0})()

            results.append({
                "run": run,
                "file": local.name,
                "bytes": local.stat().st_size,
                "upload_ms": round(up_timer.elapsed * 1000, 1),
                "delete_ms": round(del_timer.elapsed * 1000, 1),
                "url_ok": url_ok,
                "deleted_ok": deleted_ok,
                "delete_error": delete_error,
                "public_id": uploaded.get("public_id") if uploaded else None,
            })

            self.stdout.write(
                f"  url_ok={url_ok}  deleted_ok={deleted_ok}"
            )

        # ── SUMMARY ─────────────────────────────────────
        upload_times = [r["upload_ms"] for r in results]
        delete_times = [r["delete_ms"] for r in results]

        summary = {
            "runs": runs,
            "avg_upload_ms": round(sum(upload_times) / len(upload_times), 1),
            "min_upload_ms": min(upload_times),
            "max_upload_ms": max(upload_times),
            "avg_delete_ms": round(sum(delete_times) / len(delete_times), 1),
            "min_delete_ms": min(delete_times),
            "max_delete_ms": max(delete_times),
            "all_deleted": all(r["deleted_ok"] for r in results),
            "all_url_ok": all(r["url_ok"] for r in results),
            "details": results,
        }

        path = save_result("perf_upload_image", summary)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("IMAGE UPLOAD PERF TEST — SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Runs:                 {runs}")
        self.stdout.write(f"  Upload  avg / min / max: "
                          f"{summary['avg_upload_ms']} / "
                          f"{summary['min_upload_ms']} / "
                          f"{summary['max_upload_ms']} ms")
        self.stdout.write(f"  Delete  avg / min / max: "
                          f"{summary['avg_delete_ms']} / "
                          f"{summary['min_delete_ms']} / "
                          f"{summary['max_delete_ms']} ms")
        self.stdout.write(f"  All URLs valid:       {summary['all_url_ok']}")
        self.stdout.write(f"  All deleted:          {summary['all_deleted']}")
        self.stdout.write("")
        self.stdout.write(f"  Result saved: {path}")