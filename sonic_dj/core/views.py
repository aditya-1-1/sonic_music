from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse, StreamingHttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import Song, LikedSong, Playlist, PlaylistSong
import json
import os
import random
import pathlib
from django.conf import settings
from google.oauth2 import service_account
from googleapiclient.discovery import build
import requests
import logging
from django.db import models

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

def home(request):
    playlists = [
        {"name": "Recommended", "tag": "recommended"},
        {"name": "Top Artists", "tag": "top"},
        {"name": "Top Songs", "tag": "pop"},
        {"name": "Chill Vibes", "tag": "chill"},
        {"name": "Workout Beats", "tag": "workout"},
    ]

    playlist_songs = {}
    for playlist in playlists:
        api_url = f"https://api.jamendo.com/v3.0/tracks?client_id=29fa9b04&tags={playlist['tag']}&format=json"
        try:
            response = requests.get(api_url)
            response.raise_for_status()
            data = response.json().get('results', [])
            logger.debug(f"API Response for {playlist['name']}: {data}")  # Log the API response
            playlist_songs[playlist['name']] = [
                {
                    'title': song.get('name'),
                    'artist': song.get('artist_name'),
                    'image': song.get('image', ''),
                    'audio_url': song.get('audio', '')  # Ensure this is a valid URL
                } for song in data[:7]  # Limit to 7 songs per playlist
            ]
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching songs for {playlist['name']}: {e}")
            playlist_songs[playlist['name']] = []  # Fallback to empty list if API fails

    return render(request, 'home.html', {'playlists': playlist_songs})

@login_required
def library(request):
    # Create or update the 'Liked Songs' playlist with user's liked songs
    liked_songs = LikedSong.objects.filter(user=request.user)
    playlist, created = Playlist.objects.get_or_create(
        user=request.user,
        name="Liked Songs",
        defaults={
            "description": "Your favorite songs",
            "privacy": "private",
        }
    )
    # Clear existing songs in the liked songs playlist
    PlaylistSong.objects.filter(playlist=playlist).delete()
    # Add liked songs to the playlist
    for song in liked_songs:
        PlaylistSong.objects.get_or_create(
            playlist=playlist,
            title=song.title,
            artist=song.artist,
            image=song.image,
            audio=song.audio
        )

    # Fetch playlists for the logged-in user excluding liked songs playlist
    user_playlists = Playlist.objects.filter(user=request.user).exclude(name="Liked Songs")

    # Fetch the updated 'Liked Songs' playlist separately
    liked_playlist = Playlist.objects.filter(user=request.user, name="Liked Songs").first()

    # Prepare playlists data for the template
    playlists = []
    if liked_playlist:
        playlists.append({
            'id': liked_playlist.id,
            'name': liked_playlist.name,
            'image': liked_playlist.image,
        })

    playlists.extend([
        {
            'id': playlist.id,
            'name': playlist.name,
            'image': playlist.image,
        }
        for playlist in user_playlists
    ])

    return render(request, 'library.html', {'playlists': playlists})

def moods(request):
    return render(request, 'moods.html')

def groovepad(request):
    return render(request, 'groovepad.html')

def serve_audio(request, filename):
    from django.http import FileResponse
    path = os.path.join('static/audio/', filename)
    return FileResponse(open(path, 'rb'))

def user_login(request):
    if request.method == "POST":
        email = request.POST['email']
        password = request.POST['password']
        user = User.objects.filter(email=email).first()
        if user and user.check_password(password):
            login(request, user)
            return redirect('home')
        return render(request, 'login.html', {'error': 'Invalid credentials'})
    return render(request, 'login.html')

@csrf_exempt
def signup(request):
    if request.method == 'POST':
        username = request.POST.get('username')  # Safe way to access
        email = request.POST.get('email')
        password = request.POST.get('password')
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already registered'}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password)
        login(request, user)
        return redirect('home')
    return render(request, 'login.html') 

def user_logout(request):
    logout(request)
    return redirect('home')

