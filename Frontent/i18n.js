// Simple i18n helper
(function () {
  const TRANSLATIONS = {
    en: {
      hero_title: 'Learn with MentoraAI',
      hero_sub: 'Any topic, question or concept you want to learn',
      subscription_header: 'Subscription plans',
      subscription_desc: 'Choose a plan that fits your learning pace. Icons show plan level.',
      plan_standard: 'Standard',
      plan_pro: 'Pro',
      plan_premium: 'Premium',
      plan_select: 'Select',
      plan_daily_standard: 'Daily limit: <strong>20</strong>',
      plan_daily_pro: 'Daily limit: <strong>100</strong>',
      plan_daily_premium: 'Daily limit: <strong>Unlimited</strong>',
      ad_sponsored: 'Sponsored',
      ad_title_1: 'Advertisement 1',
      ad_sub_1: 'Boost your learning with tailored lessons.',
      ad_cta_learn: 'Learn',
      ad_title_2: 'Advertisement 2',
      ad_sub_2: 'Try a free week of Pro features.',
      ad_cta_try: 'Try',
      ad_title_3: 'Advertisement 3',
      ad_sub_3: 'Sign up and get personalized quizzes.',
      ad_cta_signup: 'Sign up',
      title: 'Mentora - Smart AI Learning',
      logo: 'MentoraAI',
      settings: '⚙️ Settings',
      profile: '👤 Profile',
      search_placeholder: 'Search topics...',
      history: '📜 History',
      flashcards: '🗂️ Flashcards',
      game: '🎮 Game',
      progress: '📈 Progress',
      settings_header: '⚙️ Settings',
      dark_mode: 'Dark Mode',
      language_label: 'Language',
      notifications: 'Notifications',
      create_account: 'Create account',
      sign_in: 'Sign in',
      sign_out: 'Sign out',
      change_password: 'Change password',
      username_label: 'Username',
      password_label: 'Password',
      confirm_password_label: 'Confirm password',
      create_acc_success: 'Account created',
      sign_in_success: 'Signed in',
      sign_out_success: 'Signed out',
  change_pw_success: 'Password changed',
  old_password_label: 'Old password',
  old_password_placeholder: 'Enter old password',
  new_password_label: 'New password',
  new_password_placeholder: 'Enter new password',
  confirm_password_placeholder: 'Confirm new password',
  forgot_password: 'Forgot password?',
      auth_error: 'Authentication error',
      not_signed_in: 'Not signed in',
      fill_fields: 'Please fill all fields',
      pw_min_length: 'Password must be at least 6 characters',
      pw_mismatch: 'Passwords do not match',
      user_exists: 'User already exists',
      no_such_user: 'No such user',
      wrong_password: 'Wrong password',
      wrong_current_password: 'Wrong current password',
  pw_same_as_old: 'New password must be different from the old password',
  show_password: 'Show password',
  hide_password: 'Hide password',
      home: '🏠 Home',
      jump_btn: 'Go',
    },
    uz: {
      hero_title: 'Mentora bilan o‘rganing',
      hero_sub: 'Istalgan mavzu, savol yoki tushuncha — o‘rganing',
      subscription_header: 'Obuna rejalar',
      subscription_desc: "O'qish tezligingizga mos reja tanlang. Ikonkalar rejani ko'rsatadi.",
      plan_standard: 'Standard',
      plan_pro: 'Pro',
      plan_premium: 'Premium',
      plan_select: 'Tanlash',
      plan_daily_standard: 'Kunlik limit: <strong>20</strong>',
      plan_daily_pro: 'Kunlik limit: <strong>100</strong>',
      plan_daily_premium: 'Kunlik limit: <strong>Cheksiz</strong>',
      ad_sponsored: 'Reklama',
      ad_title_1: 'Reklama 1',
      ad_sub_1: "Shaxsiy darslar bilan o'rganishni kuchaytiring.",
      ad_cta_learn: 'Batafsil',
      ad_title_2: 'Reklama 2',
      ad_sub_2: "Pro funksiyalarining bir haftasini sinab ko'ring.",
      ad_cta_try: 'Sinab ko‘rish',
      ad_title_3: 'Reklama 3',
      ad_sub_3: "Ro'yhatdan o'ting va shaxsiy viktorinalarni oling.",
      ad_cta_signup: 'Ro‘yxatdan o‘tish',
      title: 'Mentora - Aql bilan o‘rganish',
      logo: 'MentoraAI',
      settings: '⚙️ Sozlamalar',
      profile: '👤 Profil',
      search_placeholder: 'Mavzularni qidiring...',
      history: '📜 Tarix',
      flashcards: '🗂️ Flashkartalar',
      game: '🎮 Oyin',
      progress: '📈 Rivojlanish',
      settings_header: '⚙️ Sozlamalar',
      dark_mode: 'Qorong‘i rejim',
      language_label: "Til",
      notifications: 'Bildirishnomalar',
      create_account: "Hisob yaratish",
      sign_in: "Kirish",
      sign_out: "Chiqish",
      change_password: "Parolni o'zgartirish",
      username_label: "Foydalanuvchi",
      password_label: "Parol",
      confirm_password_label: "Parolni tasdiqlash",
      create_acc_success: "Hisob yaratildi",
      sign_in_success: "Kirish amalga oshdi",
      sign_out_success: "Chiqildi",
  change_pw_success: "Parol o'zgartirildi",
  old_password_label: "Eski parol",
  old_password_placeholder: "Eski parolni kiriting",
  new_password_label: "Yangi parol",
  new_password_placeholder: "Yangi parolni kiriting",
  confirm_password_placeholder: "Yangi parolni tasdiqlang",
  forgot_password: "Parolni unutdingizmi?",
      auth_error: "Avtorizatsiya xatosi",
      not_signed_in: "Kirish amalga oshirilmagan",
      fill_fields: "Iltimos, barcha maydonlarni to'ldiring",
      pw_min_length: "Parol kamida 6 belgidan iborat bo'lishi kerak",
      pw_mismatch: "Parollar mos emas",
      user_exists: "Foydalanuvchi mavjud",
      no_such_user: "Bunday foydalanuvchi yo'q",
      wrong_password: "Noto'g'ri parol",
      wrong_current_password: "Joriy parol noto'g'ri",
  pw_same_as_old: "Yangi parol eski paroldan farq qilishi kerak",
  show_password: "Parolni ko'rsatish",
  hide_password: "Parolni yashirish",
      home: '🏠 Bosh sahifa',
      jump_btn: 'O‘tish',
    },
    ru: {
      hero_title: 'Учитесь с MentoraAI',
      hero_sub: 'Любая тема, вопрос или понятие — изучайте',
      subscription_header: 'Тарифы подписки',
      subscription_desc: 'Выберите тариф, подходящий вашему темпу обучения. Иконки показывают уровень.',
      plan_standard: 'Standard',
      plan_pro: 'Pro',
      plan_premium: 'Premium',
      plan_select: 'Выбрать',
      plan_daily_standard: 'Дневной лимит: <strong>20</strong>',
      plan_daily_pro: 'Дневной лимит: <strong>100</strong>',
      plan_daily_premium: 'Дневной лимит: <strong>Безлимит</strong>',
      ad_sponsored: 'Спонсировано',
      ad_title_1: 'Реклама 1',
      ad_sub_1: 'Улучшите обучение с персонализированными уроками.',
      ad_cta_learn: 'Подробнее',
      ad_title_2: 'Реклама 2',
      ad_sub_2: 'Попробуйте бесплатную неделю Pro-функций.',
      ad_cta_try: 'Попробовать',
      ad_title_3: 'Реклама 3',
      ad_sub_3: 'Зарегистрируйтесь и получите персональные викторины.',
      ad_cta_signup: 'Зарегистрироваться',
      title: 'Mentora - Умное обучение',
      logo: 'MentoraAI',
      settings: '⚙️ Настройки',
      profile: '👤 Профиль',
      search_placeholder: 'Поиск тем...',
      history: '📜 История',
      flashcards: '🗂️ Флэшкарты',
      game: '🎮 Игра',
      progress: '📈 Прогресс',
      settings_header: '⚙️ Настройки',
      dark_mode: 'Тёмная тема',
      language_label: 'Язык',
      notifications: 'Уведомления',
      create_account: 'Создать аккаунт',
      sign_in: 'Войти',
      sign_out: 'Выйти',
      change_password: 'Сменить пароль',
      username_label: 'Логин',
      password_label: 'Пароль',
      confirm_password_label: 'Подтвердите пароль',
      create_acc_success: 'Аккаунт создан',
      sign_in_success: 'Вы вошли',
      sign_out_success: 'Вы вышли',
  change_pw_success: 'Пароль изменён',
  old_password_label: 'Старый пароль',
  old_password_placeholder: 'Введите старый пароль',
  new_password_label: 'Новый пароль',
  new_password_placeholder: 'Введите новый пароль',
  confirm_password_placeholder: 'Подтвердите новый пароль',
  forgot_password: 'Забыли пароль?',
      auth_error: 'Ошибка аутентификации',
      not_signed_in: 'Не вошли в систему',
      fill_fields: 'Пожалуйста, заполните все поля',
      pw_min_length: 'Пароль должен быть не менее 6 символов',
      pw_mismatch: 'Пароли не совпадают',
      user_exists: 'Пользователь уже существует',
      no_such_user: 'Такого пользователя нет',
      wrong_password: 'Неверный пароль',
      wrong_current_password: 'Неверный текущий пароль',
  pw_same_as_old: 'Новый пароль должен отличаться от старого',
  show_password: 'Показать пароль',
  hide_password: 'Скрыть пароль',
      home: '🏠 Домой',
      jump_btn: 'Перейти',
    }
  };

  function getLang() {
    return localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';
  }

  function setLang(lang) {
    localStorage.setItem('language', lang);
    applyTranslations();
    // notify other scripts/tabs
    try { window.dispatchEvent(new Event('languageChange')); } catch (e) {}
  }

  function applyTranslations() {
    const lang = getLang();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];

    // document title
    if (dict.title) document.title = dict.title;

    // elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', dict[key] || '');
      } else {
        el.textContent = dict[key] || '';
      }
    });

    // elements with data-i18n-html to set innerHTML (for emoji etc)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (!key) return;
      el.innerHTML = dict[key] || '';
    });

    // attributes: title, aria-label, alt, value
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title'); if (!key) return; el.setAttribute('title', dict[key] || '');
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria'); if (!key) return; el.setAttribute('aria-label', dict[key] || '');
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt'); if (!key) return; el.setAttribute('alt', dict[key] || '');
    });
    document.querySelectorAll('[data-i18n-value]').forEach(el => {
      const key = el.getAttribute('data-i18n-value'); if (!key) return; el.value = dict[key] || '';
    });

    // Generic: data-i18n-attr="attrName:key" (supports multiple, comma-separated)
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      // spec example: "aria-label:ad_title, title:ad_tooltip"
      spec.split(',').forEach(pair => {
        const p = pair.trim().split(':');
        if (p.length !== 2) return;
        const attr = p[0].trim();
        const key = p[1].trim();
        if (!attr || !key) return;
        el.setAttribute(attr, dict[key] || '');
      });
    });
  }

  // helper to get a single translated string by key
  function t(key){
    const lang = getLang();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    return dict[key] || key;
  }

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // ensure there is a language stored
    if (!localStorage.getItem('language')) {
      const auto = (navigator.language || 'en').split('-')[0];
      localStorage.setItem('language', (['en','uz','ru'].includes(auto) ? auto : 'en'));
    }

    // apply translations now
    applyTranslations();

    // If there is a language <select id="language">, set its value and listen for changes
    const langSelect = document.getElementById('language');
    if (langSelect) {
      langSelect.value = getLang();
      langSelect.addEventListener('change', () => setLang(langSelect.value));
    }

    // if other scripts want to react to language change they can listen to 'languageChange'
  });

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // ensure there is a language stored
    if (!localStorage.getItem('language')) {
      const auto = (navigator.language || 'en').split('-')[0];
      localStorage.setItem('language', (['en','uz','ru'].includes(auto) ? auto : 'en'));
    }

    // apply translations now
    applyTranslations();

    // If there is a language <select id="language">, set its value and listen for changes
    const langSelect = document.getElementById('language');
    if (langSelect) {
      langSelect.value = getLang();
      langSelect.addEventListener('change', () => setLang(langSelect.value));
    }

    // if other scripts want to react to language change they can listen to 'languageChange'
  });

  // Expose small API
  window._i18n = {
    getLang,
    setLang,
    applyTranslations
    , t
  };
  // Keep language in sync across multiple tabs/windows using storage event
  try{
    window.addEventListener('storage', (ev) => {
      try{
        if (!ev) return;
        if (ev.key === 'language'){
          // another tab changed language — apply it here
          try{ applyTranslations(); }catch(e){}
          try{ window.dispatchEvent(new Event('languageChange')); }catch(e){}
          // if there's a language select on this page, update its value
          const langSelect = document.getElementById('language');
          if(langSelect) try{ langSelect.value = getLang(); }catch(e){}
        }
      }catch(e){}
    });
  }catch(e){ }
})();
