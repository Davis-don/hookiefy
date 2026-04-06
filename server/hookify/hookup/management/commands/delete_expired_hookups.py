from django.core.management.base import BaseCommand
from hookup.views import delete_expired_hookups

class Command(BaseCommand):
    help = 'Delete expired hookups based on scheduled deletion time'

    def handle(self, *args, **options):
        count = delete_expired_hookups()
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {count} expired hookups')
        )