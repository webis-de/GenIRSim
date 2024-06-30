#!/bin/bash

main_dir="$(dirname $0)/.."
pushd $main_dir > /dev/zero

branch="$(git branch --show-current)"
if [ "$branch" != "development" ];then
  echo "You are not on the development branch!"
  echo "Publishing is only possible from development"
  exit 1
fi

version="$(cat package.json | jq -r '.version')"
echo "Detected version from package.json: $version"

if [ $(git tag | grep "^v$version$" | wc -l) -ne 0 ];then
  echo "A tag v$version already exists... aborting"
  exit 1
fi

echo "Building documentation"
npm run doc

echo "Updating package lock"
npm i --package-lock-only
echo "Committing"
git add -A
git commit -m "version $version"

echo "Merging into main branch"
git checkout main
git merge development

echo "Pushing"
git push
git tag "v$version"
git push origin "v$version"

echo "Switching back to development branch"
git checkout development
git push

