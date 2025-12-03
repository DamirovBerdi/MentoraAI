import json
import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import User

User = get_user_model()

def ping(request):
    return JsonResponse({'ok': True, 'now': int(time.time() * 1000)})

@csrf_exempt
def register(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'method_not_allowed'}, status=405)
    try:
        data = json.loads(request.body.decode() or '{}')
    except Exception:
        data = {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return JsonResponse({'error': 'missing_fields'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'user_exists'}, status=409)
    user = User.objects.create_user(username=username, password=password)
    # login user (session cookie)
    login(request, user)
    return JsonResponse({'ok': True, 'user': username})

@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'method_not_allowed'}, status=405)
    try:
        data = json.loads(request.body.decode() or '{}')
    except Exception:
        data = {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return JsonResponse({'error': 'missing_fields'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'wrong_password_or_user'}, status=401)
    login(request, user)
    return JsonResponse({'ok': True, 'user': username})

def me(request):
    if not request.user or not request.user.is_authenticated:
        return JsonResponse({'error': 'not_authenticated'}, status=401)
    return JsonResponse({'ok': True, 'user': request.user.username})

@csrf_exempt
def change_password(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'method_not_allowed'}, status=405)
    if not request.user or not request.user.is_authenticated:
        return JsonResponse({'error': 'not_authenticated'}, status=401)
    try:
        data = json.loads(request.body.decode() or '{}')
    except Exception:
        data = {}
    oldPassword = data.get('oldPassword')
    newPassword = data.get('newPassword')
    if not oldPassword or not newPassword:
        return JsonResponse({'error': 'missing_fields'}, status=400)
    if oldPassword == newPassword:
        return JsonResponse({'error': 'pw_same_as_old'}, status=400)
    if not request.user.check_password(oldPassword):
        return JsonResponse({'error': 'wrong_current_password'}, status=401)
    request.user.set_password(newPassword)
    request.user.save()
    return JsonResponse({'ok': True})
