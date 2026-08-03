from django.db import models
from user.models import Profile


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
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="posts")
    post_title = models.CharField(max_length=100)
    post_body = models.TextField()
    post_title_color = models.CharField(max_length=15, default="#000000")
    post_img = models.ImageField(upload_to="post_img/", blank=True, null=True)
    post_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="food") # Fixed typo
    like = models.PositiveIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.profile.display_name} posted {self.post_title}"


class LikePost(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="likes")
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    is_liked = models.BooleanField(default=True)

    class Meta:
        unique_together = ("post", "profile")

    def __str__(self):
        return f"{self.profile.user.username} liked {self.post.post_title}"


class Comments(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="comments")
    commenter = models.ForeignKey(Profile, on_delete=models.CASCADE)
    comment = models.CharField(max_length=150)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.commenter.display_name} said {self.comment}"