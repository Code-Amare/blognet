from rest_framework import serializers
from .models import BlogPost, Comments, LikePost
from user.serializers import UserSerializer


class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    post_img = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()
    post_img_upload = serializers.ImageField(
        write_only=True,
        required=False
    )

    remove_post_img = serializers.BooleanField(
        write_only=True,
        required=False,
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
            "post_img_upload",
            "post_category",
            "like",
            "is_liked_by_me",
            "timestamp",
            "remove_post_img",
            "comments",
        ]

    def get_comments(self, obj):
        if obj:
            comment_count = obj.comments.count()
            return comment_count

    def get_post_img(self, obj):
        if obj.post_img:
            url = obj.post_img.url
            return url.replace("http://", "https://")
        return None

    def get_is_liked_by_me(self, obj):
        request = self.context.get("request")

        if not request or request.user.is_anonymous:
            return False

        return LikePost.objects.filter(
            user=request.user,
            post=obj,
            is_liked=True,
        ).exists()

    def update(self, instance, validated_data):
        remove_post_img = validated_data.pop(
            "remove_post_img",
            False
        )

        new_image = validated_data.pop(
            "post_img_upload",
            None
        )

        if remove_post_img:
            instance.post_img = None

        if new_image:
            instance.post_img = new_image

        return super().update(instance, validated_data)


class LikePostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)

    class Meta:
        model = LikePost
        fields = [
            "post",
            "user",
            "is_liked",
        ]


class CommentSerializer(serializers.ModelSerializer):
    commenter = UserSerializer(read_only=True)

    class Meta:
        model = Comments
        fields = [
            "id",
            "post",
            "commenter",
            "comment",
            "timestamp",
        ]
        read_only_fields = [
            "commenter",
            "timestamp",
        ]