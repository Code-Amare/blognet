from rest_framework import serializers
from .models import BlogPost, Comments, LikePost
from user.models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["avatar", "display_name"]


class PostSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "profile",
            "post_title",
            "post_body",
            "post_title_color",
            "post_img",
            "post_category",
            "like",
            "is_liked_by_me",
            "timestamp",
        ]
        read_only_fields = [
            "profile",
            "like",
            "is_liked_by_me",
            "timestamp",
        ]

    def get_is_liked_by_me(self, obj):
        if not self.user or not self.user.is_authenticated:
            return False

        return LikePost.objects.filter(
            post=obj,
            profile=self.user.profile,
            is_liked=True,
        ).exists()


class LikePostSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    post = PostSerializer(read_only=True)

    class Meta:
        model = LikePost
        fields = ["post", "profile", "is_liked"]


class CommentSerializer(serializers.ModelSerializer):
    commenter = ProfileSerializer(read_only=True)

    class Meta:
        model = Comments
        fields = ["id", "post", "commenter", "comment", "timestamp"]
        read_only_fields = ["commenter", "timestamp"]