@login_required
def like_song(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title')
            artist = data.get('artist')
            image = data.get('image')
            audio = data.get('audio')

            liked_song = LikedSong.objects.filter(user=request.user, title=title, artist=artist, audio=audio).first()
            if liked_song:
                liked_song.delete()
                return JsonResponse({'message': 'Song unliked successfully'})
            
            LikedSong.objects.create(user=request.user, title=title, artist=artist, image=image, audio=audio)
            return JsonResponse({'message': 'Song liked successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@login_required
def liked_songs(request):
    liked = LikedSong.objects.filter(user=request.user)
    return JsonResponse([{
        'title': s.title,
        'artist': s.artist,
        'image': s.image,
        'audio': s.audio
    } for s in liked], safe=False)

@login_required
def liked_songs_page(request):
    return render(request, 'liked_songs.html')

@login_required
def listen_history(request):
    # Fetch the listening history for the logged-in user
    history = LikedSong.objects.filter(user=request.user).order_by('-id')
    return JsonResponse([
        {
            'title': song.title,
            'artist': song.artist,
            'image': song.image,
            'audio_url': song.audio,
            'timestamp': song.created_at.isoformat() if hasattr(song, 'created_at') else None
        }
        for song in history
    ], safe=False)

def songs_by_mood(request, mood):
    try:
        # Using the Jamendo API with the provided Client ID
        api_url = f"https://api.jamendo.com/v3.0/tracks?client_id=29fa9b04&tags={mood}&format=json"
        response = requests.get(api_url)
        response.raise_for_status()  # Raise an error for bad HTTP responses (4xx or 5xx)

        # Assuming the API returns a JSON response with a list of tracks under 'results'
        data = response.json().get('results', [])
        random.shuffle(data)  # Shuffle the songs for randomness

        songs = [
            {
                'title': song.get('name'),
                'artist': song.get('artist_name'),
                'image': song.get('image', ''),
                'audio_url': song.get('audio', '')  # Use the direct audio URL
            } for song in data[:7]  # Limit to 7 songs
        ]

        return JsonResponse(songs, safe=False)
    except requests.exceptions.RequestException as e:
        return JsonResponse({'error': 'Failed to fetch songs from external API', 'details': str(e)}, status=500)

def debug_moods(request):
    songs = Song.objects.all()
    return JsonResponse([{
        'title': s.title,
        'mood': s.mood,
        'artist': s.artist
    } for s in songs], safe=False)

def all_songs_api(request):
    json_path = pathlib.Path(settings.BASE_DIR) / 'core' / 'static' / 'js' / 'songs.json'
    with open(json_path, 'r') as f:
        data = json.load(f)['songs']
    for song in data:
        # Provide the Google Drive file ID as 'audio_id'
        song['audio_id'] = song['audio_url']
    return JsonResponse(data, safe=False)

def drive_file_url(request, file_id):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    SERVICE_ACCOUNT_FILE = 'service_account.json'
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('drive', 'v3', credentials=credentials)
    file = service.files().get(fileId=file_id, fields='webContentLink').execute()
    return JsonResponse({'url': file.get('webContentLink')})

from googleapiclient.http import MediaIoBaseDownload
import io

def proxy_drive_audio(request, file_id):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    SERVICE_ACCOUNT_FILE = 'service_account.json'
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('drive', 'v3', credentials=credentials)

    request_drive = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request_drive)
    done = False
    while not done:
        status, done = downloader.next_chunk()

    fh.seek(0)
    response = StreamingHttpResponse(fh, content_type='audio/mpeg')
    response['Content-Disposition'] = 'inline; filename="audio.mp3"'
    response['Access-Control-Allow-Origin'] = '*'
    return response

def search_songs(request):
    query = request.GET.get('q', '').strip()
    if not query:
        return JsonResponse([], safe=False)

    results = Song.objects.filter(title__icontains=query) | Song.objects.filter(artist__icontains=query)
    response_data = [
        {
            'title': song.title,
            'artist': song.artist,
            'image': song.photo_url,
            'audio': song.audio_url
        } for song in results
    ]

    return JsonResponse(response_data, safe=False)

@login_required
@csrf_exempt
def create_playlist(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description', '')
            privacy = data.get('privacy', 'public')

            playlist = Playlist.objects.create(
                user=request.user,
                name=name,
                description=description,
                privacy=privacy
            )

            return JsonResponse({'message': 'Playlist created successfully', 'playlist_id': playlist.id})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@login_required
@csrf_exempt
def add_song_to_playlist(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            playlist_id = data.get('playlist_id')
            title = data.get('title')
            artist = data.get('artist')
            image = data.get('image')
            audio = data.get('audio')

            playlist = Playlist.objects.get(id=playlist_id, user=request.user)
            PlaylistSong.objects.create(
                playlist=playlist,
                title=title,
                artist=artist,
                image=image,
                audio=audio
            )

            return JsonResponse({'message': 'Song added to playlist successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@login_required
@csrf_exempt
def get_user_playlists(request):
    if request.method == 'GET':
        playlists = Playlist.objects.filter(user=request.user)
        response_data = [
            {
                'id': playlist.id,
                'name': playlist.name,
                'description': playlist.description,
                'privacy': playlist.privacy
            }
            for playlist in playlists
        ]
        return JsonResponse({'playlists': response_data}, safe=False)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@login_required
def liked_songs_playlist(request):
    # Fetch liked songs for the logged-in user
    liked_songs = LikedSong.objects.filter(user=request.user)

    # Create a playlist for liked songs if it doesn't already exist
    playlist, created = Playlist.objects.get_or_create(
        user=request.user,
        name="Liked Songs",
        defaults={
            "description": "Your favorite songs",
            "privacy": "private",
        }
    )

    # Add liked songs to the playlist
    for song in liked_songs:
        PlaylistSong.objects.get_or_create(
            playlist=playlist,
            title=song.title,
            artist=song.artist,
            image=song.image,
            audio=song.audio
        )

    return redirect("library")

def populate_sample_songs():
    """Populate the database with sample songs if it's empty"""
    if Song.objects.count() == 0:
        # Default image as data URL
        default_image = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
        
        sample_songs = [
            {
                'title': 'Summer Vibes',
                'artist': 'DJ Cool',
                'genre': 'Electronic',
                'mood': 'Happy',
                'photo_url': default_image,
                'audio_url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            },
            {
                'title': 'Chill Beats',
                'artist': 'Lo-Fi Master',
                'genre': 'Lo-Fi',
                'mood': 'Chill',
                'photo_url': default_image,
                'audio_url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
            },
            {
                'title': 'Dance Party',
                'artist': 'Club Kings',
                'genre': 'Dance',
                'mood': 'Energetic',
                'photo_url': default_image,
                'audio_url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
            },
            {
                'title': 'Focus Flow',
                'artist': 'Study Beats',
                'genre': 'Ambient',
                'mood': 'Focus',
                'photo_url': default_image,
                'audio_url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
            },
            {
                'title': 'Workout Mix',
                'artist': 'Fitness DJ',
                'genre': 'Electronic',
                'mood': 'Energetic',
                'photo_url': default_image,
                'audio_url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
            }
        ]
        
        for song_data in sample_songs:
            Song.objects.create(**song_data)
        
        logger.info('Populated database with sample songs')

@login_required
def get_recommendations(request):
    try:
        # Populate sample songs if database is empty
        populate_sample_songs()
        
        logger.debug('Starting get_recommendations view')
        
        # Get user's liked songs
        liked_songs = LikedSong.objects.filter(user=request.user)
        logger.debug(f'Found {liked_songs.count()} liked songs')
        
        # Get user's recently played songs from playlists
        recent_songs = PlaylistSong.objects.filter(
            playlist__user=request.user
        ).order_by('-added_at')[:10]
        logger.debug(f'Found {recent_songs.count()} recent songs')
        
        # Get genres and moods from liked and recent songs
        liked_genres = set()
        liked_moods = set()
        
        # Add genres and moods from liked songs
        for song in liked_songs:
            try:
                original_song = Song.objects.get(title=song.title, artist=song.artist)
                liked_genres.add(original_song.genre)
                liked_moods.add(original_song.mood)
            except Song.DoesNotExist:
                logger.debug(f'Song not found in database: {song.title} by {song.artist}')
                continue
        
        # Add genres and moods from recent songs
        for song in recent_songs:
            try:
                original_song = Song.objects.get(title=song.title, artist=song.artist)
                liked_genres.add(original_song.genre)
                liked_moods.add(original_song.mood)
            except Song.DoesNotExist:
                logger.debug(f'Song not found in database: {song.title} by {song.artist}')
                continue
        
        logger.debug(f'Found genres: {liked_genres}')
        logger.debug(f'Found moods: {liked_moods}')
        
        # If user has liked or played songs, get recommendations based on their preferences
        if liked_genres or liked_moods:
            recommended_songs = Song.objects.filter(
                models.Q(genre__in=liked_genres) | models.Q(mood__in=liked_moods)
            ).exclude(
                # Exclude songs that user has already liked or recently played
                models.Q(title__in=[song.title for song in liked_songs]) |
                models.Q(title__in=[song.title for song in recent_songs])
            ).distinct()[:10]
            
            logger.debug(f'Found {recommended_songs.count()} recommended songs based on genres and moods')
            
            # If not enough recommendations, add some popular songs
            if recommended_songs.count() < 10:
                popular_songs = Song.objects.exclude(
                    id__in=recommended_songs.values_list('id', flat=True)
                ).order_by('?')[:10 - recommended_songs.count()]
                recommended_songs = list(recommended_songs) + list(popular_songs)
                logger.debug(f'Added {len(popular_songs)} popular songs to reach 10 recommendations')
        else:
            # For new users or users with no history, return popular songs
            logger.debug('No user preferences found, returning popular songs')
            recommended_songs = Song.objects.all().order_by('?')[:10]
            logger.debug(f'Found {recommended_songs.count()} popular songs')
        
        # Format the response
        recommendations = []
        for song in recommended_songs:
            recommendations.append({
                'title': song.title,
                'artist': song.artist,
                'image': song.photo_url,
                'audio_url': song.audio_url,
                'genre': song.genre,
                'mood': song.mood
            })
        
        logger.debug(f'Returning {len(recommendations)} recommendations')
        return JsonResponse({'recommendations': recommendations})
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return JsonResponse({'error': 'Failed to generate recommendations'}, status=500)
