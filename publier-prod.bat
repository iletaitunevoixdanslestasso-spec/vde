@echo off
setlocal

REM Ce script doit etre place a la racine du depot Git.
cd /d "%~dp0"

echo.
echo === Publication de develop vers main ===
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERREUR : ce fichier doit etre place dans le depot Git.
    goto :echec
)

REM Evite de changer de branche avec des modifications locales.
for /f "delims=" %%L in ('git status --porcelain') do (
    echo ERREUR : des modifications locales ne sont pas enregistrees.
    git status --short
    goto :echec
)

choice /C ON /N /M "Confirmer la mise en production ? [O/N] "
if errorlevel 2 (
    echo Publication annulee.
    exit /b 0
)

echo.
echo [1/5] Recuperation des branches distantes...
git fetch origin
if errorlevel 1 goto :echec

echo.
echo [2/5] Passage sur main...
git switch main
if errorlevel 1 goto :echec

echo.
echo [3/5] Mise a jour de main...
git pull --ff-only origin main
if errorlevel 1 goto :echec

echo.
echo [4/5] Fusion de origin/develop dans main...
git merge --no-edit origin/develop
if errorlevel 1 goto :echec

echo.
echo [5/5] Envoi de main sur GitHub (deploiement Vercel)...
git push origin main
if errorlevel 1 goto :echec

echo.
echo Retour sur develop...
git switch develop
if errorlevel 1 goto :echec

echo.
echo SUCCES : main est publiee sur GitHub.
echo Verifiez le deploiement dans Vercel.
exit /b 0

:echec
echo.
echo ECHEC : publication interrompue. Aucun push n'a ete lance apres l'erreur.
echo Branche actuelle et etat Git :
git status --short --branch
echo.
echo En cas de conflit pendant le merge, le corriger ou lancer git merge --abort.
echo Ne relancez pas le script avant d'avoir resolu le probleme.
exit /b 1
