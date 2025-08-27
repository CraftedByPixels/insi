#!/bin/bash

echo "========================================"
echo "    Weight Loss Challenge - Deploy"
echo "========================================"
echo

echo "[1/5] Инициализация Git репозитория..."
if [ ! -d ".git" ]; then
    git init
    echo "Git репозиторий инициализирован"
else
    echo "Git репозиторий уже существует"
fi

echo
echo "[2/5] Добавление файлов..."
git add .

echo
echo "[3/5] Создание коммита..."
git commit -m "Update: Weight Loss Challenge App v1.0.0"

echo
echo "[4/5] Подключение к удаленному репозиторию..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/CraftedByPixels/insi.git

echo
echo "[5/5] Загрузка на GitHub..."
git branch -M main
git push -u origin main

echo
echo "========================================"
echo "    Развертывание завершено!"
echo "========================================"
echo
echo "Ваше приложение доступно по адресу:"
echo "https://github.com/CraftedByPixels/insi"
echo
echo "Для включения GitHub Pages:"
echo "1. Перейдите в Settings > Pages"
echo "2. Source: Deploy from a branch"
echo "3. Branch: main"
echo "4. Folder: / (root)"
echo
read -p "Нажмите Enter для продолжения..."
