@echo off
setlocal

REM Ce script doit etre place a la racine du depot Git.
cd /d "%~dp0"

set "SUPABASE_PROJECT_REF=lqgkxpvkauoaeqtbndoy"
set "SUPABASE_CLI="
set "FONCTIONS_DEPLOYEES=NON"
set "PUSH_EFFECTUE=NON"

echo.
echo === Publication de develop vers main + Supabase Edge Functions ===
echo Projet Supabase : %SUPABASE_PROJECT_REF%
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

REM Cherche la CLI Supabase installee dans ce projet ou dans le PATH.
if exist "node_modules\.bin\supabase.cmd" (
    set "SUPABASE_CLI=%~dp0node_modules\.bin\supabase.cmd"
) else (
    for /f "delims=" %%S in ('where supabase 2^>nul') do (
        if not defined SUPABASE_CLI set "SUPABASE_CLI=%%S"
    )
)
if not defined SUPABASE_CLI (
    echo ERREUR : Supabase CLI introuvable.
    echo Installer la CLI : npm install --save-dev supabase
    echo Puis se connecter une fois : npx supabase login
    goto :echec
)

REM Les fonctions doivent exister dans le depot et etre versionnees.
if not exist "supabase\functions\" (
    echo ERREUR : dossier supabase\functions introuvable.
    echo Placer les sources des Edge Functions dans ce dossier avant publication.
    goto :echec
)

echo CLI Supabase detectee : %SUPABASE_CLI%
call "%SUPABASE_CLI%" --version
if errorlevel 1 goto :echec

echo.
echo ATTENTION : les fonctions seront deployees sur le projet Supabase indique.
choice /C ON /N /M "Confirmer la mise en production (Supabase + Vercel) ? [O/N] "
if errorlevel 2 (
    echo Publication annulee.
    exit /b 0
)

echo.
echo [1/6] Recuperation des branches distantes...
git fetch origin
if errorlevel 1 goto :echec

echo.
echo [2/6] Passage sur main...
git switch main
if errorlevel 1 goto :echec

echo.
echo [3/6] Mise a jour de main...
git pull --ff-only origin main
if errorlevel 1 goto :echec

echo.
echo [4/6] Fusion de origin/develop dans main...
git merge --no-edit origin/develop
if errorlevel 1 goto :echec

REM Le deploiement se fait depuis le contenu fusionne de main.
if not exist "supabase\functions\" (
    echo ERREUR : dossier supabase\functions absent apres la fusion.
    goto :echec
)

echo.
echo [5/6] Deploiement des Edge Functions sur Supabase...
REM --use-api evite de necessiter Docker pour le bundling.
REM Pas de --prune : les fonctions distantes absentes en local ne sont pas supprimees.
call "%SUPABASE_CLI%" functions deploy --project-ref %SUPABASE_PROJECT_REF% --use-api
if errorlevel 1 (
    echo ERREUR : deploiement Supabase echoue.
    echo Verifier la connexion avec : "%SUPABASE_CLI%" login
    goto :echec
)
set "FONCTIONS_DEPLOYEES=OUI"

echo.
echo [6/6] Envoi de main sur GitHub (deploiement Vercel)...
git push origin main
if errorlevel 1 goto :echec
set "PUSH_EFFECTUE=OUI"

echo.
echo Retour sur develop...
git switch develop
if errorlevel 1 goto :echec

echo.
echo SUCCES : fonctions Supabase deployees et main envoyee sur GitHub.
echo Verifiez le statut du deploiement de production dans Vercel.
exit /b 0

:echec
echo.
echo ECHEC : processus interrompu.
if /I "%FONCTIONS_DEPLOYEES%"=="OUI" (
    echo ATTENTION : les fonctions Supabase ont deja ete deployees.
) else (
    echo Les fonctions Supabase n'ont pas ete deployees avec succes par ce script.
)
if /I "%PUSH_EFFECTUE%"=="OUI" (
    echo ATTENTION : main a deja ete pousse sur GitHub. Verifiez Vercel.
) else (
    echo Aucun push de main vers GitHub n'a reussi pendant cette execution.
)
echo Branche actuelle et etat Git :
git status --short --branch
echo.
echo En cas de conflit pendant le merge, le corriger ou lancer git merge --abort.
echo Ne relancez pas le script avant d'avoir resolu le probleme.
exit /b 1
