# account/management/commands/seed_test_data.py

import json
import random
import time
from decimal import Decimal
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import close_old_connections, connection, transaction

from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    ImageValidationError,
)
from account.models import Accounts
from businesses.models import Businesses
from plans.models import Plan
from posts.models import Posts
from products.models import Products, ProductImage, ProductProperty
from stories.models import Story
from subscription.services import subscribe


# ============================================================
# CONFIG
# ============================================================

IMAGE_FOLDER = Path("/home/davis-ikou/warehouse/test images")
MANIFEST_PATH = Path("./_seed_image_manifest.json")

BUSINESSES_PER_USER   = 2
POSTS_PER_BUSINESS    = 10
PRODUCTS_PER_BUSINESS = 10
STORIES_PER_USER      = 1


# ============================================================
# SAMPLE DATA
# ============================================================

FIRST_NAMES = [
    "James", "Amina", "Brian", "Wanjiku", "Kevin", "Nyambura",
    "Peter", "Aisha", "John", "Fatuma", "Mary", "Otieno",
    "Grace", "Kamau", "Faith", "Mwangi", "Jane", "Kipchoge",
    "Sarah", "Ahmed", "David", "Esther", "Sam", "Lucy",
]

LAST_NAMES = [
    "Smith", "Okafor", "Mwangi", "Wanjiru", "Otieno", "Njeri",
    "Kiprop", "Abdalla", "Mutua", "Nyambura", "Kamau", "Were",
    "Karanja", "Ochieng", "Njoroge", "Maina", "Chebet", "Omondi",
]

COUNTIES = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
    "Kajiado", "Uasin Gishu", "Meru", "Kakamega", "Kisii", "Nyeri",
]

CITIES = [
    "Nairobi CBD", "Westlands", "Karen", "Mombasa Island", "Nyali",
    "Kisumu City", "Nakuru Town", "Thika", "Ruaka", "Kilimani",
]

REGIONS = [
    "Kasuku", "Kawangware", "Kasarani", "Embakasi", "Langata",
    "Kibera", "Runda", "Muthaiga", "Ngong", "Kitengela",
]

BUSINESS_TYPES_GOODS = [
    "Fashion & Apparel", "Electronics", "Groceries & Food",
    "Beauty & Cosmetics", "Home & Furniture", "Vehicle & Automotive",
    "Agriculture & Livestock", "Sports & Outdoor", "Books & Stationery",
    "Jewellery & Watches",
]

BUSINESS_TYPES_SERVICES = [
    "Consulting", "Repair & Maintenance", "Photography",
    "Cleaning Services", "Tutoring", "Event Planning",
    "Beauty & Spa", "Logistics & Delivery", "Financial Services",
    "Legal Services",
]

BUSINESS_NAME_A = [
    "Acme", "Prime", "Royal", "Golden", "Silver", "Sunrise",
    "Green", "Blue", "Red", "Bright", "Swift", "Nova", "Brighton",
    "Modern", "Elite", "Superb", "Excel", "Apex", "Luxe", "Urban",
]
BUSINESS_NAME_B = [
    "Traders", "Enterprises", "Hub", "Mart", "Studio", "Works",
    "Co", "Center", "Corner", "Point", "Group", "Collective",
    "Supply", "Services", "Solutions", "Depot", "Outlet", "Bazaar",
]

POST_TITLES = [
    "New arrivals are here", "Weekend promo — don't miss out",
    "Meet the team behind the scenes", "Big restock this week",
    "Customer spotlight", "How we started",
    "What's new this month", "Behind the scenes",
    "Try our new product range", "10% off everything this Friday",
]

POST_BODIES = [
    "We're excited to share our latest update with the community.",
    "Fresh stock just landed. Come by and see what's new.",
    "Our team has been hard at work and we can't wait to show you.",
    "Because of your continued support, we've grown.",
    "A special weekend for our loyal customers.",
]

