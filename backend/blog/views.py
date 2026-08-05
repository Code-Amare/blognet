from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404

from .models import BlogPost, Comments, LikePost
from .serializers import PostSerializer, CommentSerializer


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
            user=request.user
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


    def get_serializer(self, *args, **kwargs):

        kwargs["user"] = self.request.user

        return super().get_serializer(
            *args,
            **kwargs
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
            user=request.user
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )



    def post(self, request):

        serializer = PostSerializer(
            data=request.data,
            user=request.user
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
            data=request.data,
            user=request.user
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
            partial=True,
            user=request.user
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

    permission_classes = [IsAuthenticated]


    def get(self, request, post_id):

        post = get_object_or_404(
            BlogPost,
            id=post_id
        )


        serializer = PostSerializer(
            post,
            user=request.user
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
            partial=True,
            user=request.user
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