rm -rf .git
git init
git add .
git commit -m "first"
git remote add origin https://github.com/umami-ware/pr-guard.git
git branch -M main
git push --force -u origin main
