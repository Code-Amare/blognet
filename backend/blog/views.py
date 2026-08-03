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
from user.models import Profile


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def like_post(request):
    profile = get_object_or_404(Profile, user=request.user)
    post_id = request.data.get("id")
    
    if not post_id:
        return Response({"error": "post_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    post = get_object_or_404(BlogPost, id=post_id)
    like_obj, created = LikePost.objects.get_or_create(profile=profile, post=post)

    if not created:
        if like_obj.is_liked:
            like_obj.is_liked = False
            post.like = max(0, post.like - 1)
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
    return Response({"status": msg, "like_count": post.like}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_post(request):
    profile = get_object_or_404(Profile, user=request.user)
    posts = BlogPost.objects.filter(profile=profile)
    serializer = PostSerializer(posts, many=True, user=request.user)
    return Response({"count": posts.count(), "results": serializer.data}, status=status.HTTP_200_OK)


class PostPagination(PageNumberPagination):
    page_size = 10  # Increased from 2 for better UI experience


class PaginatedPostView(ListAPIView):
    queryset = BlogPost.objects.all().order_by("-timestamp")
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PostPagination


class PostView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Fixed: File upload support

    def get(self, request):
        user_id = request.query_params.get("user_id")
        if user_id:
            posts = BlogPost.objects.filter(profile__user__id=user_id) # Fixed lookup
        else:
            posts = BlogPost.objects.all()

        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PostSerializer(data=request.data)
        if serializer.is_valid():
            profile = get_object_or_404(Profile, user=request.user)
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        post = get_object_or_404(BlogPost, pk=pk, profile__user=request.user) # Fixed lookup
        serializer = PostSerializer(post, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        post = get_object_or_404(BlogPost, pk=pk, profile__user=request.user) # Fixed lookup
        serializer = PostSerializer(post, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        post_id = request.query_params.get("post_id")
        if not post_id:
            return Response({"error": "post_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        comments = Comments.objects.filter(post__id=post_id)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = get_object_or_404(Profile, user=request.user)
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(commenter=profile) # Fixed assignment
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




class BlogCategoryListView(APIView):

    def get(self, request):
        return Response([
            {"value": value, "label": label}
            for value, label in BlogPost.CATEGORY_CHOICES
        ])