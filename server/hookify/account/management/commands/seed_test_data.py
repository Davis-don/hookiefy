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


# ============================================================
# STORY GENERATION — long-form prose blocks
# ============================================================
#
# Each story is assembled from six distinct beats:
#     opening  →  middle-A  →  middle-B  →  lesson-A  →  lesson-B  →  closing
#
# Middles and lessons are drawn WITHOUT replacement, so no two
# blocks in the same story repeat. That gives 6 paragraphs and
# roughly 2,500–4,000 characters per story — long enough to
# read like a real founder essay, short enough to fit the
# "Continue reading" expand/collapse UI in the app.
#
# Business-specific placeholders ({business_name}, {city},
# {county}, {business_type}, {business_type_lower}) are
# interpolated, so every story reads as if it were written
# about that user's own business, not a generic template.
# ============================================================


# ── Openings ────────────────────────────────────────────────
STORY_OPENINGS = [
    "I started {business_name} in {city} in 2021, from a small "
    "corner of my one-bedroom apartment. I had two hundred "
    "shillings in stock and no idea what I was doing. There was "
    "no plan — just a borrowed table, a chair that wobbled, and "
    "the conviction that if I didn't try this now, I probably "
    "never would.",

    "There was no grand plan when I opened {business_name}. Just "
    "a table, a chair, and the kind of stubbornness that only a "
    "first-time business owner has. The shop was in {city} and "
    "it fit in a space smaller than most kitchens. The landlord "
    "asked for three months' rent up front and I paid it with "
    "money I had been saving since university — for what, I "
    "don't remember.",

    "The first thing I ever sold under the {business_name} name "
    "was one unit, to a cousin, on the 3rd of March. That's the "
    "whole origin story. No investors, no launch, no press. Just "
    "one sale and a very long list of things I didn't know yet. "
    "I made a note of that sale on a yellow Post-it and stuck it "
    "to the fridge. I still have the Post-it.",

    "When I look back at how {business_name} began, I don't "
    "remember the plan. I remember the panic. I had taken a loan "
    "from my sister, set up in {city}, and told myself the only "
    "way out was forward. It's easy to say that now — it's much "
    "harder to live inside it when the rent is due in four days "
    "and the till is short by a full week's wage.",

    "Before {business_name}, I had tried three other things. Each "
    "of them failed in a different way, and each of them taught "
    "me something I could only learn by actually failing. This "
    "one was different, but not for the reasons I expected. It "
    "was different because I had finally learned to move slowly, "
    "to ask for help, and to say the word no more often than I "
    "said yes.",

    "The first version of {business_name} existed in a WhatsApp "
    "status and a notebook, for about three months, before I "
    "rented anything. I wanted to prove, before spending a "
    "shilling, that people would actually buy the thing I "
    "wanted to sell. So I wrote down the idea, posted a photo "
    "of the stock I hadn't bought yet, and took orders on "
    "promise. Three people believed me. That was enough to "
    "start.",
]


