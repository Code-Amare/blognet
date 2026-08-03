from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, related_name="profile", on_delete=models.CASCADE)
    display_name = models.CharField(max_length=150, blank=True, null=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.user.username
        return super().save(*args, **kwargs)
