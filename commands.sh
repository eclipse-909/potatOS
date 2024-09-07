#!/bin/bash

# Compile TypeScript and open the OS in FireFox or your default browser.
run() {
  tsc
  # Brave is my default browser but it doesn't allow precise location, so I run FireFox instead.
  # If FireFox isn't in your $PATH, start/xdg-open/open will open your default browser on Windows/Linux/Mac respectively.
  firefox ./index.html || start ./index.html || xdg-open ./index.html || open ./index.html
}

push() {
	if [ -z "$1" ]; then
		echo "Error: Commit message is required"
		return
	fi
	git add .
	git commit -m "$1"
	git push origin main
}