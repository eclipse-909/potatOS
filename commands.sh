#!/bin/bash

function run() {
  tsc

  # Windows
  start "./index.html"
}

function push() {
	git add .
	if [ -z "$1" ]; then
		echo "Error: Commit message is required"
		return
	fi
	git commit -m "$1"
	git push origin main
}