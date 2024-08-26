#!/usr/bin/env bash

compile() {
  tsc --rootDir source/ --outDir distrib/
}

run() {
  compile
  npm start
}

push() {
	git add .
	if [ -z "$1" ]; then
		echo "Error: Commit message is required"
		return
	fi
	git commit -m "$1"
	git push origin master
}