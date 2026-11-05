@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM ------------------------------------------------------------
REM IMPORTANT : le fichier est versionne dans Git.
REM Le passage develop -> main peut le remplacer pendant
REM son execution. On travaille donc depuis une copie TEMP.
REM ------------------------------------------------------------
if /I "%~1"=="--copie-temporaire" goto :publication

set "DOSSIER_DEPOT=%~dp0"
set "SCRIPT_TEMP=%TEMP%\vde-publier-prod-%RANDOM%-%RANDOM%.bat"
copy /Y "%~f0" "%SCRIPT_TEMP%" >nul
if errorlevel 1 (
    echo ERREUR : impossible de creer la copie temporaire du script.
    exit /b 1
)

cmd /D /C ""%SCRIPT_TEMP%" --copie-temporaire "%DOSSIER_DEPOT%""
set "CODE_RETOUR=%ERRORLEVEL%"
del /Q "%SCRIPT_TEMP%" >nul 2>&1
exit /b %CODE_RETOUR%

:publication
set "DOSSIER_DEPOT=%~2"
cd /D "%DOSSIER_DEPOT%"
if errorlevel 1 (
    echo ERREUR : impossible d'acceder au repertoire Git.
    exit /b 1
)

set "PROJET_SUPABASE=lqgkxpvkauoaeqtbndoy"
set "SUPABASE_DEPLOYE=0"

echo.
echo === Publication de develop vers main + Supabase Edge Functions ===
echo Projet Supabase : %PROJET_SUPABASE%
echo.

REM Verifier le depot et l'absence de modifications locales.
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERREUR : le script doit se trouver dans un depot Git.
    goto :echec
)
for /f "delims=" %%L in ('git status --porcelain') do goto :arbre-sale

REM La CLI locale prime sur une installation globale.
set "SUPABASE_CLI=%CD%\node_modules\.bin\supabase.cmd"
if not exist "%SUPABASE_CLI%" (
    echo ERREUR : Supabase CLI n'est pas installee localement.
    echo Installer avec : npm install --save-dev supabase
    goto :echec
)

echo CLI Supabase detectee : %SUPABASE_CLI%
REM CALL est necessaire pour revenir ici apres l'execution d'un .cmd.
call "%SUPABASE_CLI%" --version
if errorlevel 1 goto :echec

echo.
echo ATTENTION : les Edge Functions seront deployees sur le projet de production.
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

echo.
echo [5/6] Deploiement des Supabase Edge Functions...
if not exist "supabase\functions\" (
    echo ERREUR : dossier supabase\functions introuvable.
    echo Les fonctions doivent se trouver dans ce dossier du depot.
    goto :echec
)
call "%SUPABASE_CLI%" functions deploy --project-ref "%PROJET_SUPABASE%"
if errorlevel 1 goto :echec
set "SUPABASE_DEPLOYE=1"

echo.
echo [6/6] Envoi de main sur GitHub pour Vercel Production...
git push origin main
if errorlevel 1 goto :echec

echo.
echo Retour sur develop...
git switch develop
if errorlevel 1 (
    echo ATTENTION : deploiement effectue, mais retour sur develop impossible.
    git status --short --branch
    exit /b 1
)

echo.
echo SUCCES : fonctions Supabase deployees et branche main publiee.
echo Controlez le deploiement Production dans Vercel.
exit /b 0

:arbre-sale
echo.
echo ERREUR : modifications locales detectees. Enregistrez-les d'abord.
git status --short
goto :echec

:echec
echo.
echo ECHEC : publication interrompue.
if "%SUPABASE_DEPLOYE%"=="1" (
    echo ATTENTION : les fonctions Supabase ont deja ete deployees.
    echo Le push GitHub n'a pas abouti.
) else (
    echo Le deploiement Supabase n'a pas ete confirme comme reussi.
)
echo Branche actuelle et etat Git :
git status --short --branch
echo.
echo En cas de conflit pendant le merge, corrigez-le ou lancez git merge --abort.
echo Ne relancez pas avant d'avoir resolu le probleme.
exit /b 1
