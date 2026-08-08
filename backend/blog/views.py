from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from .models import BlogPost, Comments, LikePost
from .serializers import PostSerializer, CommentSerializer

User = get_user_model()


class LikePostView(APIView):

    permission_classes = [IsAuthenticated]


    def post(self, request):

        post_id = request.data.get("id")


        if not post_id:
            return Response(
                {
                    "error": "post_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        post = get_object_or_404(
            BlogPost,
            id=post_id
        )


        like_obj, created = LikePost.objects.get_or_create(
            user=request.user,
            post=post
        )


        if not created:

            if like_obj.is_liked:

                like_obj.is_liked = False
                post.like = max(
                    0,
                    post.like - 1
                )

                msg = "Unliked post."


            else:

                like_obj.is_liked = True
                post.like += 1

                msg = "Liked post."


            like_obj.save()


        else:

            post.like += 1
            msg = "Liked post."



        post.save()


        return Response(
            {
                "status": msg,
                "like_count": post.like
            },
            status=status.HTTP_200_OK
        )



class MyPostView(APIView):

    permission_classes = [IsAuthenticated]


    def get(self, request):

        posts = BlogPost.objects.filter(
            user=request.user
        )


        serializer = PostSerializer(
            posts,
            many=True,
            context={
                "request": request
            }
        )


        return Response(
            {
                "count": posts.count(),
                "results": serializer.data
            },
            status=status.HTTP_200_OK
        )


class PostPagination(PageNumberPagination):
    page_size = 10


class PaginatedPostView(ListAPIView):

    queryset = BlogPost.objects.all().order_by("-timestamp")
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PostPagination


    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class BlogProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        user = get_object_or_404(
            User,
            uuid=user_id
        )

        posts = (
            BlogPost.objects
            .filter(user=user)
            .annotate(
                comments_count=Count("comments")
            )
            .order_by("-timestamp")
        )

        serializer = PostSerializer(
            posts,
            many=True,
            context={"request": request},
        )

        total_posts = posts.count()

        total_likes = (
            posts.aggregate(
                total=Sum("like")
            )["total"]
            or 0
        )

        profile_picture = None

        if getattr(user, "profile_picture", None):
            profile_picture = user.profile_picture.url
            profile_picture = profile_picture.replace("http://", "https://")

        return Response(
            {
                "id": user.uuid,
                "full_name": user.get_full_name(),
                "email": user.email,
                "profile_picture": profile_picture,
                "date_joined": user.date_joined,

                "stats": {
                    "total_posts": total_posts,
                    "total_likes": total_likes,
                },

                "posts": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class PostView(APIView):

    permission_classes = [IsAuthenticated]

    parser_classes = [
        MultiPartParser,
        FormParser
    ]


    def get(self, request):

        user_id = request.query_params.get("user_id")

        if user_id:

            posts = BlogPost.objects.filter(
                user__id=user_id
            )

        else:

            posts = BlogPost.objects.all()


        serializer = PostSerializer(
            posts,
            many=True,
            context={
                "request": request
            }
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )



    def post(self, request):

        serializer = PostSerializer(
            data=request.data
        )

        if serializer.is_valid():

            serializer.save(
                user=request.user
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



    def put(self, request, pk):

        post = get_object_or_404(
            BlogPost,
            pk=pk,
            user=request.user
        )


        serializer = PostSerializer(
            post,
            data=request.data
        )


        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



    def patch(self, request, pk):

        post = get_object_or_404(
            BlogPost,
            pk=pk,
            user=request.user
        )


        serializer = PostSerializer(
            post,
            data=request.data,
            partial=True
        )


        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



class CommentView(APIView):

    permission_classes = [IsAuthenticated]


    def get(self, request, post_id):

        comments = Comments.objects.filter(
            post_id=post_id
        )

        serializer = CommentSerializer(
            comments,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )



    def post(self, request, post_id=None):

        data = request.data.copy()


        if post_id and "post" not in data:
            data["post"] = post_id


        serializer = CommentSerializer(
            data=data
        )


        if serializer.is_valid():

            serializer.save(
                commenter=request.user
            )


            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



class PostDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, post_id):

        post = get_object_or_404(
            BlogPost,
            id=post_id
        )


        serializer = PostSerializer(
            post,
            context={
                "request": request
            }
        )


        return Response(
            {
                "post": serializer.data
            },
            status=status.HTTP_200_OK
        )



    def patch(self, request, post_id):

        post = get_object_or_404(
            BlogPost,
            id=post_id
        )
        if post.user != request.user:

            return Response(
                {
                    "error": "You do not have permission to edit this post."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PostSerializer(
            post,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )
        serializer.save()
        return Response(
            {
                "post": serializer.data
            },
            status=status.HTTP_200_OK
        )
    def delete(self, request, post_id):
        post = BlogPost.objects.filter(id=post_id).first()
        if not post:
            return Response({"error": "Invalid post id."}, status=status.HTTP_400_BAD_REQUEST)

        post_owner = post.user
        user = request.user

        if not user == post_owner:
            return Response({"error": "You don't own this post."}, status=status.HTTP_401_UNAUTHORIZED)

        post.delete()
        return Response({"detail": "Post deleted successfully."}, status=status.HTTP_200_OK)




class BlogCategoryListView(APIView):

    def get(self, request):

        return Response(
            [
                {
                    "value": value,
                    "label": label
                }
                for value, label in BlogPost.CATEGORY_CHOICES
            ]
        )