PRODUCT_ADJECTIVES = [
    "Premium", "Classic", "Modern", "Handcrafted", "Vintage",
    "Limited Edition", "Deluxe", "Signature", "Essential", "Artisan",
]
PRODUCT_NOUNS = [
    "T-shirt", "Coffee Mug", "Sneakers", "Watch", "Bag",
    "Jacket", "Notebook", "Lamp", "Bottle", "Keychain",
]
PRODUCT_PROPERTY_POOL = [
    ("Material", ["Cotton", "Leather", "Steel", "Canvas", "Wool"]),
    ("Colour",   ["Black", "Navy", "Beige", "White", "Grey"]),
    ("Size",     ["S", "M", "L", "XL", "One-size"]),
    ("Care",     ["Hand wash", "Machine wash", "Spot clean"]),
    ("Origin",   ["Made in Kenya", "Imported", "Local craft"]),
]

STORY_TITLES = [
    "How we built our brand from scratch",
    "The day everything changed",
    "Lessons from our first year",
    "Why we do what we do",
]

STORY_CONTENT = [
    "It started with a simple idea and a lot of late nights.",
    "Every business has a beginning. Ours started in a tiny room.",
    "The first year was brutal. We made mistakes, lost money.",
    "They say you never forget your first customer.",
]

STORY_CATEGORIES = [choice[0] for choice in Story.CATEGORY_CHOICES]


# ============================================================
# IMAGE MANIFEST — caches Cloudinary uploads across runs
# ============================================================

