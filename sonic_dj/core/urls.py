from django.urls import path
from . import views
from .views import get_user_playlists

urlpatterns = [
    path('', views.home, name='home'),
    path('library/', views.library, name='library'),
    path('moods/', views.moods, name='moods'),
    path('audio/groovepad/', views.groovepad, name='groovepad'),
    path('static/audio/<str:filename>/', views.serve_audio, name='serve_audio'),
    path('login/', views.user_login, name='login'),
    path('signup/', views.signup, name='signup'),
    path('logout/', views.user_logout, name='logout'),
    path('like_song/', views.like_song, name='like_song'),
    path('liked_songs/', views.liked_songs_page, name='liked_songs'),
    path('songs_by_mood/<str:mood>/', views.songs_by_mood, name='songs_by_mood'),
    path('debug_moods/', views.debug_moods, name='debug_moods'),
    path('api/drive_file_url/<str:file_id>/', views.drive_file_url, name='drive_file_url'),
    path('proxy_drive_audio/<str:file_id>/', views.proxy_drive_audio, name='proxy_drive_audio'),
    path('search/', views.search_songs, name='search_songs'),
    path('listen_history/', views.listen_history, name='listen_history'),
    path('create_playlist/', views.create_playlist, name='create_playlist'),
    path('add_song_to_playlist/', views.add_song_to_playlist, name='add_song_to_playlist'),
    path('api/playlists/', get_user_playlists, name='get_user_playlists'),
    path('api/liked_songs/', views.liked_songs, name='liked_songs_api'),
    path('get_recommendations/', views.get_recommendations, name='get_recommendations'),
]
