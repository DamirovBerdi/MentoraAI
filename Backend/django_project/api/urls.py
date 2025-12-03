from django.urls import path
from . import views

urlpatterns = [
    path('ping', views.ping, name='ping'),
    path('auth/register', views.register, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/me', views.me, name='me'),
    path('auth/change-password', views.change_password, name='change_password'),
]
