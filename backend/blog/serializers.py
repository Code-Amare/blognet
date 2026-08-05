from rest_framework import serializers
from .models import BlogPost, Comments, LikePost
from user.serializers import UserSerializer

class PostSerializer(serializers.ModelSerializer):

    user = UserSerializer(read_only=True)
    post_img = serializers.SerializerMethodField(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()

    remove_post_img = serializers.BooleanField(
        write_only=True,
        required=False
    )

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "user",
            "post_title",
            "post_body",
            "post_title_color",
            "post_img",
            "post_category",
            "like",
            "is_liked_by_me",
            "timestamp",
            "remove_post_img",
        ]


class LikePostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)

    class Meta:
        model = LikePost
        fields = ["post", "user", "is_liked"]


class CommentSerializer(serializers.ModelSerializer):
    commenter = UserSerializer(read_only=True)

    class Meta:
        model = Comments
        fields = ["id", "post", "commenter", "comment", "timestamp"]
        read_only_fields = ["commenter", "timestamp"]