from django.urls import path
from . import views


urlpatterns = [
    path("add-post/", views.PostView.as_view()),
    path("edit-post/<int:post_id>/", views.PostDetailView.as_view()),
    path("posts/", views.PaginatedPostView.as_view()),
    path("post/<int:post_id>/", views.PostDetailView.as_view()),
    path("my-post/", views.MyPostView.as_view()),
    path("like-post/", views.LikePostView.as_view()),
    path("categories/", views.BlogCategoryListView.as_view()),
    path("post/comments/", views.CommentView.as_view()),
    path("post/comments/<int:post_id>/", views.CommentView.as_view()),
    path("profile/<uuid:user_id>/", views.BlogProfileView.as_view()),
]
