from django.db import models
from django.contrib.auth.models import User

class Song(models.Model):
    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200)
    genre = models.CharField(max_length=100)
    mood = models.CharField(max_length=100)
    photo_url = models.URLField(max_length=500, blank=True, null=True)
    audio_url = models.URLField(max_length=500)
    duration = models.IntegerField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    lyrics = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title

class LikedSong(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='liked_songs')
    title = models.CharField(max_length=200)
    artist = models.CharField(max_length=200)
    image = models.URLField(max_length=500, blank=True, null=True)
    audio = models.URLField(max_length=500)

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Playlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    privacy = models.CharField(max_length=10, choices=[('public', 'Public'), ('private', 'Private')], default='public')
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.URLField(max_length=500, blank=True, null=True)  # Field to store playlist image URL

    def __str__(self):
        return self.name

class PlaylistSong(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name='songs')
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    image = models.URLField(blank=True, null=True)
    audio = models.URLField()
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.artist}"