class ImageManifest:
    def __init__(self, path: Path):
        self.path = path
        self._data: dict[str, dict] = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text())
            except Exception:
                self._data = {}

    def save(self):
        self.path.write_text(json.dumps(self._data, indent=2))

    def cached(self, local_path: Path) -> dict | None:
        return self._data.get(str(local_path))

    def get_or_upload(self, local_path: Path, folder: str) -> dict | None:
        key = str(local_path)
        if key in self._data:
            return self._data[key]

        try:
            extension = local_path.suffix.lower()
            content_type = {
                ".png":  "image/png",
                ".jpg":  "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }.get(extension, "application/octet-stream")

            with open(local_path, "rb") as f:
                upload = SimpleUploadedFile(
                    name=local_path.name,
                    content=f.read(),
                    content_type=content_type,
                )
                result = upload_image_to_cloudinary(upload, folder=folder)

            entry = {
                "url": result["url"],
                "public_id": result["public_id"],
            }
            self._data[key] = entry
            return entry
        except ImageValidationError as e:
            print(f"  ⚠️  Invalid image {local_path.name}: {e}")
            return None
        except Exception as e:
            print(f"  ⚠️  Failed to upload {local_path.name}: {e}")
            return None


# ============================================================
# COMMAND
# ============================================================

class Command(BaseCommand):
    help = (
        "Seed test users with businesses, posts, products, "
        "and stories. Images come from the configured folder."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--users", type=int, default=500,
            help="Number of users to create (default 500)",
        )
        parser.add_argument(
            "--start-index", type=int, default=1,
            help="Starting number for user emails (default 1)",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Count everything, no DB writes, no uploads",
        )
        parser.add_argument(
            "--limit-images", type=int, default=20,
            help=(
                "Max unique images to upload (default 20). "
                "Each unique image takes ~1s on first run; "
                "subsequent runs hit the manifest cache."
            ),
        )
        parser.add_argument(
            "--sleep", type=float, default=0.3,
            help=(
                "Seconds to pause between users (default 0.3). "
                "Recommended on managed Postgres to avoid proxy "
                "rate limits and SSL drops."
            ),
        )

    # ========================================================
    # MAIN
    # ========================================================

    def handle(self, *args, **opts):
        users_to_create = opts["users"]
        start_index = opts["start_index"]
        dry = opts["dry_run"]
        limit_images = max(1, opts["limit_images"])
        sleep_seconds = max(0.0, opts["sleep"])

        # ── 1. Default plan ──────────────────────────────
        close_old_connections()
        default_plan = Plan.objects.filter(is_default=True).first()
        if default_plan is None:
            self.stderr.write(self.style.ERROR(
                "No default plan found. Create one first:\n"
                "  python manage.py shell\n"
                "  >>> from plans.models import Plan\n"
                "  >>> Plan.objects.update_or_create(\n"
                "  ...   slug='pro',\n"
                "  ...   defaults={\n"
                "  ...     'plan_name':'Pro', 'is_default':True,\n"
                "  ...     'is_active':True, 'billing_cycle':'monthly',\n"
                "  ...   })\n"
            ))
            return

        self.stdout.write(self.style.SUCCESS(
            f"Using default plan: {default_plan.plan_name} "
            f"(slug={default_plan.slug})"
        ))

        # ── 2. Image folder ──────────────────────────────
        if not IMAGE_FOLDER.exists():
            self.stderr.write(self.style.ERROR(
                f"Image folder not found: {IMAGE_FOLDER}"
            ))
            return

        all_images = [
            p for p in IMAGE_FOLDER.iterdir()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        if not all_images:
            self.stderr.write(self.style.ERROR(
                f"No valid images in {IMAGE_FOLDER}"
            ))
            return

        # ── 3. Totals ─────────────────────────────────────
        total_businesses = users_to_create * BUSINESSES_PER_USER
        total_posts      = total_businesses * POSTS_PER_BUSINESS
        total_products   = total_businesses * PRODUCTS_PER_BUSINESS
        total_stories    = users_to_create * STORIES_PER_USER
        total_images_ref = total_posts + total_products

        # ── 4. DRY RUN ────────────────────────────────────
        if dry:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING(
                "=== DRY RUN — no writes, no uploads ==="
            ))
            self.stdout.write("")
            self.stdout.write(f"  Image folder:           {IMAGE_FOLDER}")
            self.stdout.write(f"  Images available:       {len(all_images)}")
            self.stdout.write(
                f"  Max unique uploads:     "
                f"{min(limit_images, len(all_images))}"
            )
            self.stdout.write("")
            self.stdout.write(f"  Users to create:        {users_to_create}")
            self.stdout.write(f"  Businesses:             {total_businesses}")
            self.stdout.write(f"  Posts:                  {total_posts}")
            self.stdout.write(f"  Products:               {total_products}")
            self.stdout.write(f"  Product images:         {total_products}")
            self.stdout.write(f"  Stories:                {total_stories}")
            self.stdout.write("")
            self.stdout.write(f"  Total image references: {total_images_ref}")
            self.stdout.write(f"  Sleep between users:    {sleep_seconds}s")
            self.stdout.write("")
            self.stdout.write("To actually run:")
            self.stdout.write(
                f"  DJANGO_DB_CONN_MAX_AGE=0 "
                f"python manage.py seed_test_data "
                f"--users {users_to_create} "
                f"--limit-images {limit_images} "
                f"--sleep {sleep_seconds}"
            )
            return

        # ── 5. Real run banner ────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== SEEDING (REAL RUN) ==="))
        self.stdout.write(f"  Users:           {users_to_create}")
        self.stdout.write(f"  Businesses each: {BUSINESSES_PER_USER}")
        self.stdout.write(f"  Posts each:      {POSTS_PER_BUSINESS}")
        self.stdout.write(f"  Products each:   {PRODUCTS_PER_BUSINESS}")
        self.stdout.write(
            f"  Max uploads:     {min(limit_images, len(all_images))}"
        )
        self.stdout.write(f"  Sleep:           {sleep_seconds}s")
        self.stdout.write("")

        # ── 6. DB reachability check ──────────────────────
        try:
            close_old_connections()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            self.stdout.write(self.style.SUCCESS(
                "Database reachable — starting seed."
            ))
        except Exception as e:
            self.stderr.write(self.style.ERROR(
                f"Cannot reach database: {e}"
            ))
            return

        # ── 7. Manifest + uploads ─────────────────────────
        manifest = ImageManifest(MANIFEST_PATH)
        to_upload = all_images[:limit_images]
        uploaded_ok: list[dict] = []
        already_cached = 0
        upload_started = time.time()

        self.stdout.write(f"Preparing {len(to_upload)} unique images…")
        for i, path in enumerate(to_upload, 1):
            cached = manifest.cached(path)
            if cached:
                uploaded_ok.append(cached)
                already_cached += 1
                continue

            self.stdout.write(
                f"  [{i}/{len(to_upload)}] uploading {path.name}…",
                ending="",
            )
            entry = manifest.get_or_upload(path, folder="seed_test_images")
            self.stdout.write(" done" if entry else " FAILED")
            if entry:
                uploaded_ok.append(entry)

            manifest.save()

        if not uploaded_ok:
            self.stderr.write(self.style.ERROR(
                "No images could be uploaded. Aborting."
            ))
            return

        upload_time = time.time() - upload_started
        self.stdout.write(self.style.SUCCESS(
            f"Ready with {len(uploaded_ok)} images "
            f"({already_cached} from cache, {upload_time:.1f}s)"
        ))
        self.stdout.write("")

        # ── 8. Force-fresh DB socket after upload pause ───
        close_old_connections()
        self.stdout.write("DB connection reset — starting user loop.\n")

        # ── 9. User loop ──────────────────────────────────
        counts = {
            "users_created":  0,
            "users_skipped":  0,
            "businesses":     0,
            "posts":          0,
            "products":       0,
            "product_images": 0,
            "stories":        0,
            "errors":         0,
        }

        started = time.time()

        for offset in range(users_to_create):
            i = start_index + offset
            email = f"seeduser{i}@seed.local"

            # Fresh socket every iteration
            close_old_connections()

            # Skip existing (idempotent)
            try:
                if Accounts.objects.filter(email=email).exists():
                    counts["users_skipped"] += 1
                    continue
            except Exception:
                close_old_connections()
                try:
                    if Accounts.objects.filter(email=email).exists():
                        counts["users_skipped"] += 1
                        continue
                except Exception:
                    counts["errors"] += 1
                    continue

            try:
                # User + subscription (own transaction)
                with transaction.atomic():
                    user = self._create_user(i, email, default_plan)
                counts["users_created"] += 1

                # Each business = own transaction
                for b_idx in range(BUSINESSES_PER_USER):
                    try:
                        with transaction.atomic():
                            biz = self._create_business(user, b_idx, i)
                            counts["businesses"] += 1

                            for p_idx in range(POSTS_PER_BUSINESS):
                                img = random.choice(uploaded_ok)
                                self._create_post(biz, p_idx, img)
                                counts["posts"] += 1

                            for pr_idx in range(PRODUCTS_PER_BUSINESS):
                                img = random.choice(uploaded_ok)
                                self._create_product(biz, pr_idx, img)
                                counts["products"] += 1
                                counts["product_images"] += 1
                    except Exception as biz_err:
                        self.stderr.write(self.style.WARNING(
                            f"  business {b_idx} for {email} failed: {biz_err}"
                        ))
                        close_old_connections()

                # Story (own transaction)
                try:
                    with transaction.atomic():
                        self._create_story(user)
                    counts["stories"] += 1
                except Exception as story_err:
                    self.stderr.write(self.style.WARNING(
                        f"  story for {email} failed: {story_err}"
                    ))
                    close_old_connections()

            except Exception as e:
                counts["errors"] += 1
                self.stderr.write(self.style.WARNING(
                    f"User {email} failed: {e}"
                ))
                close_old_connections()
                continue

            # Sleep between users
            if sleep_seconds > 0:
                time.sleep(sleep_seconds)

            # Progress every 10 users
            if (offset + 1) % 10 == 0:
                elapsed = time.time() - started
                rate = (offset + 1) / elapsed if elapsed > 0 else 1
                remaining = (users_to_create - offset - 1) / rate
                self.stdout.write(
                    f"[{offset + 1}/{users_to_create}] "
                    f"{elapsed:.0f}s elapsed, "
                    f"~{remaining:.0f}s remaining "
                    f"(users={counts['users_created']}, "
                    f"posts={counts['posts']}, "
                    f"products={counts['products']})"
                )

        # ── 10. Summary ───────────────────────────────────
        elapsed = time.time() - started
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("SEED COMPLETE"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        for k, v in counts.items():
            self.stdout.write(f"  {k:20s} {v}")
        self.stdout.write(f"  {'elapsed':20s} {elapsed:.1f}s")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Manifest cached at {MANIFEST_PATH} "
            f"({len(manifest._data)} entries) — "
            f"re-runs reuse these uploads."
        ))

    # ========================================================
    # CREATION HELPERS
    # ========================================================

    def _create_user(self, i: int, email: str, default_plan: Plan) -> Accounts:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)

        user = Accounts.objects.create_user(
            email=email,
            password="TestPass123!",
            first_name=first,
            last_name=last,
            gender=random.choice(["M", "F"]),
            phone_number=f"+2547{random.randint(10_000_000, 99_999_999)}",
            is_active=True,
            role="user",
            auth_provider="local",
        )

        subscribe(user, default_plan, note="Seed subscription.")
        return user

    def _create_business(self, user: Accounts, index: int, seed_num: int):
        category = random.choice(["goods", "services"])
        types = (
            BUSINESS_TYPES_GOODS
            if category == "goods"
            else BUSINESS_TYPES_SERVICES
        )
        name = (
            f"{random.choice(BUSINESS_NAME_A)} "
            f"{random.choice(BUSINESS_NAME_B)} {seed_num}{index}"
        )

        return Businesses.objects.create(
            owner=user,
            business_name=name,
            business_category=category,
            business_type=random.choice(types),
            description=(
                f"A test business for seed data. "
                f"Located in {random.choice(CITIES)}."
            ),
            county=random.choice(COUNTIES),
            city_town=random.choice(CITIES),
            region=random.choice(REGIONS),
            status="active",
        )

    def _create_post(self, biz: Businesses, index: int, image: dict):
        Posts.objects.create(
            business=biz,
            title=random.choice(POST_TITLES),
            body=random.choice(POST_BODIES),
            image_url=image["url"],
            image_public_id=image["public_id"],
        )

    def _create_product(self, biz: Businesses, index: int, image: dict):
        name = (
            f"{random.choice(PRODUCT_ADJECTIVES)} "
            f"{random.choice(PRODUCT_NOUNS)} {index + 1}"
        )
        product = Products.objects.create(
            business=biz,
            name=name,
            description=(
                f"A quality {name.lower()}. Comes in multiple sizes "
                f"and colours. Perfect for everyday use."
            ),
            price=Decimal(random.randint(200, 15_000)),
        )

        ProductImage.objects.create(
            product=product,
            image_url=image["url"],
            image_public_id=image["public_id"],
            is_primary=True,
            sort_order=0,
        )

        prop_choices = random.sample(
            PRODUCT_PROPERTY_POOL, k=random.randint(2, 3)
        )
        for order, (prop_name, values) in enumerate(prop_choices):
            ProductProperty.objects.create(
                product=product,
                name=prop_name,
                value=random.choice(values),
                sort_order=order,
            )

    def _create_story(self, user: Accounts):
        Story.objects.create(
            user=user,
            title=random.choice(STORY_TITLES),
            content=random.choice(STORY_CONTENT),
            category=random.choice(STORY_CATEGORIES),
        )