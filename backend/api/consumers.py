from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async

class LikeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "like"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(
            text_data=json.dumps({
                "message": "Like Consumer Connected successfully"
            })
        )
    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message", {})
        post_id = message.get("post_id")
        email = message.get("email")

        like_count = await self.save_like(
            post_id,
            email
        )
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "send_message",
                "message": message,
                "post_id": post_id,
                "like_count": like_count,
            }
        )
    async def send_message(self, event):

        await self.send(
            text_data=json.dumps({
                "message": event["message"],
                "post_id": event["post_id"],
                "like_count": event["like_count"],
            })
        )
    @database_sync_to_async
    def save_like(self, post_id, email):

        from blog.models import LikePost, BlogPost
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(
                email=email
            )
        except User.DoesNotExist:
            return "User doesn't exist"
        try:
            post = BlogPost.objects.get(
                id=post_id
            )
        except BlogPost.DoesNotExist:
            return "Post doesn't exist"

        like_post, created = LikePost.objects.get_or_create(
            user=user,
            post=post,
            defaults={
                "is_liked": True
            }
        )
        if not created:
            if like_post.is_liked:
                like_post.is_liked = False
                post.like -= 1
            else:
                like_post.is_liked = True
                post.like += 1
            like_post.save()
        else:
            post.like += 1
        post.save()
        return post.like