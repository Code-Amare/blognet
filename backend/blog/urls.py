from django.urls import path
from . import views


urlpatterns = [
    path("add-post/", views.PostView.as_view()),
    path("edit-post/<int:post_id>/", views.PostDetailView.as_view()),
    path("posts/", views.PaginatedPostView.as_view()),
    path("post/<int:post_id>/", views.PostDetailView.as_view()),
    path("my-post/", views.my_post),
    path("like-post/", views.like_post),
    path("categories/", views.BlogCategoryListView.as_view()),
    path("post/comments/", views.CommentView.as_view()),
    path("post/comments/<int:post_id>/", views.CommentView.as_view()),
]