# ── Middle beats — TWO chosen per story ─────────────────────
STORY_MIDDLES = [
    "The first six months were brutal. I had assumed the work "
    "would be the products — {business_type_lower} — but the "
    "work turned out to be everything else. Customer complaints "
    "at 10pm. A courier who lost a delivery. A regular who "
    "stopped showing up without explanation. Every problem felt "
    "like a crisis until it became routine, and then it stopped "
    "feeling like anything. It's strange how quickly the "
    "unbearable becomes the normal.",

    "What nobody tells you about {business_type_lower} is how "
    "much of it happens off the shop floor. I spent more evenings "
    "on inventory spreadsheets than I ever spent with customers. "
    "I learned to reconcile numbers in my head while waiting for "
    "the bus home. That's not a chapter of the story anyone puts "
    "in a pitch deck, but it's most of what actually happened. "
    "The work nobody photographs is the work that keeps the "
    "business alive.",

    "There was a stretch — maybe four months — when I was sure "
    "I'd have to shut it down. Rent was due, my stock was "
    "sitting, and every sale felt like luck rather than proof "
    "that the thing could work. I remember one week where I made "
    "exactly enough to cover the transport to the shop and back. "
    "Nothing else. That week taught me more about margins than "
    "any advice column ever did, and I have never forgotten the "
    "number in the notebook.",

    "The turning point wasn't a big sale. It wasn't a viral "
    "moment or a feature in a magazine. It was a Tuesday "
    "afternoon when I realised I had made enough that month to "
    "pay every bill on time, including the loan from my sister. "
    "Nobody celebrated with me. There was no photo. But it was "
    "the day I stopped quietly assuming {business_name} would "
    "fail, and started assuming it wouldn't.",

    "Building {business_name} meant unlearning almost everything "
    "I thought I knew. I had to learn to listen to what "
    "customers were actually buying instead of what I wanted to "
    "sell them. I had to learn to charge properly — the price I "
    "had been afraid to ask, the one that would actually let the "
    "business survive — and then not apologise for it. That "
    "second part took years.",

    "I hired my first employee about a year in, and I was "
    "terrified of it. I had never managed anyone. I didn't know "
    "how to explain the work without doing it myself first. The "
    "first week I followed them around the shop, pointing at "
    "things, contradicting myself. By the second week I realised "
    "the point wasn't to teach them to be me. It was to teach "
    "them to run {business_name} well enough that I could trust "
    "it — and to trust it well enough that I could walk away for "
    "a day. That took months to build, not weeks.",

    "The month the shop flooded was the month I nearly gave up "
    "for good. A burst pipe in the unit above, a Saturday "
    "morning, an inch of water across the floor and every box on "
    "the bottom shelf ruined. I stood in the middle of it and "
    "cried. Then I called my sister, who told me to stop crying "
    "and start writing down what was lost. Two hours later we "
    "had a list. Three days later we had the shop back open. "
    "That's the whole story of running a small business: the "
    "disaster is real, and the recovery is unglamorous, and you "
    "do it anyway.",

    "What nobody warns you about growth is how it quietly "
    "changes the shape of your days. At the beginning, I knew "
    "every customer by name. At some point I stopped knowing the "
    "new ones. I had to make a decision then — was I building a "
    "shop that I happened to be in, or a brand that existed "
    "without me? The answer took another year to find. It's "
    "still not fully answered, honestly. But every Monday "
    "morning, I know which one I'm trying to build.",

    "There's a specific kind of loneliness to running your own "
    "thing, especially in {county}, especially in the early "
    "stages. None of your friends understand why you can't come "
    "to the party. Your family worries you're throwing away a "
    "good salary somewhere. And you can't explain the work to "
    "anyone, because half of it is invisible even to you. That "
    "loneliness is normal. It's not a sign that something's "
    "wrong with you or the business. It's just the cost of the "
    "work.",
]


# ── Lessons — TWO chosen per story ──────────────────────────
STORY_LESSONS = [
    "If I could go back and tell myself one thing, it would be "
    "to move slower at the start. I bought too much stock too "
    "fast because I mistook optimism for preparation. Slower, "
    "smaller, and cheaper would have taught me the same lessons "
    "with less damage when they went wrong.",

    "The best thing I did was talk to other people running "
    "similar businesses. Not as competitors — as peers. A woman "
    "running a {business_type_lower} shop one neighbourhood over "
    "explained how she handled returns. A man I met through a "
    "supplier told me the way to price the thing I'd been "
    "guessing at for weeks. Nobody owed me those conversations. "
    "They answered because someone had once answered for them.",

    "The thing I wish I had done sooner is write things down. "
    "Not for the business — for me. A short note at the end of "
    "each week about what worked, what didn't, what confused me. "
    "Looking back, I can trace almost every good decision to "
    "something I had already written down a year before I made "
    "it. The note was the signal; I just hadn't recognised it "
    "yet.",

    "I learned that the customer who complains is worth ten who "
    "don't. Every complaint I've ever received, once I got past "
    "the sting of it, has been a free product design consult "
    "delivered by someone who cared enough to write it. The "
    "customers who quietly stop buying are the ones who hurt "
    "more, because they never tell you what went wrong.",

    "The most expensive mistake I made was trying to be "
    "everything to everyone in the first year. I stocked things "
    "I didn't believe in because I thought I had to. I ran "
    "promotions that made no money because I thought I had to. "
    "The business only started working when I let myself pick a "
    "lane — a specific kind of customer, a specific kind of "
    "sale — and stopped apologising for the things I chose not "
    "to do.",

    "Two things saved me more than any advice column: pricing "
    "for the margin I actually needed, and keeping a buffer for "
    "the months that go wrong. Both sound obvious. Both were "
    "the last things I did, not the first. If a friend were "
    "starting today, I would tell them to build the buffer "
    "before the brand, before the logo, before anything.",

    "I used to think discipline meant doing more. Now I think "
    "it means doing the same small things every week without "
    "waiting to feel like it. Opening the shop on time. Counting "
    "the till every night. Reviewing the week every Sunday. "
    "None of those things feel heroic in the moment. All of "
    "them, compounded over two years, are the reason "
    "{business_name} is still here.",

    "One thing I did that no one recommended — and that worked "
    "better than anything I tried — was keeping a small "
    "notebook of customer requests I said no to. Every time "
    "somebody asked for something I didn't stock, I wrote it "
    "down. After three months I had a pattern. After six, I had "
    "a new product line. The business grew by listening to the "
    "nos, not the yeses.",
]


