# Animated background (MentoraAI Frontend)

Как проверить анимированный фон локально:

1. Откройте PowerShell и перейдите в папку `Frontent`:

```powershell
cd "d:\Рабочий стол\MentoraAI\Frontent"
python -m http.server 8000
```

2. Откройте в браузере:

- http://localhost:8000/Frontent/index.html — главная страница с анимированным фоном
- http://localhost:8000/Frontent/settings.html — страница настроек (переключатель Dark Mode меняет палитру)
- http://localhost:8000/Frontent/profile.html — профиль (фон также подключён)

3. Убедитесь, что файлы `animated-bg.css` и `animated-bg.js` находятся в папке `Frontent`. Если появляется 404 — проверьте, откуда запущен сервер (он должен быть запущен в папке `Frontent`), и откройте DevTools → Network, чтобы посмотреть точный URL с ошибкой.

Советы по кастомизации:
- Для добавления фона на другие страницы — в head вставьте `<link rel="stylesheet" href="./animated-bg.css">`, а перед `</body>` добавьте `<script src="./animated-bg.js"></script>` и (опционально) контейнер `<div id="animated-bg">...</div>`.
- Цвета задаются через CSS-переменные: `--blob1-1`, `--blob1-2`, `--blob2-1`, `--blob2-2`, `--flower-color`.

Если нужно — могу автоматически вставить подключение на все HTML-файлы или добавить выбор палитры в `settings.html`.
