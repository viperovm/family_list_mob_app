from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lists", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="priority",
            field=models.BooleanField(default=False),
        ),
    ]