# ── Closings ────────────────────────────────────────────────
STORY_CLOSINGS = [
    "I'm still here. Still running {business_name}, still in "
    "{city}, still learning. That's more than I expected when "
    "this started — and less than I hope to be able to say in "
    "another three years.",

    "If you're reading this and thinking of starting something "
    "of your own: the first day is the worst. The second day is "
    "the second worst. By day ninety, you're not scared anymore "
    "— you're tired, and being tired is much better than being "
    "scared. That's the whole advice. That's everything.",

    "{business_name} today looks nothing like the thing I "
    "imagined on day one. It's smaller in some ways, bigger in "
    "others. What matters is that it's mine, it pays its own "
    "bills, and it doesn't need me to explain it to anyone. If "
    "you had told me on the 3rd of March that I would still be "
    "here, I would have laughed. I'm not laughing anymore — "
    "I'm working.",

    "I don't know what the next five years look like. What I do "
    "know is that whatever comes, I'll be able to figure it "
    "out. Running this business taught me that — not as a "
    "slogan, but as something I've actually tested against the "
    "worst weeks.",

    "The end of this story isn't a big exit or an award or a "
    "magazine feature. The end of this story is another Monday. "
    "The shop opens at eight. The till gets counted at seven in "
    "the evening. The notebook gets its weekly entry on Sunday. "
    "Somewhere in between, {business_name} keeps going, quietly, "
    "one small decision at a time.",

    "If there's a moral to all of this, it's that you don't "
    "need a perfect plan. You need a small one, and the patience "
    "to keep showing up while it turns into something else. "
    "That's what {business_name} is now — not the plan I "
    "started with, but the thing the plan grew into. I like "
    "this version better.",
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

            close_old_connections()

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
                with transaction.atomic():
                    user = self._create_user(i, email, default_plan)
                counts["users_created"] += 1

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

            if sleep_seconds > 0:
                time.sleep(sleep_seconds)

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

    # --------------------------------------------------------
    # STORY TEXT BUILDER — 6-paragraph long-form story
    # --------------------------------------------------------
    #
    # Assembles a story from six distinct beats:
    #
    #     opening → middle-A → middle-B → lesson-A → lesson-B → closing
    #
    # Middles and lessons are drawn WITHOUT replacement (via
    # random.sample) so no two middles or two lessons repeat
    # inside the same story. Result: 6 paragraphs, ~2,500–4,000
    # characters, always focused on that user's business.
    # --------------------------------------------------------

    def _build_story_text(self, business: Businesses) -> str:
        """
        Return a 6-paragraph story about `business`.
        """
        ctx = {
            "business_name": business.business_name,
            "business_type": business.business_type,
            "business_type_lower": business.business_type.lower(),
            "city": business.city_town,
            "county": business.county,
        }

        opening = random.choice(STORY_OPENINGS).format(**ctx)

        # Two DISTINCT middles — random.sample without replacement.
        middles = random.sample(STORY_MIDDLES, k=2)

        # Two DISTINCT lessons — same idea, but on a different
        # pool so no cross-pool collision can reduce variety.
        lessons = random.sample(STORY_LESSONS, k=2)

        closing = random.choice(STORY_CLOSINGS).format(**ctx)

        paragraphs = [
            opening,
            middles[0].format(**ctx),
            middles[1].format(**ctx),
            lessons[0].format(**ctx),
            lessons[1].format(**ctx),
            closing,
        ]

        return "\n\n".join(paragraphs)

    def _create_story(self, user: Accounts):
        """
        Create one long, realistic story tied to the user's
        first business.
        """
        business = Businesses.objects.filter(owner=user).first()

        if business is not None:
            content = self._build_story_text(business)
            title_pool = [
                f"How I built {business.business_name} from scratch",
                f"The day {business.business_name} nearly closed",
                f"What I learned in my first year running "
                f"{business.business_name}",
                f"Why I started {business.business_name} — and what "
                f"I got wrong",
                f"Lessons from building a {business.business_type.lower()} "
                f"business in {business.city_town}",
                f"Six things I wish I had known before opening "
                f"{business.business_name}",
                f"The truth about running a small business in "
                f"{business.county}",
            ]
        else:
            content = (
                "I don't have a business right now, but I wanted "
                "to write something anyway.\n\n"
                "Here's what I've learned from watching other "
                "people build: the ones who make it aren't the "
                "ones who got lucky. They're the ones who kept "
                "showing up after the first year.\n\n"
                "That's the whole post."
            )
            title_pool = ["Why I'm still learning"]

        Story.objects.create(
            user=user,
            title=random.choice(title_pool),
            content=content,
            category=random.choice(STORY_CATEGORIES),
        )


        # DJANGO_DB_CONN_MAX_AGE=30 python manage.py seed_test_data --users 100 --start-index 1 --sleep 0.5