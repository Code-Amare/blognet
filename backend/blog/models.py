from django.db import models
from user.models import Profile
from cloudinary.models import CloudinaryField
from django.contrib.auth import get_user_model

User = get_user_model()


class BlogPost(models.Model):
    CATEGORY_CHOICES = [
        ("food", "Food"),
        ("electronics", "Electronics"),
        ("life_hacks", "Life Hacks"),
        ("family", "Family"),
        ("education", "Education"),
        ("entertainment", "Entertainment"),
        ("stories", "Stories"),
        ("news", "News"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    post_title = models.CharField(max_length=100)
    post_body = models.TextField()
    post_title_color = models.CharField(max_length=15, default="#000000")
    post_img = CloudinaryField(
        "blognet/post_img",
        null=True,
        blank=True
    )
    post_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="food") # Fixed typo
    like = models.PositiveIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.user.full_name} posted {self.post_title}"


class LikePost(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_liked = models.BooleanField(default=True)

    class Meta:
        unique_together = ("post", "user")

    def __str__(self):
        return f"{self.user.full_name} liked {self.post.post_title}"


class Comments(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="comments")
    commenter = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.CharField(max_length=150)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.commenter.full_name} said {self.comment}"