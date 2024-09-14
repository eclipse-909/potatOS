#!/bin/bash

#Just a couple of functions I find convenient

# Compile TypeScript and open the OS in FireFox or your default browser.
run() {
	tsc
	# Brave is my default browser but it doesn't allow precise location, so I run FireFox instead.
	# If FireFox isn't in your $PATH, start/xdg-open/open will open your default browser on Windows/Linux/Mac respectively.
	firefox ./index.html || start ./index.html || xdg-open ./index.html || open ./index.html
}

# ex) push main "commit message"
push() {
	branches=(main project2)
	if [ -z "$1" ]; then
		echo "Error: Branch name is required. Branches include:"
		echo "${branches[@]}"
		return
	fi

	found=false
	for b in "${branches[@]}"; do
		if [ "$b" == "$1" ]; then
			found=true
		fi
	done

	if [ "$found" == false ]; then
		echo "Error: Unknown branch name provided. Branches include:"
		echo "${branches[@]}"
		return
	fi

	if [ -z "$2" ]; then
		echo "Error: Commit message is required"
		return
	fi

	git add .
	git commit -m "$2"
	git push origin main:"$1"
}