from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("api", "0007_stay_checked_in_at_stay_checked_out_at_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                'ALTER TABLE "api_stay" '
                'VALIDATE CONSTRAINT "api_stay_room_id_fk";'
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
