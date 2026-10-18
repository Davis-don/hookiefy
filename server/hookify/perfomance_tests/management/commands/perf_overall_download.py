# performance_tests/management/commands/perf_overall_download.py

import random
import uuid
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.test import Client

from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)
from account.models import Accounts
from businesses.models import Businesses
from plans.models import Plan
from posts.models import Posts
from products.models import Products, ProductImage
from stories.models import Story
from subscription.services import subscribe

from performance_tests.utils import (
    cleanup_user,
    list_sample_images,
    save_result,
    stopwatch,
)


class Command(BaseCommand):
    help = (
        "Perf test: create a fixture user + content, then measure how long "
        "each API endpoint takes to return its data. Deletes everything "
        "at the end."
    )

    def handle(self, *args, **opts):
        default_plan = Plan.objects.filter(is_default=True).first()
        if default_plan is None:
            self.stderr.write(self.style.ERROR(
                "No default plan found. Run seed setup first."
            ))
            return

        images = list_sample_images()
        if not images:
            self.stderr.write(self.style.ERROR(
                "No images found in performance_tests/images/."
            ))
            return

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("OVERALL DOWNLOAD PERF TEST"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        uid = uuid.uuid4().hex[:10]
        email = f"perf_download_{uid}@perf.local"

        # ── 1. Setup: image ──────────────────────────────
        self.stdout.write("\n── Setting up fixture…")
        local = random.choice(images)
        with open(local, "rb") as f:
            upload = SimpleUploadedFile(
                name=local.name, content=f.read(), content_type="image/jpeg",
            )
            image = upload_image_to_cloudinary(upload, folder="perf_tests")

        # ── 2. Setup: user + content ─────────────────────
        with transaction.atomic():
            user = Accounts.objects.create_user(
                email=email,
                password="PerfTest123!",
                first_name="Perf",
                last_name="Download",
                is_active=True,
                role="user",
                auth_provider="local",
            )
            subscribe(user, default_plan, note="Perf test subscription.")

            business = Businesses.objects.create(
                owner=user,
                business_name=f"Perf Biz {uid}",
                business_category="goods",
                business_type="Fashion & Apparel",
                description="Perf test business.",
                county="Nairobi",
                city_town="Nairobi CBD",
                region="Kasuku",
                status="active",
            )

            post_ids = []
            for i in range(5):
                p = Posts.objects.create(
                    business=business,
                    title=f"Download perf post {i + 1}",
                    body=f"Body {i + 1}.",
                    image_url=image["url"],
                    image_public_id=image["public_id"],
                )
                post_ids.append(p.id)

            product_ids = []
            for i in range(5):
                pr = Products.objects.create(
                    business=business,
                    name=f"Download perf product {i + 1}",
                    description=f"Description {i + 1}.",
                    price=Decimal(random.randint(100, 5000)),
                )
                ProductImage.objects.create(
                    product=pr,
                    image_url=image["url"],
                    image_public_id=image["public_id"],
                    is_primary=True,
                )
                product_ids.append(pr.id)

            Story.objects.create(
                user=user,
                title=f"Download perf story {uid}",
                content="A short story.",
                category="journey",
            )

        self.stdout.write(self.style.SUCCESS("  Fixture ready."))

        # ── 3. Auth: grab a JWT so we can hit protected endpoints ──
        client = Client()

        # Login via the actual endpoint
        login_resp = client.post(
            "/account/login/",
            data={"email": email, "password": "PerfTest123!"},
            content_type="application/json",
        )
        if login_resp.status_code != 200:
            self.stderr.write(self.style.ERROR(
                f"Login failed: {login_resp.status_code} {login_resp.content[:200]}"
            ))
            cleanup_user(user)
            return

        token = login_resp.json()["tokens"]["access"]
        auth = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

        # ── 4. Measure each endpoint ─────────────────────
        tests = [
            ("feed businessess/mine",
             f"/feed/businesses/mine/?kind=all&limit=10", auth),
            ("post detail",
             f"/posts/{post_ids[0]}/", {}),
            ("product detail",
             f"/products/{product_ids[0]}/", {}),
            ("business details",
             f"/businesses/{business.id}/details/", auth),
            ("my businesses",
             "/businesses/mine/", auth),
            ("current subscription",
             "/subscription/current/", auth),
            ("all stories",
             "/stories/", auth),
        ]

        timings = {}

        for label, url, headers in tests:
            # Warm-up (some endpoints cache, some don't — measure a clean run)
            try:
                client.get(url, **headers)
            except Exception:
                pass

            # Timed run — 3 iterations, keep the average
            samples = []
            for _ in range(3):
                with stopwatch() as t:
                    try:
                        resp = client.get(url, **headers)
                        status = resp.status_code
                    except Exception as e:
                        status = f"ERR: {e}"
                samples.append(t.elapsed * 1000)

            avg = round(sum(samples) / len(samples), 1)
            timings[label] = {
                "url": url,
                "status": status,
                "avg_ms": avg,
                "samples_ms": [round(s, 1) for s in samples],
            }

            self.stdout.write(
                f"  {label:25s} {status!s:>5}  {avg:>7.1f} ms"
            )

        # ── 5. Teardown ──────────────────────────────────
        self.stdout.write("\n── Cleaning up…")
        try:
            delete_image_from_cloudinary(image["public_id"])
        except Exception as e:
            self.stderr.write(self.style.WARNING(f"  Could not delete Cloudinary: {e}"))

        cleanup_user(user)

        # ── 6. Summary ───────────────────────────────────
        summary = {
            "email": email,
            "business_id": business.id,
            "post_ids": post_ids,
            "product_ids": product_ids,
            "timings": timings,
        }
        path = save_result("perf_overall_download", summary)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("OVERALL DOWNLOAD — SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        for label, t in timings.items():
            self.stdout.write(
                f"  {label:25s} {t['status']!s:>5}  {t['avg_ms']:>7.1f} ms"
            )
        self.stdout.write("")
        self.stdout.write(f"  Result saved: {path}")