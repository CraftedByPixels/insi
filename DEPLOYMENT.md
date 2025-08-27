# 🚀 Инструкции по развертыванию на GitHub

## 📋 Подготовка к загрузке

### 1. Инициализация Git репозитория
```bash
# В папке с проектом
git init
git add .
git commit -m "Initial commit: Weight Loss Challenge App"
```

### 2. Подключение к удаленному репозиторию
```bash
git remote add origin https://github.com/CraftedByPixels/insi.git
git branch -M main
git push -u origin main
```

## 🔑 Настройка GitHub

### 1. Создание Personal Access Token
1. Перейдите в [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Нажмите "Generate new token (classic)"
3. Выберите scope: `repo` (полный доступ к репозиториям)
4. Скопируйте токен (он показывается только один раз!)

### 2. Использование токена
```bash
# При запросе username введите ваш GitHub username
# При запросе password введите токен (НЕ пароль от GitHub)
git push origin main
```

## 📁 Структура файлов для загрузки

```
insi/
├── index.html          # Главная страница приложения
├── app.js             # Основная логика JavaScript
├── style.css          # Стили и темы
├── README.md          # Описание проекта
├── LICENSE            # MIT лицензия
├── .gitignore         # Исключения для Git
├── package.json       # Метаданные проекта
└── DEPLOYMENT.md      # Этот файл
```

## 🌐 GitHub Pages (опционально)

### 1. Включение GitHub Pages
1. Перейдите в Settings > Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: / (root)
5. Save

### 2. Доступ к приложению
После настройки GitHub Pages ваше приложение будет доступно по адресу:
`https://craftedbypixels.github.io/insi/`

## 🔧 Команды для обновления

### Добавление изменений
```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

### Проверка статуса
```bash
git status
git log --oneline
```

## 📱 Тестирование

### Локальное тестирование
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (если установлен)
npx serve .
```

### Открытие в браузере
Перейдите по адресу: `http://localhost:8000`

## 🚨 Важные моменты

1. **Токен безопасности**: Никогда не публикуйте ваш Personal Access Token
2. **Пароль администратора**: В коде установлен пароль `admin123` - измените его в продакшене
3. **Данные**: Приложение использует LocalStorage - данные хранятся локально в браузере
4. **Браузеры**: Тестируйте на разных браузерах (Chrome, Firefox, Safari, Edge)

## 🆘 Решение проблем

### Ошибка аутентификации
```bash
# Удалите сохраненные учетные данные
git config --global --unset credential.helper
git config --system --unset credential.helper
```

### Конфликт при push
```bash
git pull origin main
# Разрешите конфликты
git add .
git commit -m "Resolve conflicts"
git push origin main
```

### Сброс репозитория
```bash
git reset --hard HEAD
git clean -fd
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте [GitHub Help](https://help.github.com/)
2. Создайте Issue в репозитории
3. Обратитесь к документации Git

---

**Удачи с развертыванием! 🚀**
